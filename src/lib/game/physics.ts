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
  const cx = obstacle.x + obstacle.w / 2;
  const swingAngle = Math.sin(time * 3.6 + obstacle.x * 0.05) * 0.82;
  const chainLen = 46;
  const pivotH = obstacle.h; // 65
  const ballX = cx + Math.sin(swingAngle) * chainLen;
  const ballY = pivotH - Math.cos(swingAngle) * chainLen;
  const r = 18;
  return { cx, pivotH, swingAngle, chainLen, ballX, ballY, r };
}

export function hitsObstacle(runner: Runner, playerX: number, obstacle: Obstacle, time = 0): boolean {
  if (obstacle.kind === "mace") {
    // Flipping to the opposite side of the track completely avoids the mace
    if (runner.side !== obstacle.side) return false;
    const { cx, pivotH, ballX, ballY, r } = getMaceGeometry(obstacle, time);
    const playerLeft = playerX;
    const playerRight = playerX + PLAYER_W;
    const runnerBottom = runner.offset;
    const runnerTop = runner.offset + PLAYER_H;

    // 1. Support post & base collision: blocks full height up to pivotH
    if (playerRight > cx - 7 && playerLeft < cx + 7 && runnerBottom < pivotH) {
      return true;
    }

    // 2. Swinging spiked mace ball collision
    const nearX = Math.max(playerLeft, Math.min(ballX, playerRight));
    const nearY = Math.max(runnerBottom, Math.min(ballY, runnerTop));
    if ((nearX - ballX) ** 2 + (nearY - ballY) ** 2 < r ** 2) {
      return true;
    }

    // 3. Chain line segment collision from pivot (cx, pivotH) to ball (ballX, ballY)
    const cdx = ballX - cx;
    const cdy = ballY - pivotH;
    const segLenSq = cdx * cdx + cdy * cdy;
    const rcx = playerX + PLAYER_W / 2;
    const rcy = runnerBottom + PLAYER_H / 2;
    const u = segLenSq > 0 ? Math.max(0, Math.min(1, ((rcx - cx) * cdx + (rcy - pivotH) * cdy) / segLenSq)) : 0;
    const px = cx + u * cdx;
    const py = pivotH + u * cdy;
    if ((rcx - px) ** 2 + (rcy - py) ** 2 < (PLAYER_W / 2 + 5) ** 2) {
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