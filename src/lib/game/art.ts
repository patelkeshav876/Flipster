import { GRAVITY, JUMP_V, PLAYER_H, TRACK_H, type Obstacle, type Runner } from "./physics";
import type { Pickup, Powers } from "./powers";

// Anchor registration for the 16 frames in the new 1024x1024 character sprite sheet
// ax: horizontal body anchor; ay: vertical ground-contact foot baseline
const FRAME_ANCHORS: { ax: number; ay: number }[] = [
  /*  0 */ { ax: 111.50, ay: 208.00 },
  /*  1 */ { ax: 111.50, ay: 208.00 },
  /*  2 */ { ax: 113.00, ay: 208.00 },
  /*  3 */ { ax: 111.50, ay: 208.00 },
  /*  4 */ { ax: 111.50, ay: 208.00 },
  /*  5 */ { ax: 111.50, ay: 208.00 },
  /*  6 */ { ax: 111.50, ay: 208.00 },
  /*  7 */ { ax: 111.50, ay: 208.00 },
  /*  8 */ { ax: 111.50, ay: 210.00 },
  /*  9 */ { ax: 112.50, ay: 198.00 },
  /* 10 */ { ax: 112.50, ay: 200.00 },
  /* 11 */ { ax: 112.50, ay: 198.00 },
  /* 12 */ { ax: 111.50, ay: 210.00 },
  /* 13 */ { ax: 111.50, ay: 203.00 },
  /* 14 */ { ax: 111.50, ay: 208.00 },
  /* 15 */ { ax: 111.50, ay: 203.00 },
];

