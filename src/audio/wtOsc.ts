// Wavetable oscillator worklet (Serum/Vital practice): one continuous phase accumulator, band-limited
// mipmaps per octave (no aliasing, no phase resets), and per-sample bilinear interpolation across
// neighbouring frames with a smoothed position, so sweeps through any table stay click-free.
import type { WtTable } from "./wavetable";

export const WT_SIZE = 2048, WT_LEVELS = 10; // level L keeps 512 >> L harmonics

export const WT_OSC_WORKLET = `
const NAD_WT = globalThis.__nadWt || (globalThis.__nadWt = new Map());
class NadWt extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [
    { name: 'frequency', defaultValue: 440, automationRate: 'a-rate' },
    { name: 'detune', defaultValue: 0, automationRate: 'a-rate' },
    { name: 'pos', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'a-rate' }]; }
  constructor() { super(); this.ph = Math.random(); this.x = -1; this.id = ''; this.dead = false; this.a = 1 - Math.exp(-1 / (sampleRate * .015));
    this.port.onmessage = e => { const d = e.data; if (d.table) NAD_WT.set(d.table.id, d.table); if (d.use) this.id = d.use; if (d.stop) this.dead = true; if ('env' in d) this.env = d.env; }; this.env = null; }
  // WT env on the audio clock (mirrors wtEnvLevel in wtEnv.ts): position in table units 0..1.
  envPos(e, tm) { const t = tm - e.t0, a = e.a, d = e.d, s = e.s, sm = e.sm, ez = x => x + (((1 - Math.cos(Math.PI * x)) / 2) - x) * sm; let l;
    if (t <= 0) l = 0; else if (t < a) l = ez(t / a); else { let u = t - a;
      if (!e.loop) l = u >= d ? s : 1 - (1 - s) * ez(u / d); else if (u < d) l = 1 - (1 - s) * ez(u / d);
      else { u = (u - d) % (a + d); l = u < a ? s + (1 - s) * ez(u / a) : 1 - (1 - s) * ez((u - a) / d); } }
    return Math.min(1, Math.max(0, (e.base + (e.bi ? l * 2 - 1 : l) * e.dp * 3) / 3)); }
  process(_i, outs, p) {
    if (this.dead) return false;
    const o = outs[0][0], T = NAD_WT.get(this.id); if (!o) return true; if (!T) { o.fill(0); return true; }
    const fq = p.frequency, dt = p.detune, ps = p.pos, n = T.n, S = ${WT_SIZE}, M = S - 1, sr = sampleRate;
    const fpc = fq.length > 1 || dt.length > 1; let f = fq[0] * Math.pow(2, dt[0] / 1200);
    const L = Math.max(0, Math.min(${WT_LEVELS - 1}, Math.ceil(Math.log2(Math.max(1e-9, 512 * Math.abs(f) / (sr * .5))))));
    const lv = T.lv[L];
    if (this.x < 0) this.x = (this.env ? this.envPos(this.env, currentTime) : Math.min(1, Math.max(0, ps[0]))) * (n - 1);
    let ph = this.ph, x = this.x; const a = this.a, E = this.env, sr1 = 1 / sr, en = T.en, dp = T.dp;
    for (let i = 0; i < o.length; i++) {
      if (fpc) f = fq[fq.length > 1 ? i : 0] * Math.pow(2, dt[dt.length > 1 ? i : 0] / 1200);
      const tgt = (E ? this.envPos(E, currentTime + i * sr1) : Math.min(1, Math.max(0, ps[ps.length > 1 ? i : 0]))) * (n - 1); let dx = (tgt - x) * a; const cap = 2 * Math.abs(f) / sr + 1e-4; if (dx > cap) dx = cap; else if (dx < -cap) dx = -cap; x += dx;
      const k = n > 1 ? Math.min(n - 2, x | 0) : 0, w = n > 1 ? x - k : 0;
      const idx = ph * S, i0 = idx | 0, fr = idx - i0, i1 = (i0 + 1) & M, a0 = k * S, b0 = n > 1 ? a0 + S : a0;
      const s0 = lv[a0 + i0] + (lv[a0 + i1] - lv[a0 + i0]) * fr, s1 = lv[b0 + i0] + (lv[b0 + i1] - lv[b0 + i0]) * fr;
      let g = 1; if (en && w > 0) { const ea = en[k], eb = en[k + 1], d = dp[k], wa = 1 - w, E = wa * wa * ea + w * w * eb + 2 * wa * w * d, Et = wa * ea + w * eb; if (E > 1e-9) g = Math.min(2, Math.max(.5, Math.sqrt(Et / E))); }
      o[i] = (s0 + (s1 - s0) * w) * g;
      ph += f / sr; ph -= Math.floor(ph);
    }
    this.ph = ph; this.x = x; return true;
  }
}
registerProcessor('nad-wt', NadWt);`;

