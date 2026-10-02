import { exposureAt, seasonForMonth, tempAt, waterLitersPerHour } from "./heat.ts";
import { baseMinutes, heatSlowdown } from "./time.ts";
import type { Season, TrailFacts, UserProfile } from "./types.ts";

export interface PlanOptions {
  month: number;
  /** Forecast daily high, Celsius. */
  highC: number;
  earliestStart?: number; // local hour, default 5
  latestStart?: number; // default 15
}

export interface StartOption {
  startHour: number;
  durationMin: number;
  /** Heat-weighted sun load, lower is better. */
  heatLoad: number;
  peakTempC: number;
  waterLiters: number;
}

export interface Plan {
  best: StartOption;
  alternatives: StartOption[];
  warnings: string[];
  season: Season;
}

const STEP_MIN = 5;

/** Simulate one start time in 5-minute steps (duration lengthens as heat slows the hiker). */
export function simulate(trail: TrailFacts, user: UserProfile, startHour: number, opts: PlanOptions): StartOption {
  const season = seasonForMonth(opts.month);
  const totalWork = baseMinutes(trail, user.pace); // minutes of "comfortable-pace" effort
  let done = 0;
  let t = startHour;
  let heatLoad = 0;
  let peak = -Infinity;
  let water = 0;
  let elapsed = 0;
  while (done < totalWork && elapsed < 24 * 60) {
    const temp = tempAt(t, opts.highC);
    const exp = exposureAt(trail, season, t);
    const rate = 1 / heatSlowdown(temp, user.heatTolerance); // effort minutes per clock minute
    done += STEP_MIN * rate;
    heatLoad += Math.max(0, temp - 20) * (0.25 + 0.75 * exp) * (STEP_MIN / 60);
    water += (waterLitersPerHour(temp, exp) * STEP_MIN) / 60;
    peak = Math.max(peak, temp);
    t += STEP_MIN / 60;
    elapsed += STEP_MIN;
  }
  return { startHour, durationMin: elapsed, heatLoad, peakTempC: peak, waterLiters: water };
}

export function planStart(trail: TrailFacts, user: UserProfile, opts: PlanOptions): Plan {
  const options: StartOption[] = [];
  for (let h = opts.earliestStart ?? 5; h <= (opts.latestStart ?? 15); h += 0.25) {
    options.push(simulate(trail, user, h, opts));
  }
  options.sort((a, b) => a.heatLoad - b.heatLoad);
  const best = options[0];
  const alternatives = options.filter((o) => Math.abs(o.startHour - best.startHour) >= 1).slice(0, 2);

  const season = seasonForMonth(opts.month);
  const warnings: string[] = [];
  const finish = best.startHour + best.durationMin / 60;
  if (best.peakTempC >= 38) warnings.push("Even the best start hits extreme heat. Consider another day or a shorter route.");
  if (finish > 11 && opts.highC >= 35) {
    const exp = exposureAt(trail, season, Math.min(finish, 15));
    if (exp > 0.6) warnings.push("You'd still be on exposed ground after 11:00. Plan shade breaks and carry extra water.");
  }
  if (best.waterLiters > 3) warnings.push(`Rough water need is about ${best.waterLiters.toFixed(1)} L. Confirm any water sources before relying on them.`);
  return { best, alternatives, warnings, season };
}

export function formatClock(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const hh = m === 60 ? h + 1 : h;
  return `${String(hh).padStart(2, "0")}:${String(m === 60 ? 0 : m).padStart(2, "0")}`;
}