// 8-frame smooth alternating sprint cycle
const RUN_CYCLE_FRAMES = [0, 1, 2, 3, 4, 5, 6, 7];

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
      // 6-bladed steel circular saw / fuma shuriken rotating on the track line
      c.translate(o.w / 2, 0);
      c.rotate(time * 6.5);
      const r = o.w / 2;
      for (let i = 0; i < 6; i++) {
        c.save();
        c.rotate((i * Math.PI) / 3);
        c.beginPath();
        c.moveTo(0, 0);
        c.quadraticCurveTo(r * 0.45, -r * 0.22, r * 0.95, -r * 0.32);
        c.quadraticCurveTo(r * 0.55, -r * 0.85, r * 0.15, -r * 0.65);
        c.closePath();
        c.fillStyle = "#64748b";
        c.fill();
        c.strokeStyle = "#1e293b";
        c.lineWidth = 1.2;
        c.stroke();

        // Silver blade edge glint
        c.beginPath();
        c.moveTo(r * 0.95, -r * 0.32);
        c.quadraticCurveTo(r * 0.55, -r * 0.85, r * 0.15, -r * 0.65);
        c.strokeStyle = "#e2e8f0";
        c.lineWidth = 1.4;
        c.stroke();
        c.restore();
      }
      // Metal hub
      c.beginPath();
      c.arc(0, 0, r * 0.32, 0, Math.PI * 2);
      c.fillStyle = "#475569";
      c.fill();
      c.strokeStyle = "#0f172a";
      c.lineWidth = 1.5;
      c.stroke();
      c.beginPath();
      c.arc(0, 0, r * 0.12, 0, Math.PI * 2);
      c.fillStyle = "#d97706";
      c.fill();
    } else if (kind === "mace") {
      // Horizontal mounting bar extending from the track, holding heavy spiked iron ball
      const r = o.w / 2;
      const cy = -o.h + r;
      c.fillStyle = "#334155";
      c.fillRect(0, -5, r * 1.2, 10);
      c.strokeStyle = "#0f172a";
      c.lineWidth = 1.5;
      c.strokeRect(0, -5, r * 1.2, 10);
      c.fillStyle = "#64748b";
      c.fillRect(4, -7, 5, 14);
      c.strokeRect(4, -7, 5, 14);
      c.fillRect(r * 0.75, -7, 5, 14);
      c.strokeRect(r * 0.75, -7, 5, 14);

      // Connecting arm
      c.strokeStyle = "#475569";
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(r * 0.6, 0);
      c.lineTo(r, cy);
      c.stroke();

      // Radiating perimeter conical spikes around ball (14 spikes)
      const numSpikes = 14;
      const ballR = r * 0.76;
      for (let i = 0; i < numSpikes; i++) {
        c.save();
        c.translate(r, cy);
        c.rotate((i * Math.PI * 2) / numSpikes);
        c.beginPath();
        c.moveTo(-3, -ballR);
        c.lineTo(0, -ballR - 8);
        c.lineTo(3, -ballR);
        c.closePath();
        c.fillStyle = "#e2e8f0";
        c.fill();
        c.strokeStyle = "#1e293b";
        c.lineWidth = 1;
        c.stroke();
        c.restore();
      }

      // Spherical iron ball
      c.beginPath();
      c.arc(r, cy, ballR, 0, Math.PI * 2);
      c.fillStyle = "#475569";
      c.fill();
      c.strokeStyle = "#0f172a";
      c.lineWidth = 2;
      c.stroke();

      // Specular highlight
      c.beginPath();
      c.arc(r - ballR * 0.28, cy - ballR * 0.28, ballR * 0.4, 0, Math.PI * 2);
      c.fillStyle = "rgba(226, 232, 240, 0.28)";
      c.fill();

      // Front spikes on ball surface
      for (const [dx, dy] of [[-7, -6], [6, -8], [9, 4], [-6, 6], [0, 1]] as [number, number][]) {
        c.beginPath();
        c.moveTo(r + dx - 3, cy + dy + 3);
        c.lineTo(r + dx, cy + dy - 5);
        c.lineTo(r + dx + 3, cy + dy + 2);
        c.closePath();
        c.fillStyle = "#f8fafc";
        c.fill();
        c.strokeStyle = "#1e293b";
        c.lineWidth = 0.8;
        c.stroke();
      }
    } else if (kind === "laser") {
      c.fillStyle = this.color("scarf"); c.fillRect(o.w / 2 - 5, -o.h, 10, o.h);
      c.fillStyle = this.color("wood-light"); c.fillRect(o.w / 2 - 2.5, -o.h, 5, o.h);
      c.fillStyle = this.color("eye"); c.fillRect(o.w / 2 - 1, -o.h, 2, o.h);
      this.polygon([[-5, -o.h + 12], [0, -o.h - 3], [o.w, -o.h - 3], [o.w + 5, -o.h + 12], [o.w - 1, -o.h + 21], [2, -o.h + 21]], "metal", "metal-dark", 2);
      c.fillStyle = this.color("scarf"); c.fillRect(1, -o.h + 4, o.w - 2, 4);
      for (const dx of [2, o.w / 2, o.w - 2]) this.polygon([[dx - 4, -o.h + 11], [dx, -o.h + 27], [dx + 4, -o.h + 11]], "metal-light", "metal-dark");
    } else if (kind === "column") {
      const middle = o.w / 2;
      const capH = 14;

      // 1. Sharp white triangular spikes along both flanks
      for (let y = -o.h + capH + 2; y <= -capH - 2; y += 9) {
        // Left spike
        c.beginPath();
        c.moveTo(0, y - 3);
        c.lineTo(-6, y);
        c.lineTo(0, y + 3);
        c.closePath();
        c.fillStyle = "#f8fafc";
        c.fill();
        c.strokeStyle = "#1e293b";
        c.lineWidth = 0.9;
        c.stroke();

        // Right spike
        c.beginPath();
        c.moveTo(o.w, y - 3);
        c.lineTo(o.w + 6, y);
        c.lineTo(o.w, y + 3);
        c.closePath();
        c.fillStyle = "#f8fafc";
        c.fill();
        c.strokeStyle = "#1e293b";
        c.lineWidth = 0.9;
        c.stroke();

        // Front face spike facet
        const fx = middle + ((Math.floor(y) % 2 === 0) ? -2 : 2);
        c.beginPath();
        c.moveTo(fx - 2.5, y + 2);
        c.lineTo(fx, y - 3.5);
        c.lineTo(fx + 2.5, y + 2);
        c.closePath();
        c.fillStyle = "#f1f5f9";
        c.fill();
        c.strokeStyle = "#0f172a";
        c.lineWidth = 0.8;
        c.stroke();
      }

      // 2. Main wooden shaft (dark brown cylinder with vertical grain)
      c.fillStyle = "#78350f";
      c.fillRect(0, -o.h + capH, o.w, o.h - 2 * capH);
      c.strokeStyle = "#451a03";
      c.lineWidth = 1.5;
      c.strokeRect(0, -o.h + capH, o.w, o.h - 2 * capH);
      // Wood grain highlight
      c.fillStyle = "#92400e";
      c.fillRect(middle - 2, -o.h + capH, 4, o.h - 2 * capH);

      // 3. Top pointed wooden cap
      c.beginPath();
      c.moveTo(0, -o.h + capH);
      c.lineTo(middle, -o.h);
      c.lineTo(o.w, -o.h + capH);
      c.closePath();
      c.fillStyle = "#d97706";
      c.fill();
      c.strokeStyle = "#78350f";
      c.lineWidth = 1.5;
      c.stroke();
      c.beginPath();
      c.moveTo(middle, -o.h);
      c.lineTo(o.w, -o.h + capH);
      c.lineTo(middle, -o.h + capH);
      c.closePath();
      c.fillStyle = "#b45309";
      c.fill();

      // 4. Bottom pointed wooden cap
      c.beginPath();
      c.moveTo(0, -capH);
      c.lineTo(middle, 0);
      c.lineTo(o.w, -capH);
      c.closePath();
      c.fillStyle = "#d97706";
      c.fill();
      c.strokeStyle = "#78350f";
      c.lineWidth = 1.5;
      c.stroke();
      c.beginPath();
      c.moveTo(middle, 0);
      c.lineTo(o.w, -capH);
      c.lineTo(middle, -capH);
      c.closePath();
      c.fillStyle = "#b45309";
      c.fill();

      // Full-lane obstacle warning beacon
      if (o.h > 80) {
        const beaconAlpha = 0.6 + Math.abs(Math.sin(time * 6)) * 0.4;
        c.save();
        c.fillStyle = `rgba(239, 68, 68, ${beaconAlpha})`;
        c.shadowColor = "#ef4444";
        c.shadowBlur = 10;
        c.beginPath();
        c.arc(middle, -o.h - 5, 4.5, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    } else {
      // 3D Red Cone Spike with light/shadow facets matching YouTube video
      const middle = o.w / 2;
      // Left face (bright vivid red)
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(middle, -o.h);
      c.lineTo(middle, 0);
      c.closePath();
      c.fillStyle = "#ef4444";
      c.fill();

      // Right face (dark crimson shadow)
      c.beginPath();
      c.moveTo(middle, 0);
      c.lineTo(middle, -o.h);
      c.lineTo(o.w, 0);
      c.closePath();
      c.fillStyle = "#991b1b";
      c.fill();

      // Clean dark silhouette outline
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(middle, -o.h);
      c.lineTo(o.w, 0);
      c.closePath();
      c.strokeStyle = "#450a0a";
      c.lineWidth = 1.2;
      c.stroke();
    }
    c.restore();
  }
  pickup(p: Pickup, x: number, ground: number, time: number) {
    const c = this.ctx;
    c.save();
    c.translate(x, (p.side === 1 ? ground : ground + TRACK_H) - p.side * p.offset);
    const pulse = 1 + Math.sin(time * 5) * 0.08;
    c.scale(pulse, pulse);

    if (p.kind === "star") {
      c.rotate(time * 1.6);
      const drawStarPath = (spikes = 5, outerR = 12, innerR = 5.5) => {
        let rot = (Math.PI / 2) * 3;
        const step = Math.PI / spikes;
        c.beginPath();
        c.moveTo(0, -outerR);
        for (let i = 0; i < spikes; i++) {
          c.lineTo(Math.cos(rot) * outerR, Math.sin(rot) * outerR);
          rot += step;
          c.lineTo(Math.cos(rot) * innerR, Math.sin(rot) * innerR);
          rot += step;
        }
        c.closePath();
      };

      // Glowing outer halo
      c.save();
      c.shadowColor = "#38bdf8";
      c.shadowBlur = 14;
      c.fillStyle = "#0284c7";
      drawStarPath(5, 14, 6.5);
      c.fill();
      c.restore();

      // Main cyan star body
      c.fillStyle = "#38bdf8";
      c.strokeStyle = "#bae6fd";
      c.lineWidth = 1.6;
      drawStarPath(5, 12, 5.5);
      c.fill();
      c.stroke();

      // Shiny core
      c.fillStyle = "#ffffff";
      drawStarPath(5, 5, 2.2);
      c.fill();
    } else {
      this.circle(0, 0, 14, "metal-light", "eye", 1.5);
      this.circle(0, 0, 11, "power", "power-light", 1.5);
      if (p.kind === "shield") this.polygon([[-6, -6], [0, -4], [6, -6], [6, 1], [3, 6], [0, 8], [-3, 6], [-6, 1]], "eye");
      else for (const dx of [-5, 1]) this.polygon([[dx - 3, -7], [dx + 4, 0], [dx - 3, 7], [dx, 7], [dx + 7, 0], [dx, -7]], "eye");
    }
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
      const frame = dead ? 15 : runner.grounded ? RUN_CYCLE_FRAMES[frameIndex] : rising ? 9 : 10;

      const frameX = (frame % 4) * 256;
      const frameY = Math.floor(frame / 4) * 256;
      const anchor = FRAME_ANCHORS[frame] ?? { ax: 111.5, ay: 208 };

      // Subtle, rhythmic body bounce synchronized with running contact phases
      const bounce = runner.grounded
        ? -Math.abs(Math.sin((cycleProgress / RUN_CYCLE_FRAMES.length) * 2 * Math.PI)) * 0.8
        : 0;

      const scale = 0.285;
      const targetAnchorX = 8.5;
      const targetAnchorY = 25.64;

      const destX = targetAnchorX - anchor.ax * scale;
      const destY = targetAnchorY + bounce - anchor.ay * scale;
      const destW = 256 * scale;
      const destH = 256 * scale;

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