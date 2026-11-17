import { PLAYER_H, PLAYER_W, type Runner, type Side } from "./physics";

export type PowerKind = "shield" | "speed";
export type Pickup = { x: number; side: Side; offset: number; kind: PowerKind };
export type Powers = { shield: number; speed: number };
export const SHIELD_DURATION = 6;
export const SPEED_DURATION = 4;
export const SPEED_MULTIPLIER = 1.6;
export function tickPowers(powers: Powers, dt: number): Powers {
  return { shield: Math.max(0, powers.shield - dt), speed: Math.max(0, powers.speed - dt) };
}
export function collectPower(powers: Powers, kind: PowerKind): Powers {
  return { ...powers, [kind]: kind === "shield" ? SHIELD_DURATION : SPEED_DURATION };
}
export function touchesPickup(runner: Runner, x: number, pickup: Pickup): boolean {
  return runner.side === pickup.side && x + PLAYER_W > pickup.x - 16 && x < pickup.x + 16 &&
    runner.offset + PLAYER_H > pickup.offset - 16 && runner.offset < pickup.offset + 16;
}
export function absorbHit(powers: Powers): { powers: Powers; survives: boolean } {
  return { powers: { ...powers, shield: 0 }, survives: powers.shield > 0 };
}