import type { PaceBand, UserProfile } from "./types.ts";

export interface QuizOption<T> {
  label: string;
  value: T;
}

export interface QuizQuestion<K extends keyof UserProfile> {
  key: K;
  title: string;
  options: QuizOption<UserProfile[K]>[];
}

export const QUIZ: [
  QuizQuestion<"pace">,
  QuizQuestion<"comfortDistanceKm">,
  QuizQuestion<"comfortGainM">,
  QuizQuestion<"heatTolerance">,
  QuizQuestion<"scrambleComfort">,
] = [
  {
    key: "pace",
    title: "How do you usually hike?",
    options: [
      { label: "Relaxed: lots of breaks and photos", value: "relaxed" },
      { label: "Steady: a comfortable all-day pace", value: "steady" },
      { label: "Strong: I move briskly", value: "strong" },
      { label: "Fast: trail-runner speed", value: "fast" },
    ],
  },
  {
    key: "comfortDistanceKm",
    title: "Longest day hike you enjoy?",
    options: [
      { label: "About 5 km (3 mi)", value: 5 },
      { label: "About 10 km (6 mi)", value: 10 },
      { label: "About 16 km (10 mi)", value: 16 },
      { label: "24 km (15 mi) or more", value: 24 },
    ],
  },
  {
    key: "comfortGainM",
    title: "How much climbing is comfortable in a day?",
    options: [
      { label: "Mostly flat (~200 m / 650 ft)", value: 200 },
      { label: "Moderate (~500 m / 1,600 ft)", value: 500 },
      { label: "Big days (~900 m / 3,000 ft)", value: 900 },
      { label: "Huge (1,400 m / 4,600 ft+)", value: 1400 },
    ],
  },
  {
    key: "heatTolerance",
    title: "How do you handle heat and direct sun?",
    options: [
      { label: "Heat wipes me out", value: 1 },
      { label: "I get uncomfortable quickly", value: 2 },
      { label: "Fine with water and breaks", value: 3 },
      { label: "Handle it well", value: 4 },
      { label: "Desert regular", value: 5 },
    ],
  },
  {
    key: "scrambleComfort",
    title: "How do you feel about steep, loose or scrambly terrain?",
    options: [
      { label: "Avoid it", value: 1 },
      { label: "Short sections only", value: 2 },
      { label: "Fine with care", value: 3 },
      { label: "Enjoy it", value: 4 },
      { label: "Love scrambling", value: 5 },
    ],
  },
];

export const DEFAULT_PROFILE: UserProfile = {
  pace: "steady",
  comfortDistanceKm: 10,
  comfortGainM: 500,
  heatTolerance: 3,
  scrambleComfort: 3,
};

const PACES: PaceBand[] = ["relaxed", "steady", "strong", "fast"];
const isScale = (v: unknown): v is 1 | 2 | 3 | 4 | 5 => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;
const isPositive = (v: unknown, max: number): v is number => typeof v === "number" && Number.isFinite(v) && v > 0 && v <= max;

/** Validates stored or untrusted JSON; returns null if anything is off. */
export function parseProfile(raw: string | null): UserProfile | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (
      PACES.includes(o.pace as PaceBand) &&
      isPositive(o.comfortDistanceKm, 200) &&
      isPositive(o.comfortGainM, 6000) &&
      isScale(o.heatTolerance) &&
      isScale(o.scrambleComfort)
    ) {
      return {
        pace: o.pace as PaceBand,
        comfortDistanceKm: o.comfortDistanceKm,
        comfortGainM: o.comfortGainM,
        heatTolerance: o.heatTolerance,
        scrambleComfort: o.scrambleComfort,
      };
    }
  } catch {
    // fall through
  }
  return null;
}
