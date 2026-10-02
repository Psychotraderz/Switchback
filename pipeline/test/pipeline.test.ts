import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildTrailRows, toSql } from "../src/build.ts";
import { densify, haversine } from "../src/geo.ts";
import { buildQuery, parseElements } from "../src/overpass.ts";
import { computeStats, gainLoss } from "../src/stats.ts";

const fixture = JSON.parse(readFileSync(new URL("./fixture.json", import.meta.url), "utf8"));

test("haversine: one degree of latitude is ~111 km", () => {
  assert.ok(Math.abs(haversine([0, 0], [0, 1]) - 111195) < 200);
});

test("densify keeps endpoints and caps spacing", () => {
  const out = densify([[0, 0], [0, 0.01]], 30);
  assert.deepEqual(out[0], [0, 0]);
  assert.deepEqual(out.at(-1), [0, 0.01]);
  for (let i = 1; i < out.length; i++) assert.ok(haversine(out[i - 1], out[i]) <= 31);
});

test("gainLoss ignores wiggles below threshold", () => {
  const r = gainLoss([100, 101, 100, 102, 100, 101, 100]);
  assert.equal(r.gain, 0);
  assert.equal(r.loss, 0);
});

test("gainLoss counts real climbs and descents", () => {
  const r = gainLoss([100, 110, 120, 110, 100]);
  assert.equal(r.gain, 20);
  assert.equal(r.loss, 20);
});

test("computeStats on a steady 10% grade", () => {
  // ~1.1 km north, rising 111 m => ~10%
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= 40; i++) pts.push([0, i * 0.00025, i * 2.775]);
  const s = computeStats(pts);
  assert.ok(Math.abs(s.distance_m - 1112) < 5);
  assert.ok(Math.abs(s.gain_m - 111) < 10);
  assert.ok(Math.abs(s.max_grade_pct - 10) < 1);
  assert.equal(s.loss_m, 0);
});

test("parseElements keeps ways only and maps tags", () => {
  const ways = parseElements(fixture);
  assert.equal(ways.length, 2);
  assert.equal(ways[0].name, "Calico O'Brien Loop");
  assert.deepEqual(ways[0].geometry[0], [-115.43, 36.135]);
});

test("buildQuery embeds bbox and excludes private access", () => {
  const q = buildQuery([36, -115.55, 36.25, -115.3]);
  assert.match(q, /36,-115.55,36.25,-115.3/);
  assert.match(q, /private/);
});

test("buildTrailRows drops tiny ways and toSql escapes quotes", async () => {
  const fake = { elevations: async (p: [number, number][]) => p.map((_, i) => 1000 + i * 3) };
  const rows = await buildTrailRows(parseElements(fixture), "red-rock", fake);
  assert.equal(rows.length, 1); // the ~1 m footway is dropped
  assert.ok(rows[0].gain_m > 0);
  const sql = toSql(rows);
  assert.match(sql, /Calico O''Brien Loop/);
  assert.match(sql, /on conflict \(osm_id\)/);
});