function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) { const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) { const p = i + k, q = p + len / 2, tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr;
        re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } }
}
/** One cycle from cosine/sine harmonics up to h: x(t) = sum real[k]cos + imag[k]sin. */
export function synthCycle(real: Float32Array, imag: Float32Array, h: number): Float32Array {
  const re = new Float64Array(WT_SIZE), im = new Float64Array(WT_SIZE), m = Math.min(h, real.length - 1);
  // x = Re(sum Z_k e^{+i}), Z_k = real - i*imag  => compute via forward FFT of conj(Z)
  for (let k = 1; k <= m; k++) { re[k] = real[k]; im[k] = imag[k]; }
  fft(re, im); const out = new Float32Array(WT_SIZE); for (let i = 0; i < WT_SIZE; i++) out[i] = re[i]; return out;
}
/** Neighbour phase matching: each frame keeps its own magnitudes and nearly its own shape; any harmonic pointing
 * more than 90 degrees away from the previous (already matched) frame is flipped, so neighbours never cancel. */
export function matchNeighbourPhases(re: Float32Array[], im: Float32Array[]): { real: Float32Array[]; imag: Float32Array[] } {
  const real = re.map(a => Float32Array.from(a)), imag = im.map(a => Float32Array.from(a));
  for (let f = 1; f < real.length; f++) for (let k = 1; k < real[f].length; k++)
    if (real[f][k] * real[f - 1][k] + imag[f][k] * imag[f - 1][k] < 0) { real[f][k] = -real[f][k]; imag[f][k] = -imag[f][k]; }
  return { real, imag };
}
export type WtMips = { id: string; n: number; lv: Float32Array[]; en: Float32Array; dp: Float32Array };
const mips = new Map<string, WtMips>();
export function buildMips(t: WtTable): WtMips {
  const hit = mips.get(t.id); if (hit) return hit;
  const n = t.frames.length, lv: Float32Array[] = [], { real, imag } = matchNeighbourPhases(t.real, t.imag);
  for (let L = 0; L < WT_LEVELS; L++) { const a = new Float32Array(n * WT_SIZE); for (let k = 0; k < n; k++) a.set(synthCycle(real[k], imag[k], 512 >> L), k * WT_SIZE); lv.push(a); }
  let pk = 0; lv[0].forEach(v => { pk = Math.max(pk, Math.abs(v)); }); const g = pk > 1e-6 ? 1 / pk : 1; lv.forEach(a => { for (let i = 0; i < a.length; i++) a[i] *= g; });
  const en = new Float32Array(n), dp = new Float32Array(Math.max(1, n - 1)), l0 = lv[0];
  for (let k = 0; k < n; k++) { let e = 0, d = 0; for (let i = 0; i < WT_SIZE; i++) { const v = l0[k * WT_SIZE + i]; e += v * v; if (k < n - 1) d += v * l0[(k + 1) * WT_SIZE + i]; } en[k] = e / WT_SIZE; if (k < n - 1) dp[k] = d / WT_SIZE; }
  const r = { id: t.id, n, lv, en, dp }; mips.set(t.id, r); return r;
}
const sent = new WeakMap<BaseAudioContext, Set<string>>();
/** Wavetable oscillator node, or null if the worklet isn't loaded yet (caller falls back). */
export function wtOsc(ctx: BaseAudioContext, t: WtTable): AudioWorkletNode | null {
  let node: AudioWorkletNode;
  try { node = new AudioWorkletNode(ctx, "nad-wt", { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] }); } catch { return null; }
  let s = sent.get(ctx); if (!s) sent.set(ctx, s = new Set());
  if (!s.has(t.id)) { s.add(t.id); node.port.postMessage({ table: buildMips(t) }); }
  node.port.postMessage({ use: t.id }); return node;
}
