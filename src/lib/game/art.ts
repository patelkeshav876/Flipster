import { GRAVITY, JUMP_V, PLAYER_H, TRACK_H, type Obstacle, type Runner } from "./physics";
import type { Pickup, Powers } from "./powers";

// Anchor registration for the 16 frames in the 1024x1024 character sprite sheet.
// ax: horizontal upper-body anchor to eliminate horizontal drift/sliding across columns.
// ay: vertical ground-contact foot baseline to eliminate vertical jumps across rows.
const FRAME_ANCHORS: { ax: number; ay: number }[] = [
  /*  0 */ { ax: 166.98, ay: 236.00 },
  /*  1 */ { ax: 158.67, ay: 235.00 },
  /*  2 */ { ax: 146.77, ay: 228.00 },
  /*  3 */ { ax: 129.05, ay: 238.00 },
  /*  4 */ { ax: 165.48, ay: 225.00 },
  /*  5 */ { ax: 155.94, ay: 216.00 },
  /*  6 */ { ax: 144.99, ay: 214.00 },
  /*  7 */ { ax: 133.91, ay: 231.00 },
  /*  8 */ { ax: 164.32, ay: 219.00 },
  /*  9 */ { ax: 154.64, ay: 221.00 },
  /* 10 */ { ax: 144.44, ay: 219.00 },
  /* 11 */ { ax: 134.81, ay: 218.00 },
  /* 12 */ { ax: 163.85, ay: 203.00 },
  /* 13 */ { ax: 155.74, ay: 207.00 },
  /* 14 */ { ax: 146.82, ay: 207.00 },
  /* 15 */ { ax: 134.89, ay: 205.00 },
];

// Balanced 8-frame alternating running cycle:
// Stride 1 (Right): 4 (reach) -> 8 (strike/plant) -> 5 (drive) -> 6 (pass)
// Stride 2 (Left):  7 (reach) -> 9 (strike/plant) -> 10 (drive) -> 1 (pass)
const RUN_CYCLE_FRAMES = [4, 8, 5, 6, 7, 9, 10, 1];

