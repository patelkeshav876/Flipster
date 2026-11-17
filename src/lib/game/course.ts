import type { ObstacleKind } from "./physics";

export const BAR_UNLOCK_SCORE = 100;
export const LASER_UNLOCK_SCORE = 250;

// Use the score at this world position, never the current frame or viewport.
export function obstacleKindsAt(worldX: number): readonly ObstacleKind[] {
  const score = Math.floor(worldX / 10);
  if (score < BAR_UNLOCK_SCORE) return ["spike"];
  if (score < LASER_UNLOCK_SCORE) return ["spike", "column"];
  return ["spike", "column", "blade", "mace", "laser"];
}

export function obstacleGap(worldX: number, random: number): number {
  const futureSpeed = Math.min(560, Math.sqrt(230 ** 2 + 2 * 5.5 * worldX));
  return futureSpeed * (3.5 + random);
}

export const FIRST_PICKUP_X = 1800;
export function pickupGap(random: number): number {
  return 3000 + random * 1500;
}