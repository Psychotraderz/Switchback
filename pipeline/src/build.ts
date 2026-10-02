import { densify, lineLength, type Point3 } from "./geo.ts";
import type { ElevationProvider } from "./elevation.ts";
import type { RawWay } from "./overpass.ts";
import type { RestSpot } from "./rest.ts";
import type { CanopySampler, SunProfile } from "./shade.ts";
import { computeShade, deriveShadeSpots, NO_CANOPY } from "./shade.ts";
import type { TerrainSampler } from "./dem.ts";
import { computeStats, type TrailStats } from "./stats.ts";

export interface TrailRow extends TrailStats {
  osm_id: number;
  name: string | null;
  highway: string;
  sac_scale: string | null;
  surface: string | null;
  region: string;
  geometry: Point3[];
  /** Null when no terrain model was supplied. */
  sun_exposure_pct: number | null;
  sun_profile: SunProfile | null;
  /** Derived shaded rest spots along this trail. */
  shade_spots: RestSpot[];
}

export interface ShadeContext {
  dem: TerrainSampler;
  canopy?: CanopySampler;
}

const MIN_LENGTH_M = 50;
const SAMPLE_SPACING_M = 30;

export async function buildTrailRows(
  ways: RawWay[],
  region: string,
  provider: ElevationProvider,
  shade?: ShadeContext,
): Promise<TrailRow[]> {
  const rows: TrailRow[] = [];
  for (const w of ways) {
    if (lineLength(w.geometry) < MIN_LENGTH_M) continue;
    const pts = densify(w.geometry, SAMPLE_SPACING_M);
    const ele = await provider.elevations(pts);
    const geometry: Point3[] = pts.map((p, i) => [p[0], p[1], ele[i]]);
    let sun_exposure_pct: number | null = null;
    let sun_profile: SunProfile | null = null;
    let shade_spots: RestSpot[] = [];
    if (shade) {
      const s = computeShade(geometry, shade.dem, shade.canopy ?? NO_CANOPY);
      sun_exposure_pct = s.midday_summer_pct;
      sun_profile = s.profile;
      shade_spots = deriveShadeSpots(geometry, s.afternoon).map((d) => ({
        osm_id: null,
        kind: "shade" as const,
        name: null,
        lon: d.lon,
        lat: d.lat,
        source: "derived" as const,
        has_water: false,
        exposure_pct: d.exposure_pct,
      }));
    }
    rows.push({
      osm_id: w.osm_id,
      name: w.name,
      highway: w.highway,
      sac_scale: w.sac_scale,
      surface: w.surface,
      region,
      geometry,
      sun_exposure_pct,
      sun_profile,
      shade_spots,
      ...computeStats(geometry),
    });
  }
  return rows;
}

const lit = (v: string | null) => (v === null ? "null" : `'${v.replace(/'/g, "''")}'`);
const num = (v: number | null, digits = 1) => (v === null ? "null" : v.toFixed(digits));

/** Idempotent upsert statements, one per trail. */
export function toSql(rows: TrailRow[]): string {
  return rows
    .map((r) => {
      const geojson = JSON.stringify({ type: "LineString", coordinates: r.geometry });
      const profile = r.sun_profile ? `${lit(JSON.stringify(r.sun_profile))}::jsonb` : "null";
      return `insert into public.trails (osm_id, name, highway, sac_scale, surface, region, distance_m, gain_m, loss_m, min_ele_m, max_ele_m, max_grade_pct, sun_exposure_pct, sun_profile, geom)
values (${r.osm_id}, ${lit(r.name)}, ${lit(r.highway)}, ${lit(r.sac_scale)}, ${lit(r.surface)}, ${lit(r.region)}, ${num(r.distance_m)}, ${num(r.gain_m)}, ${num(r.loss_m)}, ${num(r.min_ele_m)}, ${num(r.max_ele_m)}, ${num(r.max_grade_pct)}, ${num(r.sun_exposure_pct)}, ${profile}, st_setsrid(st_force2d(st_geomfromgeojson(${lit(geojson)})), 4326)::geography)
on conflict (osm_id) do update set name = excluded.name, highway = excluded.highway, sac_scale = excluded.sac_scale, surface = excluded.surface, region = excluded.region, distance_m = excluded.distance_m, gain_m = excluded.gain_m, loss_m = excluded.loss_m, min_ele_m = excluded.min_ele_m, max_ele_m = excluded.max_ele_m, max_grade_pct = excluded.max_grade_pct, sun_exposure_pct = excluded.sun_exposure_pct, sun_profile = excluded.sun_profile, geom = excluded.geom, updated_at = now();`;
    })
    .join("\n");
}

/** Rest spots from OSM plus shade spots derived per trail. Rerunnable: derived spots for a trail are replaced. */
export function toRestSql(osmSpots: RestSpot[], rows: TrailRow[]): string {
  const stmts: string[] = [];
  const point = (s: RestSpot) => `st_setsrid(st_makepoint(${s.lon}, ${s.lat}), 4326)::geography`;
  for (const s of osmSpots) {
    stmts.push(
      `insert into public.rest_spots (key, osm_id, trail_osm_id, kind, name, source, has_water, exposure_pct, geom)
values ('osm:${s.osm_id}', ${s.osm_id}, null, ${lit(s.kind)}, ${lit(s.name)}, 'osm', ${s.has_water}, null, ${point(s)})
on conflict (key) do update set kind = excluded.kind, name = excluded.name, has_water = excluded.has_water, geom = excluded.geom;`,
    );
  }
  for (const r of rows) {
    if (r.sun_exposure_pct === null) continue;
    stmts.push(`delete from public.rest_spots where source = 'derived' and trail_osm_id = ${r.osm_id};`);
    r.shade_spots.forEach((s, i) => {
      stmts.push(
        `insert into public.rest_spots (key, osm_id, trail_osm_id, kind, name, source, has_water, exposure_pct, geom)
values ('derived:${r.osm_id}:${i}', null, ${r.osm_id}, 'shade', null, 'derived', false, ${num(s.exposure_pct)}, ${point(s)});`,
      );
    });
  }
  return stmts.join("\n");
}
