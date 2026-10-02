import assert from "node:assert/strict";
import { test } from "node:test";
import { fitScore } from "../src/core/fit.ts";
import { exposureAt, seasonForMonth, tempAt } from "../src/core/heat.ts";
import { formatClock, planStart, simulate } from "../src/core/planner.ts";
import { baseMinutes, heatSlowdown } from "../src/core/time.ts";
import type { TrailFacts, UserProfile } from "../src/core/types.ts";

const user: UserProfile = { pace: "steady", comfortDistanceKm: 12, comfortGainM: 600, heatTolerance: 3, scrambleComfort: 3 };

// Summer: sun is on the trail all day except early/late (hour index 0 = 07:00).
const exposed: TrailFacts = {
  distance_m: 10000,
  gain_m: 400,
  max_grade_pct: 15,
  sun_exposure_pct: 90,
  sun_profile: { summer: [40, 70, 85, 90, 95, 95, 95, 95, 95, 90, 70, 40] },
};

test("baseMinutes: steady 9 km + 400 m is ~160 min", () => {
  assert.ok(Math.abs(baseMinutes({ distance_m: 9000, gain_m: 400 }, "steady") - 160) < 1);
});

test("heatSlowdown is neutral under 27C and worse for low heat tolerance", () => {
  assert.equal(heatSlowdown(25, 3), 1);
  assert.ok(heatSlowdown(40, 1) > heatSlowdown(40, 5));
});

test("tempAt peaks at 15:00 at the forecast high and is coolest near 05:00", () => {
  assert.ok(Math.abs(tempAt(15, 40) - 40) < 0.01);
  assert.ok(tempAt(5, 40) < tempAt(10, 40) && tempAt(10, 40) < tempAt(15, 40) && tempAt(22, 40) < tempAt(15, 40));
  assert.ok(Math.abs(tempAt(5, 40) - 26) < 0.01);
});

test("seasonForMonth and exposureAt interpolate and clamp", () => {
  assert.equal(seasonForMonth(7), "summer");
  assert.equal(seasonForMonth(1), "winter");
  assert.equal(seasonForMonth(10), "equinox");
  assert.equal(exposureAt(exposed, "summer", 7), 0.4);
  assert.equal(exposureAt(exposed, "summer", 5), 0.4); // clamped before 07:00
  assert.ok(Math.abs(exposureAt(exposed, "summer", 7.5) - 0.55) < 1e-9);
  assert.equal(exposureAt({ sun_exposure_pct: 50, sun_profile: null }, "summer", 12), 0.5);
});

test("planStart in a hot summer prefers an early start over midday", () => {
  const plan = planStart(exposed, user, { month: 7, highC: 41 });
  assert.ok(plan.best.startHour <= 6, `best start ${plan.best.startHour}`);
  const midday = simulate(exposed, user, 11, { month: 7, highC: 41 });
  assert.ok(midday.heatLoad > plan.best.heatLoad * 1.5);
  assert.ok(plan.best.waterLiters > 1);
});

test("planStart warns on extreme heat even at the best start", () => {
  const plan = planStart(exposed, user, { month: 7, highC: 49 });
  assert.ok(plan.warnings.some((w) => /extreme heat/i.test(w)));
});

test("a mild winter day lets the planner pick a later, warmer-for-comfort start without warnings", () => {
  const plan = planStart({ ...exposed, sun_profile: { winter: new Array(12).fill(60) } }, user, { month: 1, highC: 14 });
  assert.equal(plan.season, "winter");
  assert.equal(plan.warnings.length, 0);
});

test("formatClock rounds cleanly", () => {
  assert.equal(formatClock(6.1667), "06:10");
  assert.equal(formatClock(5.9999), "06:00");
});

test("fitScore: easy trail is a great fit; huge exposed trail is too much", () => {
  const easy: TrailFacts = { distance_m: 5000, gain_m: 150, max_grade_pct: 8, sun_exposure_pct: 30, sun_profile: null };
  assert.equal(fitScore(easy, user).label, "Great fit");
  const brutal: TrailFacts = { distance_m: 28000, gain_m: 1700, max_grade_pct: 40, sun_exposure_pct: 98, sun_profile: null };
  const f = fitScore(brutal, user);
  assert.equal(f.label, "Too much");
  assert.ok(f.reasons.length >= 3);
});

test("fitScore: heat tolerance changes the verdict on an exposed trail", () => {
  const t: TrailFacts = { distance_m: 8000, gain_m: 300, max_grade_pct: 12, sun_exposure_pct: 95, sun_profile: null };
  const low = fitScore(t, { ...user, heatTolerance: 1 });
  const high = fitScore(t, { ...user, heatTolerance: 5 });
  assert.ok(high.score > low.score);
});
