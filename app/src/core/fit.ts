import type { TrailFacts, UserProfile } from "./types.ts";

export interface Fit {
  /** 0..100 */
  score: number;
  label: "Great fit" | "Good fit" | "A stretch" | "Too much";
  reasons: string[];
}

/** 1 when within comfort, falling linearly to 0 at 2x comfort. */
function stretch(value: number, comfort: number): number {
  if (value <= comfort) return 1;
  return Math.max(0, 1 - (value - comfort) / comfort);
}

export function fitScore(trail: TrailFacts, user: UserProfile): Fit {
  const reasons: string[] = [];
  const km = trail.distance_m / 1000;

  const dist = stretch(km, user.comfortDistanceKm);
  const gain = stretch(trail.gain_m, user.comfortGainM);
  // Steepness: comfortable grade grows with scramble comfort (12%..32%).
  const gradeLimit = 8 + user.scrambleComfort * 4.8;
  const grade = stretch(trail.max_grade_pct, gradeLimit);
  // Sun: tolerable midday exposure grows with heat tolerance (35%..95%).
  const sunLimit = 25 + user.heatTolerance * 14;
  const sun = trail.sun_exposure_pct === null ? 1 : stretch(trail.sun_exposure_pct, sunLimit);

  if (dist < 1) reasons.push(`${km.toFixed(1)} km is longer than your ${user.comfortDistanceKm} km comfort range`);
  if (gain < 1) reasons.push(`${Math.round(trail.gain_m)} m of climbing is above your ${user.comfortGainM} m comfort range`);
  if (grade < 1) reasons.push(`steepest section is about ${Math.round(trail.max_grade_pct)}% grade`);
  if (sun < 1 && trail.sun_exposure_pct !== null) reasons.push(`very exposed in midday sun (${Math.round(trail.sun_exposure_pct)}%)`);
  if (reasons.length === 0) reasons.push("Within your comfort range on distance, climbing, steepness and sun");

  const weighted = 0.3 * dist + 0.3 * gain + 0.2 * grade + 0.2 * sun;
  const worst = Math.min(dist, gain, grade, sun);
  const score = Math.round(100 * (worst < 0.3 ? Math.min(weighted, 0.5) : weighted));
  const label = score >= 85 ? "Great fit" : score >= 65 ? "Good fit" : score >= 40 ? "A stretch" : "Too much";
  return { score, label, reasons };
}
