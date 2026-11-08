// Four late-night 90s scenes as pure brightness fields (0..1). Slow, sparse, cozy; only four band inputs drive them.
import { makeNoise } from "../noise";

export type SceneIn = { t: number; kick: number; snare: number; hat: number; level: number; size: number; ring: number };
const noise = makeNoise(7);
const clamp = (v: number) => v < 0 ? 0 : v > 1 ? 1 : v;

/** AQUA: lava-lamp blob over calm crossing water lines; a kick sends one soft ring outward. */
export function aqua(x: number, y: number, s: SceneIn): number {
  const t = s.t * .25;
  const w = Math.sin(x * 9 + t * 1.3 + Math.sin(y * 4 + t) * .8) + Math.sin(y * 11 - t * 1.1 + Math.sin(x * 3 - t * .7) * .9);
  let f = Math.abs(w) < .16 ? .28 : Math.abs(w) < .3 ? .1 : 0;
  const r = Math.hypot(x, y);
  if (s.ring < 1) { const R = s.ring * 1.2; if (Math.abs(r - R) < .02 + .02 * (1 - s.ring)) f = Math.max(f, .55 * (1 - s.ring)); }
  const a = Math.atan2(y, x), bx = Math.sin(t * .7) * .12, by = Math.cos(t * .5) * .08;
  const br = (.26 + s.kick * .05 + s.level * .03) * s.size * (1 + .22 * noise.n3(Math.cos(a) * .9, Math.sin(a) * .9, t * .6) + .1 * Math.sin(a * 3 + t));
  const d = Math.hypot(x - bx, y - by) - br;
  if (d < 0) f = Math.max(f, .45 + .4 * clamp(-d / br * 1.6));
  else if (d < .012) f = 1;
  return f;
}

/** BLOBS: classic melting gradient metaballs, stepped into contour bands; kick pulls them together, hats shimmer edges. */
export function blobs(x: number, y: number, s: SceneIn): number {
  const t = s.t * .18, pull = 1 - s.kick * .35;
  let sum = 0;
  for (let i = 0; i < 5; i++) {
    const bx = Math.sin(t * (.7 + i * .13) + i * 1.7) * .45 * pull, by = Math.cos(t * (.5 + i * .11) + i * 2.3) * .3 * pull;
    const r = (.11 + .03 * Math.sin(t + i)) * s.size;
    sum += r * r / ((x - bx) ** 2 + (y - by) ** 2 + 1e-4);
  }
  const v = clamp(sum * .45), band = Math.floor(v * 6) / 6;
  const edge = Math.abs(v * 6 - Math.round(v * 6)) < .06 + s.hat * .1;
  return edge && v > .1 ? Math.min(1, band + .35) : band * .8;
}

/** TOTEM: radius of a shape morphing triangle -> square -> circle at angle a, for morph m in [0,3). */
export function totemRadius(a: number, m: number): number {
  const poly = (n: number) => { const k = 2 * Math.PI / n, q = ((a % k) + k) % k; return Math.cos(Math.PI / n) / Math.cos(q - Math.PI / n); };
  const p = ((m % 3) + 3) % 3, i = Math.floor(p), f = p - i, e = f * f * (3 - 2 * f);
  const shapes = [poly(3), poly(4), 1];
  return shapes[i] * (1 - e) + shapes[(i + 1) % 3] * e;
}
export function totemShape(x: number, y: number, s: SceneIn): number {
  const rot = s.t * .08 - Math.PI / 2, a = Math.atan2(y, x) - rot;
  const R = (.22 + s.kick * .06) * s.size * totemRadius(a, s.t * .07), r = Math.hypot(x, y);
  const w = .01 + (s.kick + s.snare) * .008;
  return Math.abs(r - R) < w ? 1 : r < R ? .06 : 0;
}

/** TOTEM smoke feedback: pull last frame toward the centre (endless tunnel), curl it with noise, decay, then add the outline. */
export function totemFeedback(prev: Float32Array, next: Float32Array, shape: Float32Array, W: number, H: number, t: number, hit: number) {
  const cx = W / 2, cy = H / 2, z = 1.035, decay = .955;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = noise.n3(x * .04, y * .04, t * .2) * 1.6, ny = noise.n3(x * .04 + 9, y * .04, t * .2) * 1.6;
    const sx = Math.round(cx + (x - cx) * z + nx), sy = Math.round(cy + (y - cy) * z + ny);
    const old = sx >= 0 && sy >= 0 && sx < W && sy < H ? prev[sy * W + sx] : 0;
    const i = y * W + x, sh = shape[i] >= 1 ? .35 + hit * .65 : 0;
    next[i] = Math.min(1, Math.max(old * decay, sh));
  }
}
