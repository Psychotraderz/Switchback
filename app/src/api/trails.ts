import type { DemoTrail } from "../data/demoTrails.ts";
import type { Season } from "../core/types.ts";

/** Row shape returned by the `trails_near` RPC. */
export interface TrailRow {
  id: number;
  name: string | null;
  region: string;
  distance_m: number;
  gain_m: number;
  max_grade_pct: number;
  sun_exposure_pct: number | null;
  sun_profile: Partial<Record<Season, number[]>> | null;
  away_m: number;
}

/** Unnamed OSM paths are common; give them an honest, readable fallback. */
export function trailTitle(r: Pick<TrailRow, "name" | "distance_m" | "region">): string {
  if (r.name) return r.name;
  const region = r.region.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `Unnamed path, ${(r.distance_m / 1000).toFixed(1)} km (${region})`;
}

export function toTrail(r: TrailRow): DemoTrail {
  return {
    id: `db-${r.id}`,
    name: trailTitle(r),
    blurb: `${(r.away_m / 1609.34).toFixed(1)} mi from you`,
    distance_m: r.distance_m,
    gain_m: r.gain_m,
    max_grade_pct: r.max_grade_pct,
    sun_exposure_pct: r.sun_exposure_pct,
    sun_profile: r.sun_profile,
  };
}
