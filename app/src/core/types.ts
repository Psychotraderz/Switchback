export type PaceBand = "relaxed" | "steady" | "strong" | "fast";
export type Season = "summer" | "equinox" | "winter";

export interface TrailFacts {
  distance_m: number;
  gain_m: number;
  max_grade_pct: number;
  /** Mean summer exposure 11:00-15:00, 0..100. Null if not modeled yet. */
  sun_exposure_pct: number | null;
  /** Exposure percent per local hour 7..18, per season. */
  sun_profile: Partial<Record<Season, number[]>> | null;
}

export interface UserProfile {
  pace: PaceBand;
  /** Longest day hike they are comfortable with, km. */
  comfortDistanceKm: number;
  /** Climbing they are comfortable with in a day, meters. */
  comfortGainM: number;
  /** 1 = heat is hard for me, 5 = I handle heat well. */
  heatTolerance: 1 | 2 | 3 | 4 | 5;
  /** 1 = avoid steep/loose, 5 = happy scrambling. */
  scrambleComfort: 1 | 2 | 3 | 4 | 5;
}
