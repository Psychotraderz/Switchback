import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTrailRows, toRestSql, toSql } from "../src/build.ts";
import { GridDem, type TerrainSampler } from "../src/dem.ts";
import { parseRestNodes } from "../src/rest.ts";
import { computeShade, deriveShadeSpots, HOURS, terrainShaded } from "../src/shade.ts";
import { localToUtcMs, sunPosition } from "../src/sun.ts";
import { parseElements } from "../src/overpass.ts";
import fixture from "./fixture.json" with { type: "json" };

const LV = { lat: 36.17, lon: -115.14 };

test("sun at Las Vegas solar noon, summer solstice: ~77 degrees, due south", () => {
  // Solar noon is ~12:20 PST => ~13:20 PDT. Scan the afternoon for max altitude.
  let best = { altitude: -90, azimuth: 0 };
  for (let m = 0; m < 180; m += 5) {
    const s = sunPosition(localToUtcMs(2026, 6, 21, 12, -7) + m * 60000, LV.lat, LV.lon);
    if (s.altitude > best.altitude) best = s;
  }
  assert.ok(Math.abs(best.altitude - 77.3) < 1.5, `altitude ${best.altitude}`);
  assert.ok(Math.abs(best.azimuth - 180) < 8, `azimuth ${best.azimuth}`);
});

test("winter solstice noon sun is ~30 degrees; morning is east, afternoon west", () => {
  const noon = sunPosition(localToUtcMs(2026, 12, 21, 12, -8), LV.lat, LV.lon);
  assert.ok(Math.abs(noon.altitude - 30.4) < 2, `altitude ${noon.altitude}`);
  assert.ok(sunPosition(localToUtcMs(2026, 12, 21, 9, -8), LV.lat, LV.lon).azimuth < 180);
  assert.ok(sunPosition(localToUtcMs(2026, 12, 21, 15, -8), LV.lat, LV.lon).azimuth > 180);
  assert.ok(sunPosition(localToUtcMs(2026, 12, 21, 2, -8), LV.lat, LV.lon).altitude < 0);
});

// Flat 1000 m plain with a 1200 m ridge ~100 m south of lat0.
const lat0 = 36.0;
const ridge: TerrainSampler = {
  maxElevationM: 1200,
  elevationAt: (_lon, lat) => (lat < lat0 - 0.0009 && lat > lat0 - 0.0018 ? 1200 : 1000),
};

test("terrain shadow: shaded behind a ridge, lit when far away, lit when sun is on the other side", () => {
  const noonSun = { altitude: 40, azimuth: 180 };
  assert.equal(terrainShaded(ridge, -115, lat0, noonSun), true);
  assert.equal(terrainShaded(ridge, -115, lat0 + 0.03, noonSun), false); // ~3.3 km north
  assert.equal(terrainShaded(ridge, -115, lat0, { altitude: 40, azimuth: 0 }), false); // sun in the north
  assert.equal(terrainShaded(ridge, -115, lat0, { altitude: -5, azimuth: 180 }), true); // night
});

// A 600 m deep pit centered at (-115.0002, lat0): shaded even with the sun nearly overhead.
const pit: TerrainSampler = {
  maxElevationM: 1600,
  elevationAt: (lon, lat) => {
    const r = Math.max(Math.abs(lon + 115.0002), Math.abs(lat - lat0));
    return r > 0.0009 && r < 0.004 ? 1600 : 1000;
  },
};

test("computeShade: trail in a deep pit is far less exposed at midday than an open one", () => {
  const under: [number, number, number][] = [[-115, lat0, 1000], [-115.0002, lat0, 1000], [-115.0004, lat0, 1000]];
  const open: [number, number, number][] = under.map(([x, y, z]) => [x, y + 0.03, z]);
  const a = computeShade(under, pit);
  const b = computeShade(open, pit);
  assert.equal(a.profile.summer.length, HOURS.length);
  assert.ok(a.midday_summer_pct < 5, `under ${a.midday_summer_pct}`);
  assert.ok(b.midday_summer_pct > 95, `open ${b.midday_summer_pct}`);
});

test("deriveShadeSpots finds a long, flat, shaded stretch only", () => {
  const pts: [number, number, number][] = Array.from({ length: 10 }, (_, i) => [-115, 36 + i * 0.00027, 1000]);
  const afternoon = [1, 1, 0.1, 0.1, 0.1, 0.1, 1, 1, 1, 1]; // points 2..5 shaded (~100 m)
  const spots = deriveShadeSpots(pts, afternoon);
  assert.equal(spots.length, 1);
  assert.ok(spots[0].length_m > 80);
  assert.ok(spots[0].exposure_pct <= 30);
  // Same stretch but steep: not suitable to sit.
  const steep = pts.map((p, i) => [p[0], p[1], 1000 + i * 8] as [number, number, number]);
  assert.equal(deriveShadeSpots(steep, afternoon).length, 0);
});

test("GridDem bilinear sampling and max elevation", async () => {
  const dem = await GridDem.build([36, -115, 36.01, -114.99], 100, 0, {
    elevations: async (pts) => pts.map((p) => 1000 + (p[1] - 36) * 10000), // 10 m per 0.001 deg lat
  });
  assert.ok(Math.abs(dem.elevationAt(-115, 36.005) - 1050) < 1);
  assert.ok(dem.maxElevationM >= 1100 - 20);
});

test("parseRestNodes maps OSM tags to rest kinds", () => {
  const spots = parseRestNodes({
    elements: [
      { type: "node", id: 1, lat: 36, lon: -115, tags: { natural: "spring", name: "Willow Spring" } },
      { type: "node", id: 2, lat: 36, lon: -115, tags: { amenity: "shelter" } },
      { type: "node", id: 3, lat: 36, lon: -115, tags: { tourism: "picnic_site" } },
      { type: "node", id: 4, lat: 36, lon: -115, tags: { amenity: "bench" } },
      { type: "way", id: 5 },
    ],
  });
  assert.deepEqual(spots.map((s) => s.kind), ["spring", "shelter", "picnic"]);
  assert.equal(spots[0].has_water, true);
  assert.equal(spots[1].has_water, false);
});

test("buildTrailRows with a terrain model populates sun fields and rest SQL", async () => {
  const fake = { elevations: async (p: [number, number][]) => p.map(() => 1000) };
  const rows = await buildTrailRows(parseElements(fixture), "red-rock", fake, { dem: ridge });
  assert.equal(rows.length, 1);
  assert.notEqual(rows[0].sun_exposure_pct, null);
  assert.ok(rows[0].sun_profile && rows[0].sun_profile.winter.length === HOURS.length);
  assert.match(toSql(rows), /sun_exposure_pct/);
  assert.match(toRestSql(parseRestNodes({ elements: [{ type: "node", id: 9, lat: 36, lon: -115, tags: { natural: "spring" } }] }), rows), /osm:9/);
});
