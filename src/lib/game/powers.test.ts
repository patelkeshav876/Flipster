import { test } from "node:test";
import assert from "node:assert/strict";
import { absorbHit, collectPower, tickPowers, touchesPickup, SPEED_MULTIPLIER } from "./powers";

test("shield collectible protects against one hit, not the next", () => {
  const active = collectPower({ shield: 0, speed: 0 }, "shield");
  assert.equal(active.shield, 6);
  const hit = absorbHit(active);
  assert.equal(hit.survives, true);
  assert.equal(absorbHit(hit.powers).survives, false);
});
test("speed-up increases speed and expires without changing shield", () => {
  const active = collectPower({ shield: 3, speed: 0 }, "speed");
  assert.equal(active.speed, 4);
  assert.equal(230 * SPEED_MULTIPLIER, 368);
  assert.deepEqual(tickPowers(active, 4), { shield: 0, speed: 0 });
});
test("both power types can be collected on either side only within reach", () => {
  for (const side of [1, -1] as const) for (const kind of ["shield", "speed"] as const) {
    const runner = { side, offset: 0, velocity: 0, grounded: true };
    const pickup = { x: 80, offset: 20, side, kind };
    assert.equal(touchesPickup(runner, 70, pickup), true);
    assert.equal(touchesPickup({ ...runner, side: side === 1 ? -1 : 1 }, 70, pickup), false);
    assert.equal(touchesPickup(runner, 200, pickup), false);
  }
});