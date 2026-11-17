export const PLAYER_W = 14;
export const PLAYER_H = 20;
export const GRAVITY = 2600;
export const JUMP_V = -620;
export const TRACK_H = 8;
export type Side = 1 | -1;
export type Runner = { side: Side; offset: number; velocity: number; grounded: boolean };
export type ObstacleKind = "spike" | "column" | "blade" | "mace" | "laser";
export type Obstacle = { x: number; w: number; h: number; side: Side; tall: boolean; kind?: ObstacleKind };

export function jumpRunner(runner: Runner): Runner {
  return runner.grounded ? { ...runner, velocity: -JUMP_V, grounded: false } : runner;
}

export function flipRunner(runner: Runner): Runner {
  return { ...runner, side: runner.side === 1 ? -1 : 1 };
}

export function stepRunner(runner: Runner, dt: number): Runner {
  const velocity = runner.velocity - GRAVITY * dt;
  const offset = runner.offset + velocity * dt;
  if (offset <= 0) return { ...runner, offset: 0, velocity: 0, grounded: true };
  return { ...runner, offset, velocity, grounded: false };
}

export function hitsObstacle(runner: Runner, playerX: number, obstacle: Obstacle): boolean {
  if (obstacle.kind === "blade" || obstacle.kind === "mace") {
    const radius = obstacle.w / 2;
    const centerY = obstacle.kind === "blade" ? 0 : obstacle.h - radius;
    const minY = runner.side === obstacle.side ? runner.offset : -TRACK_H - runner.offset - PLAYER_H;
    const nearestX = Math.max(playerX, Math.min(obstacle.x + radius, playerX + PLAYER_W));
    const nearestY = Math.max(minY, Math.min(centerY, minY + PLAYER_H));
    return (nearestX - obstacle.x - radius) ** 2 + (nearestY - centerY) ** 2 < (radius - 3) ** 2;
  }
  return runner.side === obstacle.side &&
    playerX + PLAYER_W > obstacle.x + 3 &&
    playerX < obstacle.x + obstacle.w - 3 &&
    runner.offset < obstacle.h - 3;
}