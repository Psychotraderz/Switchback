import type { TrailFacts } from "../core/types.ts";

export interface DemoTrail extends TrailFacts {
  id: string;
  name: string;
  blurb: string;
}

const curve = (peak: number, early: number, late: number): number[] => [
  early,
  Math.round((early + peak) / 2),
  Math.round(peak * 0.92),
  peak,
  peak,
  peak,
  peak,
  peak,
  peak,
  Math.round(peak * 0.9),
  Math.round((peak + late) / 2),
  late,
];

// Invented numbers for UI development. Replaced by the ingestion pipeline's output.
export const DEMO_TRAILS: DemoTrail[] = [
  {
    id: "demo-wash",
    name: "Demo: Open Wash Loop",
    blurb: "Wide, sunny desert wash. Easy footing, no shade.",
    distance_m: 8200,
    gain_m: 140,
    max_grade_pct: 9,
    sun_exposure_pct: 96,
    sun_profile: { summer: curve(97, 70, 60), equinox: curve(92, 60, 40), winter: curve(80, 50, 30) },
  },
  {
    id: "demo-canyon",
    name: "Demo: Narrow Canyon Out-and-Back",
    blurb: "Deep canyon walls keep most of the trail shaded by late morning.",
    distance_m: 6400,
    gain_m: 260,
    max_grade_pct: 22,
    sun_exposure_pct: 28,
    sun_profile: { summer: curve(35, 10, 8), equinox: curve(30, 10, 5), winter: curve(25, 15, 5) },
  },
  {
    id: "demo-ridge",
    name: "Demo: High Ridge Traverse",
    blurb: "Long, steep and exposed. Big views, serious day.",
    distance_m: 21500,
    gain_m: 1380,
    max_grade_pct: 34,
    sun_exposure_pct: 88,
    sun_profile: { summer: curve(90, 60, 50), equinox: curve(85, 50, 40), winter: curve(70, 40, 30) },
  },
];
