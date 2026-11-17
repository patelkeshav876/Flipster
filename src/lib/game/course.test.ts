import { test } from "node:test";
import assert from "node:assert/strict";
import { obstacleKindsAt, obstacleGap, FIRST_PICKUP_X, pickupGap } from "./course";

test("the opening course contains only nail-like spikes", () => {
  assert.deepEqual(obstacleKindsAt(620), ["spike"]);
  assert.deepEqual(obstacleKindsAt(999), ["spike"]);
});
test("big bars unlock at 100 metres, not before", () => {
  assert.equal(obstacleKindsAt(999).includes("column"), false);
  assert.deepEqual(obstacleKindsAt(1000), ["spike", "column"]);
});
test("lasers unlock at 250 metres, not before", () => {
  assert.equal(obstacleKindsAt(2499).includes("laser"), false);
  assert.equal(obstacleKindsAt(2500).includes("laser"), true);
});
test("sparser hazards allow 3.5 to 4.5 seconds at the position-based speed", () => {
  for (const x of [620, 1000, 2500, 30000]) {
    const speed = Math.min(560, Math.sqrt(230 ** 2 + 2 * 5.5 * x));
    assert.equal(obstacleGap(x, 0), speed * 3.5);
    assert.equal(obstacleGap(x, 1), speed * 4.5);
    assert.ok(obstacleGap(x, 0) > speed * 3);
  }
});
test("power-ups start later and have long clear stretches between them", () => {
  assert.equal(FIRST_PICKUP_X, 1800);
  assert.equal(pickupGap(0), 3000);
  assert.equal(pickupGap(1), 4500);
});