export class GameArt {
  private runnerImage = new Image();
  constructor(private ctx: CanvasRenderingContext2D, private colors: Record<string, string>) {
    this.runnerImage.src = "/flipster-runner.png";
  }
  color(token: string) { return this.colors[token] ?? "transparent"; }
  polygon(points: [number, number][], fill: string, stroke?: string, width = 1.5) {
    const c = this.ctx;
    c.beginPath();
    points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.closePath(); c.fillStyle = this.color(fill); c.fill();
    if (stroke) { c.strokeStyle = this.color(stroke); c.lineWidth = width; c.stroke(); }
  }
  circle(x: number, y: number, r: number, fill: string, stroke?: string, width = 1.5) {
    const c = this.ctx;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = this.color(fill); c.fill();
    if (stroke) { c.strokeStyle = this.color(stroke); c.lineWidth = width; c.stroke(); }
  }
  obstacle(o: Obstacle, x: number, ground: number, time: number) {
    const c = this.ctx;
    c.save(); c.translate(x, o.side === 1 ? ground : ground + TRACK_H); c.scale(1, o.side);
    const kind = o.kind ?? (o.tall ? "column" : "spike");
    if (kind === "blade") {
      c.translate(o.w / 2, 0); c.rotate(time * 3.2);
      const r = o.w / 2;
      for (let i = 0; i < 6; i++) {
        c.save(); c.rotate(i * Math.PI / 3);
        this.polygon([[3, -5], [r * .48, -r * .82], [r * .93, -r * .58], [r, -r * .27], [r * .64, -r * .38], [r * .5, -3], [6, 9]], "metal", "metal-dark", 1.8);
        c.strokeStyle = this.color("metal-light"); c.lineWidth = 1;
        c.beginPath(); c.moveTo(r * .47, -r * .67); c.lineTo(r * .78, -r * .52); c.stroke(); c.restore();
      }
      this.circle(0, 0, 9, "metal", "metal-dark"); this.circle(0, 0, 3.5, "wood-light", "metal-dark");
    } else if (kind === "mace") {
      const r = o.w / 2, cy = -o.h + r;
      // A linked diagonal chain from the track to the ball.
      c.strokeStyle = this.color("metal-dark"); c.lineWidth = 5;
      c.beginPath(); c.moveTo(r, cy); c.lineTo(r - 55, -8); c.stroke();
      for (let i = 0; i < 7; i++) {
        const t = i / 7;
        c.save(); c.translate(r - t * 55, cy + t * (-8 - cy)); c.rotate(.55);
        c.strokeStyle = this.color("metal-light"); c.lineWidth = 2;
        c.strokeRect(-3, -5, 6, 10); c.restore();
      }
      c.fillStyle = this.color("metal"); c.fillRect(r - 62, -13, 14, 10);
      c.strokeStyle = this.color("metal-dark"); c.lineWidth = 2; c.strokeRect(r - 62, -13, 14, 10);
      for (let i = 0; i < 16; i++) {
        c.save(); c.translate(r, cy); c.rotate(i * Math.PI / 8);
        this.polygon([[-3, -r + 5], [0, -r], [3, -r + 5]], "metal-light", "metal-dark"); c.restore();
      }
      this.circle(r, cy, r - 2, "metal", "metal-dark", 2);
      for (const [dx, dy] of [[-8, -8], [6, -10], [12, 2], [-7, 7], [3, 10], [0, 0]] as [number, number][])
        this.polygon([[r + dx - 3, cy + dy + 3], [r + dx, cy + dy - 6], [r + dx + 4, cy + dy + 2]], "metal-light", "metal-dark", .8);
    } else if (kind === "laser") {
      c.fillStyle = this.color("scarf"); c.fillRect(o.w / 2 - 5, -o.h, 10, o.h);
      c.fillStyle = this.color("wood-light"); c.fillRect(o.w / 2 - 2.5, -o.h, 5, o.h);
      c.fillStyle = this.color("eye"); c.fillRect(o.w / 2 - 1, -o.h, 2, o.h);
      this.polygon([[-5, -o.h + 12], [0, -o.h - 3], [o.w, -o.h - 3], [o.w + 5, -o.h + 12], [o.w - 1, -o.h + 21], [2, -o.h + 21]], "metal", "metal-dark", 2);
      c.fillStyle = this.color("scarf"); c.fillRect(1, -o.h + 4, o.w - 2, 4);
      for (const dx of [2, o.w / 2, o.w - 2]) this.polygon([[dx - 4, -o.h + 11], [dx, -o.h + 27], [dx + 4, -o.h + 11]], "metal-light", "metal-dark");
    } else if (kind === "column") {
      const middle = o.w / 2;
      const points: [number, number][] = [[middle, -o.h], [o.w - 3, -o.h + 22]];
      for (let y = -o.h + 24; y < -20; y += 10) points.push([o.w + 3, y], [o.w - 2, y + 4]);
      points.push([middle, 0], [3, -20]);
      for (let y = -24; y > -o.h + 22; y -= 10) points.push([-3, y], [3, y - 4]);
      this.polygon(points, "wood", "spike", 2);
      this.polygon([[middle, -o.h + 5], [o.w - 4, -o.h + 22], [4, -o.h + 22]], "wood-light");
      for (let y = -o.h + 32; y < -18; y += 13) {
        this.polygon([[4, y], [8, y - 5], [10, y + 3]], "wood-light");
        this.polygon([[o.w - 4, y + 5], [o.w - 8, y], [o.w - 10, y + 8]], "eye");
      }
    } else {
      this.polygon([[0, 0], [o.w / 2, -o.h], [o.w, 0]], "spike", "scarf", 1.5);
      this.polygon([[o.w / 2, -o.h + 3], [o.w / 2, -2], [o.w - 2, -2]], "scarf");
      this.polygon([[2, -2], [o.w / 2 - 1, -o.h + 5], [o.w / 2 - 4, -2]], "wood-light");
    }
    c.restore();
  }
  pickup(p: Pickup, x: number, ground: number, time: number) {
    const c = this.ctx;
    c.save(); c.translate(x, (p.side === 1 ? ground : ground + TRACK_H) - p.side * p.offset);
    const pulse = 1 + Math.sin(time * 4) * .025; c.scale(pulse, pulse);
    this.circle(0, 0, 14, "metal-light", "eye", 1.5);
    this.circle(0, 0, 11, "power", "power-light", 1.5);
    if (p.kind === "shield") this.polygon([[-6, -6], [0, -4], [6, -6], [6, 1], [3, 6], [0, 8], [-3, 6], [-6, 1]], "eye");
    else for (const dx of [-5, 1]) this.polygon([[dx - 3, -7], [dx + 4, 0], [dx - 3, 7], [dx, 7], [dx + 7, 0], [dx, -7]], "eye");
    c.restore();
  }
  ninja(x: number, ground: number, runner: Runner, powers: Powers, time: number, dead = false) {
    const c = this.ctx;
    c.save(); c.translate(x, ground); c.scale(1, runner.side); c.translate(0, -PLAYER_H - runner.offset);
    const apex = JUMP_V * JUMP_V / (2 * GRAVITY);
    const airtime = Math.max(0, Math.min(1, runner.offset / apex));
    const rising = !runner.grounded && runner.velocity < 0;
    const jumpPhase = runner.grounded ? 0 : Math.max(0, Math.min(1,
      rising ? 1 + runner.velocity / JUMP_V : 1 - runner.velocity / JUMP_V,
    ));
    const tilt = dead ? 0.82 : runner.grounded ? 0 : rising ? -0.11 - airtime * 0.08 : 0.08 + airtime * 0.08;
    c.rotate(tilt);
    c.scale(.78, .78);
    if (powers.speed > 0) {
      this.polygon([[-1, 3], [-42, -8], [-26, 3], [-59, 8], [-29, 15], [-47, 27], [0, 24]], "energy", "energy-edge", 2);
      this.polygon([[0, 8], [-24, 4], [-15, 12], [-38, 16], [-13, 20], [0, 19]], "eye");
    }
    if (powers.shield > 0) {
      c.globalAlpha = .28; this.circle(8, 13, 25, "shield"); c.globalAlpha = 1;
      c.strokeStyle = this.color("energy"); c.lineWidth = 2; c.beginPath(); c.arc(8, 13, 25, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = this.color("eye"); c.beginPath(); c.arc(8, 13, 22, Math.PI, Math.PI * 1.45); c.stroke();
    }
    if (this.runnerImage.complete && this.runnerImage.naturalWidth >= 1024) {
      const runFps = powers.speed > 0 ? 15 : 12;
      const cycleProgress = time * runFps;
      const frameIndex = Math.floor(cycleProgress) % RUN_CYCLE_FRAMES.length;
      const frame = dead ? 8 : runner.grounded ? RUN_CYCLE_FRAMES[frameIndex] : rising ? 14 : 12;

      const frameX = (frame % 4) * 256;
      const frameY = Math.floor(frame / 4) * 256;
      const anchor = FRAME_ANCHORS[frame] ?? { ax: 150, ay: 225 };

      // Subtle, rhythmic body bounce synchronized with running contact phases
      const bounce = runner.grounded
        ? -Math.abs(Math.sin((cycleProgress / RUN_CYCLE_FRAMES.length) * 2 * Math.PI)) * 1.2
        : 0;

      const scale = 0.128;
      const targetAnchorX = 8.5;
      const targetAnchorY = 25.5;

      const destX = targetAnchorX - anchor.ax * scale;
      const destY = targetAnchorY + bounce - anchor.ay * scale;
      const destW = 256 * scale;
      const flightStretch = runner.grounded ? 1 : 1 + Math.sin(jumpPhase * Math.PI) * 0.08;
      const destH = 256 * scale * flightStretch;

      c.drawImage(
        this.runnerImage,
        frameX, frameY, 256, 256,
        destX, destY, destW, destH,
      );
      c.restore();
      return;
    }
    // A compact, forward-leaning hood flows into the runner's tapered torso.
    c.fillStyle = this.color("ninja"); c.beginPath();
    c.moveTo(2, 18); c.lineTo(2.8, 8); c.quadraticCurveTo(2.5, 3, 8, 1.5);
    c.quadraticCurveTo(14, -.5, 17.5, 3); c.quadraticCurveTo(19, 5, 18, 10);
    c.lineTo(17, 15); c.quadraticCurveTo(15.5, 18, 12, 19.5);
    c.lineTo(7, 20.5); c.lineTo(3, 20); c.closePath(); c.fill();
    // A crisp, forward-facing eye slit with a visible pupil, not a blank pale patch.
    c.fillStyle = this.color("eye"); c.beginPath(); c.moveTo(17.2, 5.1);
    c.quadraticCurveTo(11.2, 3.5, 8.7, 6.5);
    c.quadraticCurveTo(8.1, 7.1, 8.9, 8.1);
    c.quadraticCurveTo(11.9, 9.3, 16.8, 8.1);
    c.quadraticCurveTo(13.1, 7.7, 12.7, 6.8);
    c.quadraticCurveTo(13.7, 5.5, 17.2, 5.1); c.fill();
    c.fillStyle = this.color("ninja"); c.beginPath();
    c.ellipse(15.7, 6.8, 1.25, 1.45, -.12, 0, Math.PI * 2); c.fill();
    this.circle(16.15, 6.25, .42, "eye");
    const cycle = time * 13;
    const stride = Math.sin(cycle);
    type LegPose = { knee: [number, number]; ankle: [number, number]; toe: [number, number] };
    const blendPoint = (from: [number, number], to: [number, number], t: number): [number, number] => [
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t,
    ];
    const blendLeg = (from: LegPose, to: LegPose, t: number): LegPose => ({
      knee: blendPoint(from.knee, to.knee, t),
      ankle: blendPoint(from.ankle, to.ankle, t),
      toe: blendPoint(from.toe, to.toe, t),
    });
    const takeoffRear: LegPose = { knee: [3, 20], ankle: [-1, 23], toe: [-3, 24] };
    const takeoffLead: LegPose = { knee: [13, 20.5], ankle: [17, 22.5], toe: [20, 21.5] };
    const tuckRear: LegPose = { knee: [5, 21], ankle: [8, 19], toe: [6, 17] };
    const tuckLead: LegPose = { knee: [13, 20.5], ankle: [10, 18.5], toe: [13, 17] };
    const landingRear: LegPose = { knee: [4, 20], ankle: [1, 24], toe: [-1, 26] };
    const landingLead: LegPose = { knee: [13, 20], ankle: [17, 24], toe: [19, 26] };
    let rearLeg: LegPose, leadLeg: LegPose;
    if (runner.grounded) {
      rearLeg = {
        knee: [4 - stride * 1.8, 20.5 - Math.max(0, stride) * 1.5],
        ankle: [2 - stride * 3.1, 24 - Math.max(0, stride) * 2.1],
        toe: [-1 - stride * 3.8, 25 - Math.max(0, stride) * 2.7],
      };
      leadLeg = {
        knee: [12 + stride * 1.8, 20.5 - Math.max(0, -stride) * 1.5],
        ankle: [14 + stride * 3.1, 23.5 - Math.max(0, -stride) * 2.1],
        toe: [18 + stride * 3.8, 24.5 - Math.max(0, -stride) * 2.7],
      };
    } else {
      const easedPhase = jumpPhase * jumpPhase * (3 - 2 * jumpPhase);
      if (rising) {
        rearLeg = blendLeg(takeoffRear, tuckRear, easedPhase);
        leadLeg = blendLeg(takeoffLead, tuckLead, easedPhase);
      } else {
        const landingEase = 1 - easedPhase;
        rearLeg = blendLeg(tuckRear, landingRear, landingEase);
        leadLeg = blendLeg(tuckLead, landingLead, landingEase);
      }
    }
    const drawLeg = (hip: [number, number], pose: LegPose, width: number) => {
      const segment = (start: [number, number], end: [number, number], thickness: number) => {
        const dx = end[0] - start[0], dy = end[1] - start[1];
        const length = Math.max(Math.hypot(dx, dy), 1);
        return [-dy / length * thickness, dx / length * thickness] as [number, number];
      };
      const upper = segment(hip, pose.knee, width * .8);
      const lower = segment(pose.knee, pose.ankle, width * .58);
      this.polygon([
        [hip[0] - upper[0] * .55, hip[1] - upper[1] * .55],
        [pose.knee[0] - upper[0], pose.knee[1] - upper[1]],
        [pose.knee[0] + upper[0], pose.knee[1] + upper[1]],
        [hip[0] + upper[0] * .55, hip[1] + upper[1] * .55],
      ], "ninja");
      this.polygon([
        [pose.knee[0] - lower[0], pose.knee[1] - lower[1]],
        [pose.ankle[0] - lower[0] * .7, pose.ankle[1] - lower[1] * .7],
        [pose.toe[0], pose.toe[1]],
        [pose.ankle[0] + lower[0] * .7, pose.ankle[1] + lower[1] * .7],
        [pose.knee[0] + lower[0], pose.knee[1] + lower[1]],
      ], "ninja");
    };
    drawLeg([6, 18], rearLeg, 1.45);
    drawLeg([12, 18], leadLeg, 1.6);
    this.polygon([[1, 17], [17, 16.5], [17, 19], [1, 19.5]], "scarf");
    const flutter = Math.sin(time * 10) * (runner.grounded ? .8 : 1.5);
    this.polygon([[2, 17], [-7, 16 + flutter], [-4, 19.5], [1, 19], [-5, 24 + flutter], [2, 21]], "scarf");
    c.restore();
  }
}