import assert from "node:assert/strict";
import { test } from "node:test";
import { toTrail, trailTitle, type TrailRow } from "../src/api/trails.ts";

const row: TrailRow = {
  id: 7,
  name: null,
  region: "red-rock",
  distance_m: 3200,
  gain_m: 80,
  max_grade_pct: 11,
  sun_exposure_pct: 64,
  sun_profile: null,
  away_m: 8047,
};

test("unnamed paths get an honest fallback title", () => {
  assert.equal(trailTitle(row), "Unnamed path, 3.2 km (Red Rock)");
  assert.equal(trailTitle({ ...row, name: "Calico Tanks" }), "Calico Tanks");
});

test("toTrail maps a database row for the UI", () => {
  const t = toTrail(row);
  assert.equal(t.id, "db-7");
  assert.equal(t.blurb, "5.0 mi from you");
  assert.equal(t.sun_exposure_pct, 64);
});
