import { densify, lineLength, type Point3 } from "./geo.ts";
import type { ElevationProvider } from "./elevation.ts";
import type { RawWay } from "./overpass.ts";
import { computeStats, type TrailStats } from "./stats.ts";

export interface TrailRow extends TrailStats {
  osm_id: number;
  name: string | null;
  highway: string;
  sac_scale: string | null;
  surface: string | null;
  region: string;
  geometry: Point3[];
}

const MIN_LENGTH_M = 50;
const SAMPLE_SPACING_M = 30;

export async function buildTrailRows(
  ways: RawWay[],
  region: string,
  provider: ElevationProvider,
): Promise<TrailRow[]> {
  const rows: TrailRow[] = [];
  for (const w of ways) {
    if (lineLength(w.geometry) < MIN_LENGTH_M) continue;
    const pts = densify(w.geometry, SAMPLE_SPACING_M);
    const ele = await provider.elevations(pts);
    const geometry: Point3[] = pts.map((p, i) => [p[0], p[1], ele[i]]);
    rows.push({
      osm_id: w.osm_id,
      name: w.name,
      highway: w.highway,
      sac_scale: w.sac_scale,
      surface: w.surface,
      region,
      geometry,
      ...computeStats(geometry),
    });
  }
  return rows;
}

const lit = (v: string | null) => (v === null ? "null" : `'${v.replace(/'/g, "''")}'`);

/** Idempotent upsert statements, one per trail. */
export function toSql(rows: TrailRow[]): string {
  return rows
    .map((r) => {
      const geojson = JSON.stringify({ type: "LineString", coordinates: r.geometry });
      return `insert into public.trails (osm_id, name, highway, sac_scale, surface, region, distance_m, gain_m, loss_m, min_ele_m, max_ele_m, max_grade_pct, geom)
values (${r.osm_id}, ${lit(r.name)}, ${lit(r.highway)}, ${lit(r.sac_scale)}, ${lit(r.surface)}, ${lit(r.region)}, ${r.distance_m.toFixed(1)}, ${r.gain_m.toFixed(1)}, ${r.loss_m.toFixed(1)}, ${r.min_ele_m.toFixed(1)}, ${r.max_ele_m.toFixed(1)}, ${r.max_grade_pct.toFixed(1)}, st_setsrid(st_force2d(st_geomfromgeojson(${lit(geojson)})), 4326)::geography)
on conflict (osm_id) do update set name = excluded.name, highway = excluded.highway, sac_scale = excluded.sac_scale, surface = excluded.surface, region = excluded.region, distance_m = excluded.distance_m, gain_m = excluded.gain_m, loss_m = excluded.loss_m, min_ele_m = excluded.min_ele_m, max_ele_m = excluded.max_ele_m, max_grade_pct = excluded.max_grade_pct, geom = excluded.geom;`;
    })
    .join("\n");
}
