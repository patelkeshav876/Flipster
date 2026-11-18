import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { flipRunner, jumpRunner, stepRunner, hitsObstacle, GRAVITY, JUMP_V, type Runner, type Obstacle } from "./physics";

const standing: Runner = { side: 1, offset: 0, velocity: 0, grounded: true };
const wall: Obstacle = { x: 70, w: 24, h: 180, side: 1, tall: true };

describe("reference Flipster controls", () => {
  test("flip runs underneath and a second flip returns to the top", () => {
    const flipped = flipRunner(standing);
    assert.equal(flipped.side, -1);
    assert.equal(flipped.grounded, true);
    assert.equal(flipRunner(flipped).side, 1);
  });
  test("jump moves away from either side and lands on the same side", () => {
    for (const side of [1, -1] as const) {
      let runner = jumpRunner({ ...standing, side });
      runner = stepRunner(runner, 1 / 120);
      assert.ok(runner.offset > 0);
      for (let i = 0; i < 120; i++) runner = stepRunner(runner, 1 / 120);
      assert.equal(runner.side, side);
      assert.equal(runner.offset, 0);
      assert.equal(runner.grounded, true);
    }
  });
  test("tall obstacles cannot be jumped over but can be avoided by flipping", () => {
    const apex = JUMP_V ** 2 / (2 * GRAVITY);
    assert.equal(hitsObstacle({ ...standing, offset: apex }, 70, wall), true);
    assert.equal(hitsObstacle(flipRunner(standing), 70, wall), false);
  });
  test("short spikes can be jumped over on either side", () => {
    for (const side of [1, -1] as const) {
      const spike = { ...wall, h: 28, side, tall: false };
      assert.equal(hitsObstacle({ ...standing, side }, 70, spike), true);
      assert.equal(hitsObstacle({ ...standing, side, offset: 40 }, 70, spike), false);
    }
  });
  test("track-mounted rotating blades collide on both track sides and can be jumped", () => {
    const blade: Obstacle = { x: 70, w: 56, h: 28, side: 1, tall: false, kind: "blade" };
    assert.equal(hitsObstacle(standing, 70, blade), true);
    assert.equal(hitsObstacle(flipRunner(standing), 70, blade), true);
    assert.equal(hitsObstacle({ ...standing, offset: 35 }, 70, blade), false);
  });
  test("a swinging mace collides with runners on the same side and can be avoided by flipping", () => {
    const mace: Obstacle = { x: 70, w: 48, h: 65, side: 1, tall: false, kind: "mace" };
    // On the same side, a runner near the base or ball hits it
    assert.equal(hitsObstacle(standing, 75, mace, 0), true);
    // Flipping to the opposite track avoids the obstacle completely
    assert.equal(hitsObstacle(flipRunner(standing), 75, mace, 0), false);
  });
});