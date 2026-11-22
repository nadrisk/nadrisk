// CADENCE + LATTICE: SURF's pitch brain. GROUND holds the bass of the current chord; SURGE windows
// (from the gate pattern) let SURF leap to wherever the free-running LATTICE is. Everything is a pure
// function of the transport tick, so the lattice never restarts and screen and sound always agree.
import { degreeToSemi, type ScaleName } from "./arp";
import { harmonyOn, snapNote, type Harmony } from "./harmony";

/** Progressions as scale degrees (0 = i). Common minor-key loops first. */
export const CADENCES: { name: string; deg: number[] }[] = [
  { name: "i VI III VII", deg: [0, 5, 2, 6] },
  { name: "i iv v i", deg: [0, 3, 4, 0] },
  { name: "i VII VI VII", deg: [0, 6, 5, 6] },
  { name: "i iv VI v", deg: [0, 3, 5, 4] },
  { name: "i VI iv v", deg: [0, 5, 3, 4] },
  { name: "i III VII iv", deg: [0, 2, 6, 3] },
  { name: "i v VI iv", deg: [0, 4, 5, 3] },
  { name: "i i VI VII", deg: [0, 0, 5, 6] },
];
/** SURGE gate patterns over 16 steps: 1 = surge window open (lattice note), 0 = ground (bass note). */
export const SURGE_GATES: { name: string; g: number[] }[] = [
  { name: "NONE", g: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: "OFFS", g: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0] },
  { name: "TAIL", g: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1] },
  { name: "PUMP", g: [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1] },
  { name: "3-3-2", g: [0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1] },
  { name: "HALF", g: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1] },
  { name: "FULL", g: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
];
export const LATTICE_SHAPES = ["LINE", "BNCE", "WEAV", "DRFT"] as const;
export const RATES = [4, 8, 16, 32] as const;

export type CadenceParams = { on: boolean; prog: number; horizon: number; rate: number; gate: number;
  xClk: number; yClk: number; xLen: number; yLen: number; shape: number; track: "chord" | "root" };
export const defaultCadence = (): CadenceParams => ({ on: false, prog: 0, horizon: 4, rate: 2, gate: 1, xClk: 1, yClk: 3, xLen: 4, yLen: 3, shape: 0, track: "chord" });
export const cadenceOf = (c?: Partial<CadenceParams>): CadenceParams => ({ ...defaultCadence(), ...(c ?? {}) });

const mod = (a: number, n: number) => ((a % n) + n) % n;
/** Position along one axis for a given step count, shaped by the lattice law. */
function axis(n: number, len: number, shape: number, salt: number) {
  if (len <= 1) return 0;
  if (shape === 1) { const p = mod(n, 2 * len - 2); return p < len ? p : 2 * len - 2 - p; } // bounce
  if (shape === 2) return mod(n * (len % 2 ? 2 : 1) + Math.floor(n / len), len); // weave
  if (shape === 3) { let x = 0; for (let k = 1; k <= n % 64; k++) x = mod(x + (((k * 2654435761 + salt) >>> 0) % 3) - 1, len); return x; } // drift (deterministic walk)
  return mod(n, len);
}
/** Lattice cell at a tick: independent X/Y clocks and lengths so the two cycles drift against each other. */
export function latticeCell(c: CadenceParams, tick: number) {
  const x = axis(Math.floor(tick / Math.max(1, c.xClk)), Math.min(4, Math.max(1, c.xLen)), c.shape, 17);
  const y = axis(Math.floor(tick / Math.max(1, c.yClk)), Math.min(4, Math.max(1, c.yLen)), c.shape, 91);
  return { x, y };
}
const scaleOf = (h: Harmony): ScaleName => (harmonyOn(h) ? h.scale : "minor");

export type CadenceStep = { chord: number; degree: number; surge: boolean; cell: { x: number; y: number }; note: number };
/** The SURF note at a tick: ground (bass of the chord) or surge (lattice note), always snapped into KEY/SCL last. */
export function cadenceStep(c: CadenceParams, h: Harmony, tick: number, root: number): CadenceStep {
  const prog = CADENCES[mod(c.prog, CADENCES.length)].deg, hz = Math.min(4, Math.max(1, c.horizon)), rate = RATES[mod(c.rate, RATES.length)];
  const chord = mod(Math.floor(tick / rate), hz), degree = prog[chord], sc = scaleOf(h);
  const base = h.key + 12 * Math.floor((root - h.key) / 12);
  const surge = SURGE_GATES[mod(c.gate, SURGE_GATES.length)].g[mod(tick, 16)] === 1;
  const cell = latticeCell(c, tick);
  const from = c.track === "chord" ? degree : 0;
  // Ground sits one octave under the root; the lattice stacks thirds of the chord (x) across octaves (y) above it.
  const raw = surge ? base + degreeToSemi(sc, from + cell.x * 2) + 12 * Math.min(2, cell.y) : base - 12 + degreeToSemi(sc, degree);
  return { chord, degree, surge, cell, note: snapNote(h, raw) };
}
