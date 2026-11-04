import type { XY } from "./xyMaps";

/** XY motion: a recorded hand path (one point per 1/16 step) and a synced LFO that moves the dot around it.
 *  Both are pure functions of the transport step, so the scheduler, held voices and the screen agree on the position. */
export type XYShape = "orbit" | "fig8" | "sinx" | "siny" | "square" | "sh";
export const XY_SHAPES: XYShape[] = ["orbit", "fig8", "sinx", "siny", "square", "sh"];
export const SHAPE_NAME: Record<XYShape, string> = { orbit: "ORBIT", fig8: "FIG8", sinx: "SINE X", siny: "SINE Y", square: "SQUARE", sh: "S&H" };
/** Synced LFO cycle lengths in 1/16 steps. */
export const LFO_RATES = [{ n: "1/16", s: 1 }, { n: "1/8", s: 2 }, { n: "1/4", s: 4 }, { n: "1/2", s: 8 }, { n: "1 BAR", s: 16 }, { n: "2 BAR", s: 32 }, { n: "4 BAR", s: 64 }];
export const REC_LENS = [16, 32, 64];
export type XYRec = { pts: [number, number][]; len: number; play: boolean };
export type XYLfo = { on: boolean; shape: XYShape; rate: number; depth: number; phase: number };
export const LFO_DEFAULT: XYLfo = { on: false, shape: "orbit", rate: 4, depth: .5, phase: 0 };

const cl = (v: number) => Math.max(-1, Math.min(1, v));
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };

/** Unit-size LFO offset for a shape at cycle phase p (0..1); `cyc` seeds S&H. */
export function shapeAt(shape: XYShape, p: number, cyc = 0): [number, number] {
  const a = p * Math.PI * 2;
  switch (shape) {
    case "orbit": return [Math.cos(a), Math.sin(a)];
    case "fig8": return [Math.sin(a), Math.sin(2 * a)];
    case "sinx": return [Math.sin(a), 0];
    case "siny": return [0, Math.sin(a)];
    case "square": return [p < .5 ? 1 : -1, (p + .25) % 1 < .5 ? 1 : -1];
    case "sh": { const seg = cyc * 4 + Math.floor(p * 4); return [hash(seg), hash(seg + 977)]; }
  }
}

export const motionOn = (xy?: XY) => !!xy && !xy.held && (!!(xy.rec?.play && xy.rec.pts.length) || !!(xy.lfo?.on && xy.lfo.depth > 0));

/** Recorded path position at step (linear between steps, wrapping the loop). */
export function recAt(rec: XYRec, step: number): [number, number] {
  const n = rec.pts.length, f = ((step % n) + n) % n, i = Math.floor(f), t = f - i, a = rec.pts[i], b = rec.pts[(i + 1) % n];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Effective dot position. `step` is the transport position in 1/16 steps, or null when stopped (motion freezes at the hand position).
 *  Precedence: hand touch > recorded path > none; the LFO adds on top of whichever base is active. */
export function xyAt(xy: XY | undefined, step: number | null): { x: number; y: number } {
  const x0 = xy?.x ?? 0, y0 = xy?.y ?? 0;
  if (!xy || step == null || !motionOn(xy)) return { x: x0, y: y0 };
  let [x, y] = xy.rec?.play && xy.rec.pts.length ? recAt(xy.rec, step) : [x0, y0];
  const l = xy.lfo;
  if (l?.on && l.depth > 0) {
    const rs = LFO_RATES[l.rate]?.s ?? 4, c = step / rs + l.phase, cyc = Math.floor(c);
    const [dx, dy] = shapeAt(l.shape, c - cyc, cyc);
    x += dx * l.depth; y += dy * l.depth;
  }
  return { x: cl(x), y: cl(y) };
}

/** Fills unrecorded steps by linear interpolation between captured ones (wrapping), holding when only one exists. */
export function fillPath(cap: ([number, number] | undefined)[]): [number, number][] {
  const n = cap.length, have = cap.map((p, i) => p ? i : -1).filter(i => i >= 0);
  if (!have.length) return [];
  return cap.map((p, i) => {
    if (p) return p;
    const prev = [...have].reverse().find(j => j < i) ?? have[have.length - 1], next = have.find(j => j > i) ?? have[0];
    const a = cap[prev]!, b = cap[next]!, span = ((next - prev + n) % n) || n, t = ((i - prev + n) % n) / span;
    return [+(a[0] + (b[0] - a[0]) * t).toFixed(3), +(a[1] + (b[1] - a[1]) * t).toFixed(3)];
  });
}
