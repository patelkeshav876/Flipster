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

export function getMaceGeometry(obstacle: Obstacle, time: number) {
  const swing = Math.sin(time * 3.2 + obstacle.x * 0.04);
  const shiftX = swing * 28;
  const angle = 0.55 + swing * 0.70;
  const chainLen = 52;
  const r = obstacle.w / 2;
  const baseX = obstacle.x + r - 20 + shiftX;
  const baseY = 0;
  const ballX = baseX + Math.cos(angle) * chainLen;
  const ballY = Math.sin(angle) * chainLen;
  return { baseX, baseY, ballX, ballY, r, shiftX, angle, chainLen };
}

export function hitsObstacle(runner: Runner, playerX: number, obstacle: Obstacle, time = 0): boolean {
  if (obstacle.kind === "mace") {
    if (runner.side !== obstacle.side) return false;
    const { baseX, ballX, ballY, r } = getMaceGeometry(obstacle, time);
    const playerLeft = playerX;
    const playerRight = playerX + PLAYER_W;
    const runnerBottom = runner.offset;
    const runnerTop = runner.offset + PLAYER_H;

    // 1. Base block collision on track surface
    if (playerRight > baseX - 10 && playerLeft < baseX + 10 && runnerBottom < 14) {
      return true;
    }

    // 2. Spiked ball collision
    const nearX = Math.max(playerLeft, Math.min(ballX, playerRight));
    const nearY = Math.max(runnerBottom, Math.min(ballY, runnerTop));
    if ((nearX - ballX) ** 2 + (nearY - ballY) ** 2 < (r - 2) ** 2) {
      return true;
    }

    // 3. Chain line segment collision
    const cdx = ballX - baseX;
    const cdy = ballY;
    const segLenSq = cdx * cdx + cdy * cdy;
    const rcx = playerX + PLAYER_W / 2;
    const rcy = runnerBottom + PLAYER_H / 2;
    const u = segLenSq > 0 ? Math.max(0, Math.min(1, ((rcx - baseX) * cdx + rcy * cdy) / segLenSq)) : 0;
    const px = baseX + u * cdx;
    const py = u * cdy;
    if ((rcx - px) ** 2 + (rcy - py) ** 2 < (PLAYER_W / 2 + 4) ** 2) {
      return true;
    }
    return false;
  }
  if (obstacle.kind === "blade") {
    const radius = obstacle.w / 2;
    const centerY = 0;
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