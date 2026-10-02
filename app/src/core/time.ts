import type { PaceBand, TrailFacts } from "./types.ts";

// Flat speed (km/h) and Naismith-style climbing penalty (minutes per 100 m gain).
const PACE: Record<PaceBand, { kmh: number; minPer100m: number }> = {
  relaxed: { kmh: 3.5, minPer100m: 12 },
  steady: { kmh: 4.5, minPer100m: 10 },
  strong: { kmh: 5.0, minPer100m: 8 },
  fast: { kmh: 5.5, minPer100m: 6 },
};

/** Moving time in minutes at comfortable temperatures. */
export function baseMinutes(trail: Pick<TrailFacts, "distance_m" | "gain_m">, pace: PaceBand): number {
  const p = PACE[pace];
  return (trail.distance_m / 1000 / p.kmh) * 60 + (trail.gain_m / 100) * p.minPer100m;
}

/** People slow down in heat: ~1.5% per degree C above 27 C, scaled by heat tolerance. */
export function heatSlowdown(tempC: number, heatTolerance: number): number {
  const tolerance = 1.4 - heatTolerance * 0.15; // 1 -> 1.25, 5 -> 0.65
  return 1 + 0.015 * Math.max(0, tempC - 27) * tolerance;
}
