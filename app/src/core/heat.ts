import type { Season, TrailFacts } from "./types.ts";

/**
 * Diurnal curve: low at 05:00 (about sunrise), high at 15:00, smooth in between.
 * `highC` is the day's forecast high; `swingC` is the daily range.
 */
export function tempAt(hour: number, highC: number, swingC = 14): number {
  const low = highC - swingC;
  let h = ((hour % 24) + 24) % 24;
  if (h < 5) h += 24;
  if (h <= 15) return low + ((highC - low) * (1 - Math.cos(Math.PI * ((h - 5) / 10)))) / 2;
  return highC - ((highC - low) * (1 - Math.cos(Math.PI * ((h - 15) / 14)))) / 2;
}

export function seasonForMonth(month: number): Season {
  if (month >= 6 && month <= 8) return "summer";
  if (month === 12 || month <= 2) return "winter";
  return "equinox";
}

/** Sun exposure 0..1 at a (fractional) local hour; clamps outside the modeled 7..18 window. */
export function exposureAt(trail: Pick<TrailFacts, "sun_exposure_pct" | "sun_profile">, season: Season, hour: number): number {
  const profile = trail.sun_profile?.[season];
  if (!profile) return trail.sun_exposure_pct === null ? 1 : trail.sun_exposure_pct / 100; // unknown: assume the headline number
  const x = Math.min(profile.length - 1, Math.max(0, hour - 7));
  const lo = Math.floor(x);
  const hi = Math.min(profile.length - 1, lo + 1);
  return (profile[lo] * (1 - (x - lo)) + profile[hi] * (x - lo)) / 100;
}

/** Rough water need, liters per hour of hiking. Guidance only, not medical advice. */
export function waterLitersPerHour(tempC: number, exposure: number): number {
  return 0.4 + 0.04 * Math.max(0, tempC - 20) * (0.5 + 0.5 * exposure);
}
