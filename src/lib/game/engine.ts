import { mulberry32 } from "./prng";
import { TRACK_H, jumpRunner, flipRunner, stepRunner, hitsObstacle, type Runner, type Obstacle } from "./physics";
import { obstacleKindsAt, obstacleGap, FIRST_PICKUP_X, pickupGap } from "./course";
import { GameArt } from "./art";
import { absorbHit, collectPower, tickPowers, touchesPickup, SPEED_MULTIPLIER, type Powers, type Pickup } from "./powers";

const PLAYER_X = 70;
const START_SPEED = 230;
const SPEED_GAIN = 5.5;
const MAX_SPEED = 560;
export type EngineState = { score: number; alive: boolean; speed: number; powers: Powers };
export type EngineOptions = { canvas: HTMLCanvasElement; seed: number; onUpdate: (state: EngineState) => void; onDeath: (score: number) => void };

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rand: () => number;
  private onUpdate: EngineOptions["onUpdate"];
  private onDeath: EngineOptions["onDeath"];
  private raf = 0;
  private last = 0;
  private acc = 0;
  private running = false;
  private time = 0;
  private distance = 0;
  private speed = START_SPEED;
  private groundY = 320;
  private vh = 400;
  private runner: Runner = { side: 1, offset: 0, velocity: 0, grounded: true };
  private jumpBuffer = 0;
  private obstacles: Obstacle[] = [];
  private nextSpawnX = 620;
  private alive = true;
  private score = 0;
  private scale = 1;
  private vw = 420;
  private colors: Record<string, string> = {};
  private art: GameArt;
  private powerRand: () => number;
  private pickups: Pickup[] = [];
  private nextPickupX = FIRST_PICKUP_X;
  private powers: Powers = { shield: 0, speed: 0 };
  private paused = false;

  constructor(opts: EngineOptions) {
    this.canvas = opts.canvas;
    const ctx = opts.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
    this.rand = mulberry32(opts.seed);
    this.powerRand = mulberry32(opts.seed ^ 0x5f3759df);
    this.onUpdate = opts.onUpdate;
    this.onDeath = opts.onDeath;
    const css = getComputedStyle(opts.canvas);
    for (const token of ["sky", "cloud", "mountain", "mountain-light", "hill", "grass", "soil", "tree", "house", "roof", "ninja", "eye", "spike", "wood", "wood-light", "metal", "metal-light", "metal-dark", "scarf", "power", "power-light", "energy", "energy-edge", "shield", "water"]) {
      this.colors[token] = css.getPropertyValue(`--game-${token}`).trim();
    }
    this.art = new GameArt(ctx, this.colors);
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(rect.width, 1), h = Math.max(rect.height, 1);
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.vw = Math.max(420, w / h * 400);
    this.scale = this.canvas.width / this.vw;
    this.vh = this.canvas.height / this.scale;
    this.groundY = this.vh * 0.45;
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.loop(this.last);
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  setPaused(paused: boolean) { this.paused = paused; this.acc = 0; this.last = performance.now(); }
  jump() {
    if (!this.alive || this.paused) return;
    if (this.runner.grounded) this.runner = jumpRunner(this.runner);
    else this.jumpBuffer = 0.12;
  }
  flip() {
    if (!this.alive || this.paused) return;
    this.runner = flipRunner(this.runner);
    this.jumpBuffer = 0;
  }
  private spawn() {
    // A fixed lookahead and position-based speed keep the shared course identical on all screens.
    while (this.nextSpawnX < this.distance + 2000) {
      const kinds = obstacleKindsAt(this.nextSpawnX);
      const kind = kinds[Math.floor(this.rand() * kinds.length)] ?? "spike";
      const tall = kind === "column" || kind === "laser";
      const side = this.rand() > 0.5 ? 1 : -1;
      const h = kind === "column" ? 88 : kind === "laser" ? 140 : kind === "mace" ? 65 : kind === "blade" ? 20 : 18;
      const w = kind === "column" ? 14 : kind === "laser" ? 23 : kind === "mace" ? 48 : kind === "blade" ? 40 : 14;
      this.obstacles.push({ x: this.nextSpawnX, w, h, side, tall, kind });
      this.nextSpawnX += obstacleGap(this.nextSpawnX, this.rand());
    }
    while (this.nextPickupX < this.distance + 2000) {
      this.pickups.push({ x: this.nextPickupX, side: this.powerRand() > .5 ? 1 : -1, offset: 22, kind: this.powerRand() > .5 ? "shield" : "speed" });
      this.nextPickupX += pickupGap(this.powerRand());
    }
  }
  private step(dt: number) {
    this.time += dt;
    this.powers = tickPowers(this.powers, dt);
    this.speed = Math.min(MAX_SPEED, START_SPEED + SPEED_GAIN * this.time) * (this.powers.speed > 0 ? SPEED_MULTIPLIER : 1);
    this.distance += this.speed * dt;
    this.score = Math.floor(this.distance / 10);
    if (this.jumpBuffer > 0) {
      this.jumpBuffer -= dt;
      if (this.runner.grounded) { this.runner = jumpRunner(this.runner); this.jumpBuffer = 0; }
    }
    this.runner = stepRunner(this.runner, dt);
    this.spawn();
    this.pickups = this.pickups.filter(pickup => {
      if (touchesPickup(this.runner, this.distance + PLAYER_X, pickup)) {
        this.powers = collectPower(this.powers, pickup.kind); return false;
      }
      return pickup.x > this.distance - 100;
    });
    this.obstacles = this.obstacles.filter(o => o.x + o.w > this.distance - 100);
    for (const obstacle of this.obstacles) {
      if (hitsObstacle(this.runner, this.distance + PLAYER_X, obstacle)) {
        const hit = absorbHit(this.powers);
        if (hit.survives) {
          this.powers = hit.powers;
          this.obstacles = this.obstacles.filter(item => item !== obstacle);
          break;
        }
        this.alive = false;
        this.stop();
        this.onDeath(this.score);
        break;
      }
    }
  }
  private polygon(points: [number, number][], color: string) {
    const { ctx } = this;
    ctx.fillStyle = this.colors[color] ?? this.colors["ninja"] ?? "transparent";
    ctx.beginPath();
    points.forEach(([x,y], i) => i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y));
    ctx.closePath(); ctx.fill();
  }
  private draw() {
    const { ctx, vw, vh, groundY, colors } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = colors["sky"] ?? "transparent";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    // Small, crisp clouds drift at different depths above and below the track.
    ctx.fillStyle = colors["cloud"] ?? "transparent";
    for (let i = -1; i < vw / 180 + 2; i++) {
      const x = i * 180 - (this.distance * 0.08 % 180);
      for (const y of [vh * 0.17 + (i % 3) * 24, vh * 0.72 - (i % 2) * 30]) {
        ctx.beginPath(); ctx.ellipse(x + 30, y, 26, 3, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 25, y - 4, 7, 7, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 35, y - 2, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    const off = this.distance * 0.15 % 260;
    for (let i = -1; i < vw / 260 + 2; i++) {
      const x = i * 260 - off;
      this.polygon([[x,vh-16],[x+40,vh-50],[x+62,vh-42],[x+87,vh-83],[x+112,vh-52],[x+147,vh-92],[x+171,vh-39],[x+201,vh-69],[x+260,vh-16]], "mountain");
      this.polygon([[x+87,vh-83],[x+94,vh-54],[x+112,vh-52]], "mountain-light");
      this.polygon([[x+147,vh-92],[x+151,vh-53],[x+171,vh-39]], "mountain-light");
      this.polygon([[x-20,vh],[x+25,vh-30],[x+92,vh-18],[x+135,vh-40],[x+220,vh-15],[x+285,vh]], "hill");
      for (const tx of [x+41, x+56]) {
        ctx.fillStyle = colors["soil"] ?? "transparent"; ctx.fillRect(tx-1,vh-33,3,19);
        this.polygon([[tx-9,vh-25],[tx,vh-65],[tx+9,vh-25]], "tree");
      }
      ctx.fillStyle = colors["house"] ?? "transparent"; ctx.fillRect(x+191,vh-27,22,15);
      this.polygon([[x+187,vh-27],[x+202,vh-37],[x+217,vh-27]], "roof");
      ctx.fillStyle = colors["tree"] ?? "transparent"; ctx.fillRect(x+200,vh-22,5,10);
    }
    ctx.fillStyle = colors["water"] ?? "transparent"; ctx.fillRect(0, vh-12, vw,12);
    ctx.fillStyle = colors["energy"] ?? "transparent"; ctx.fillRect(0, vh-12, vw,2);
    ctx.fillStyle = colors["cloud"] ?? "transparent";
    for (let x = -(this.distance * .3 % 90); x < vw; x += 90) ctx.fillRect(x, vh-6, 19, 1);
    ctx.fillStyle = colors["soil"] ?? "transparent"; ctx.fillRect(0, groundY, vw, TRACK_H);
    ctx.fillStyle = colors["grass"] ?? "transparent"; ctx.fillRect(0, groundY-2, vw,3); ctx.fillRect(0, groundY+TRACK_H-1,vw,2);
    ctx.fillStyle = colors["wood-light"] ?? "transparent";
    for (let x = -(this.distance % 18); x < vw; x += 18) {
      this.polygon([[x,groundY+3],[x+4,groundY+1],[x+12,groundY+2],[x+17,groundY+5],[x+13,groundY+7],[x+5,groundY+6]], "wood");
      ctx.fillRect(x+4, groundY+2, 7, 1);
    }
    for (const o of this.obstacles) {
      const x = o.x - this.distance;
      if (x > vw + 40 || x + o.w < -40) continue;
      this.art.obstacle(o, x, groundY, this.time);
    }
    for (const pickup of this.pickups) {
      const x = pickup.x - this.distance;
      if (x > -30 && x < vw + 30) this.art.pickup(pickup, x, groundY, this.time);
    }
    const anchor = this.runner.side === 1 ? groundY : groundY + TRACK_H;
    this.art.ninja(PLAYER_X, anchor, this.runner, this.powers, this.time, !this.alive);
  }
  private loop = (now: number) => {
    if (!this.running) return;
    this.acc += this.paused ? 0 : Math.min((now-this.last)/1000,0.25); this.last = now;
    const fixed = 1/120;
    while (this.acc >= fixed) { this.step(fixed); this.acc -= fixed; if (!this.alive) break; }
    this.draw(); this.onUpdate({score:this.score, alive:this.alive,speed:this.speed, powers: this.powers});
    if (this.alive) this.raf = requestAnimationFrame(this.loop);
  };
}
