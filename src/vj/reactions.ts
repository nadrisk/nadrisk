// Per-pad visual impulses: every pad owns a spot on a 4x4 screen map and spawns a gentle, decaying reaction by sound type.
import type { VjKind, VjPad } from "./bus";

export type ReactionKind = "ring" | "sweep" | "spark" | "wash" | "scan";
export type Impulse = { x: number; y: number; kind: ReactionKind; hue: number; age: number; life: number; radius: number; vel: number; seed: number };
export const MAX_IMPULSES = 32;

/** Fixed normalised origin (0..1) for a pad index on a 4x4 map. */
export function padOrigin(index: number): [number, number] {
  const i = ((Math.floor(index) % 16) + 16) % 16;
  return [((i % 4) + .5) / 4, (Math.floor(i / 4) + .5) / 4];
}

export function reactionKind(kind: VjKind, engine = ""): ReactionKind {
  if (engine === "sampler") return "scan";
  if (kind === "kick" || engine === "808") return "ring";
  if (kind === "snare") return "sweep";
  if (kind === "hat" || kind === "open" || kind === "perc") return "spark";
  return "wash";
}

const BASE_LIFE: Record<ReactionKind, number> = { ring: 1.6, sweep: 1.1, spark: .9, wash: 3.2, scan: 1.4 };

export class ReactionPool {
  items: Impulse[] = [];
  push(kind: VjKind, vel: number, pad?: VjPad) {
    const k = reactionKind(kind, pad?.engine);
    const [x, y] = padOrigin(pad?.index ?? 0);
    const tail = Math.max(0, ...(pad?.fx ?? []).filter(f => /rev|room|verb|del|dly|echo|tape/i.test(f.type)).map(f => Math.min(1, f.mix)));
    const cut = pad?.cut;
    const bright = Number.isFinite(cut) ? Math.max(0, Math.min(1, Math.log2(Math.max(40, cut!) / 40) / 9)) : .7;
    const note = pad?.notes?.[0] ?? 60;
    this.items.push({ x, y, kind: k, hue: ((note % 12) / 12) * Math.PI * 2, age: 0, life: BASE_LIFE[k] * (1 + tail * 2), radius: .5 + bright, vel: Math.max(.2, Math.min(1, vel || 1)), seed: Math.random() * 1000 });
    if (this.items.length > MAX_IMPULSES) this.items.splice(0, this.items.length - MAX_IMPULSES);
  }
  step(dt: number) {
    for (const i of this.items) i.age += dt;
    this.items = this.items.filter(i => i.age < i.life);
  }
  clear() { this.items = []; }
}

/** Light (0..~1) and hue shift added at normalised point (u,v); aspect = W/H. */
export function sampleReactions(items: Impulse[], u: number, v: number, aspect: number, out: { light: number; hue: number }) {
  let light = 0, hue = 0;
  for (const i of items) {
    const p = i.age / i.life, fade = (1 - p) * (1 - p) * i.vel;
    const dx = (u - i.x) * aspect, dy = v - i.y;
    let e = 0;
    if (i.kind === "ring") { const d = Math.hypot(dx, dy), r = p * .9 * i.radius, w = .05 + p * .08; e = Math.exp(-((d - r) ** 2) / (w * w)) + Math.exp(-(d * d) / (.04 * i.radius)) * (1 - p) * .6; }
    else if (i.kind === "sweep") { const yy = i.y + (p - .5) * .6; e = Math.exp(-((v - yy) ** 2) / .004) * .9; }
    else if (i.kind === "spark") { const d2 = dx * dx + dy * dy; if (d2 < .05 * i.radius) { const h = Math.sin(u * 913.1 + v * 517.7 + i.seed + Math.floor(i.age * 12)) * 43758.5; e = (h - Math.floor(h)) > .93 ? 1.2 : 0; } }
    else if (i.kind === "wash") { const d2 = dx * dx + dy * dy; e = Math.exp(-d2 / (.12 * i.radius)) * .55 * Math.sin(Math.PI * Math.min(1, p * 3)); hue += e * fade * Math.sin(i.hue) * 1.5; }
    else { const band = Math.abs(v - i.y) < .25 * i.radius ? 1 : 0; e = band * (Math.sin(v * 180 + i.age * 30) > .6 ? .7 : 0); }
    light += e * fade;
  }
  out.light = Math.min(1.2, light); out.hue = hue;
  return out;
}
