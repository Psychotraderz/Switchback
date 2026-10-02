import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_PROFILE, parseProfile, QUIZ } from "../src/core/profile.ts";

test("parseProfile round-trips a valid profile", () => {
  assert.deepEqual(parseProfile(JSON.stringify(DEFAULT_PROFILE)), DEFAULT_PROFILE);
});

test("parseProfile rejects missing, malformed and out-of-range data", () => {
  assert.equal(parseProfile(null), null);
  assert.equal(parseProfile("not json"), null);
  assert.equal(parseProfile(JSON.stringify({ ...DEFAULT_PROFILE, pace: "warp" })), null);
  assert.equal(parseProfile(JSON.stringify({ ...DEFAULT_PROFILE, heatTolerance: 9 })), null);
  assert.equal(parseProfile(JSON.stringify({ ...DEFAULT_PROFILE, comfortGainM: -5 })), null);
  assert.equal(parseProfile(JSON.stringify({ ...DEFAULT_PROFILE, comfortDistanceKm: "12" })), null);
});

test("every quiz option produces a profile that parseProfile accepts", () => {
  for (const q of QUIZ) {
    for (const o of q.options) {
      const p = { ...DEFAULT_PROFILE, [q.key]: o.value };
      assert.deepEqual(parseProfile(JSON.stringify(p)), p, `${q.key}=${String(o.value)}`);
    }
  }
});
