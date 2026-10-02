import { haversine, type Point3 } from "./geo.ts";

export interface TrailStats {
  distance_m: number;
  gain_m: number;
  loss_m: number;
  min_ele_m: number;
  max_ele_m: number;
  /** Steepest sustained grade (over ~50 m windows), percent. */
  max_grade_pct: number;
}

/** Moving-average smoothing of elevations; DEM noise otherwise inflates gain. */
export function smooth(ele: number[], window = 5): number[] {
  const half = Math.floor(window / 2);
  return ele.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, i - half); k <= Math.min(ele.length - 1, i + half); k++) {
      sum += ele[k];
      n++;
    }
    return sum / n;
  });
}

/**
 * Gain/loss with a hysteresis threshold: a climb only counts once it exceeds
 * `threshold` meters, which ignores small DEM wiggles.
 */
export function gainLoss(ele: number[], threshold = 3): { gain: number; loss: number } {
  let gain = 0;
  let loss = 0;
  let ref = ele[0];
  for (const e of ele) {
    if (e - ref >= threshold) {
      gain += e - ref;
      ref = e;
    } else if (ref - e >= threshold) {
      loss += ref - e;
      ref = e;
    }
  }
  return { gain, loss };
}

export function computeStats(pts: Point3[]): TrailStats {
  if (pts.length < 2) throw new Error("need at least 2 points");
  const dist: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    dist.push(dist[i - 1] + haversine([pts[i - 1][0], pts[i - 1][1]], [pts[i][0], pts[i][1]]));
  }
  const ele = smooth(pts.map((p) => p[2]));
  const { gain, loss } = gainLoss(ele);

  let maxGrade = 0;
  let j = 0;
  for (let i = 1; i < pts.length; i++) {
    while (dist[i] - dist[j] > 50 && j < i - 1) j++;
    const run = dist[i] - dist[j];
    if (run >= 25) maxGrade = Math.max(maxGrade, (Math.abs(ele[i] - ele[j]) / run) * 100);
  }

  return {
    distance_m: dist[dist.length - 1],
    gain_m: gain,
    loss_m: loss,
    min_ele_m: Math.min(...ele),
    max_ele_m: Math.max(...ele),
    max_grade_pct: maxGrade,
  };
}
