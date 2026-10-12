import type { ADSR } from "@/audio/voices";

/** REESE: mono detuned-saw bass with centred sine sub and a tempo-synced filter pulse. */
export type ReeseParams = {
  detune: number; drift: number; width: number; sub: number;
  /** Pulse length in beats (4 = 1 bar … .25 = 1/16). */
  rate: number; depth: number; shape: number; glide: number;
  cutoff: number; res: number; env: ADSR; fenv: ADSR; fenvAmt: number;
};
export const REESE_RATES = [4, 2, 1, .5, .25] as const;
export const REESE_RATE_NAMES = ["1BAR", "1/2", "1/4", "1/8", "1/16"];
export const defaultReese = (): ReeseParams => ({
  detune: 18, drift: .3, width: .6, sub: .6, rate: 1, depth: 1.5, shape: .2, glide: .04,
  cutoff: 380, res: 2, env: { a: .002, d: .3, s: 1, r: .12 }, fenv: { a: .01, d: .4, s: .3, r: .3 }, fenvAmt: 0,
});
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
export const reeseParams = (r?: Partial<ReeseParams>): ReeseParams => {
  const d = defaultReese(), p = { ...d, ...r, env: { ...d.env, ...r?.env }, fenv: { ...d.fenv, ...r?.fenv } };
  return { ...p, detune: clamp(p.detune, 0, 50), drift: clamp(p.drift, 0, 1), width: clamp(p.width, 0, 1), sub: clamp(p.sub, 0, 1),
    rate: REESE_RATES.reduce((a, b) => Math.abs(b - p.rate) < Math.abs(a - p.rate) ? b : a, 1), depth: clamp(p.depth, 0, 4), shape: clamp(p.shape, 0, 1), glide: clamp(p.glide, 0, .5), cutoff: clamp(p.cutoff, 40, 16000), res: clamp(p.res, 0, 8) };
};
/** Pulse frequency in Hz for a tempo. */
export const reesePulseHz = (bpm: number, beats: number) => bpm / 60 / beats;
/** Filter pulse in octaves at phase 0-1 (sine→square by shape); 0 at the note start, peak +depth/2. Matches the audio LFO. */
export const reesePulseAt = (r: Pick<ReeseParams, "depth" | "shape">, phase: number) => {
  const s = Math.sin(2 * Math.PI * phase), sq = phase % 1 < .5 ? 1 : -1;
  return (s * (1 - r.shape) + sq * r.shape) * r.depth / 2;
};
