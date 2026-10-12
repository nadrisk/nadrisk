import * as Tone from "tone";
import { ADVANCED_WORKLETS } from "./advanced";
import { TAPE_WORKLET } from "./tapeWorklet";
import { METER_WORKLET } from "./meterWorklet";

// [default, min, max, step]
type Range = [number, number, number, number];
// Equal-RMS make-up gain for a waveshaper curve, measured on a sine at a typical -9 dBFS programme level,
// so DRIVE changes character while loudness stays roughly constant.
const compCache = new WeakMap<Float32Array, number>();
function curveComp(curve: Float32Array | null): number {
  if (!curve) return 1; const hit = compCache.get(curve); if (hit) return hit;
  const n = curve.length, A = .35; let si = 0, so = 0;
  for (let k = 0; k < 256; k++) { const x = A * Math.sin(2 * Math.PI * k / 256), f = (x + 1) / 2 * (n - 1), j = Math.floor(f), y = curve[j] + (curve[Math.min(n - 1, j + 1)] - curve[j]) * (f - j); si += x * x; so += y * y; }
  const g = Math.min(4, Math.max(.1, Math.sqrt(si / Math.max(1e-9, so)))); compCache.set(curve, g); return g;
}

export const FX_DEFS = {
  saturation: { label: "saturate~", params: { drive: [4, 1, 30, 0.1], tone: [9000, 500, 16000, 10], mix: [1, 0, 1, 0.01] } },
  bitcrush: { label: "degrade~", params: { bits: [6, 1, 16, 1], reduce: [4, 1, 40, 1], sp: [0, 0, 2, 1], mix: [1, 0, 1, 0.01] } },
  delay: { label: "tape.delay~", params: { time: [0.375, 0.01, 1.5, 0.005], sync: [0, 0, 10, 1], feedback: [0.45, 0, 0.95, 0.01], tone: [3000, 300, 12000, 10], wow: [0.3, 0, 1, 0.01], mix: [0.35, 0, 1, 0.01] } },
  reverb: { label: "reverb~", params: { size: [2.5, 0.2, 8, 0.1], damp: [6000, 500, 16000, 10], mix: [0.3, 0, 1, 0.01] } },
  chorus: { label: "chorus~", params: { rate: [0.8, 0, 8, 0.01], sync: [0, 0, 10, 1], depth: [0.5, 0, 1, 0.01], manual: [15, 5, 30, 0.1], env: [0, 0, 1, 0.01], mix: [0.5, 0, 1, 0.01] } },
  flanger: { label: "flange~", params: { rate: [0.25, 0, 8, 0.01], sync: [0, 0, 10, 1], depth: [0.6, 0, 1, 0.01], manual: [2, 0.2, 10, 0.1], feedback: [0.6, 0, 0.95, 0.01], env: [0, 0, 1, 0.01], mix: [0.5, 0, 1, 0.01] } },
  phaser: { label: "phase~", params: { rate: [0.4, 0, 8, 0.01], sync: [0, 0, 10, 1], depth: [0.6, 0, 1, 0.01], manual: [800, 100, 5000, 10], feedback: [0.5, 0, 0.9, 0.01], env: [0, 0, 1, 0.01], mix: [0.5, 0, 1, 0.01] } },
  vibrato: { label: "vibrato~", params: { rate: [5, 0.1, 14, 0.01], sync: [0, 0, 10, 1], depth: [0.4, 0, 1, 0.01], lofi: [0, 0, 1, 1] } },
  tremolo: { label: "tremolo~", params: { rate: [4, 0.1, 20, 0.01], sync: [5, 0, 10, 1], depth: [0.6, 0, 1, 0.01], mix: [1, 0, 1, 0.01] } },
  gate: { label: "trance.gate~", params: { rate: [8, 0.5, 32, 0.01], sync: [5, 0, 11, 1], preset: [0, 0, 7, 1], tight: [0, 0, 1, 0.01], depth: [1, 0, 1, 0.01], smooth: [0.3, 0, 1, 0.01], mask: [21845, 0, 65535, 1], steps: [16, 1, 16, 1], mix: [1, 0, 1, 0.01] } },
  compressor: { label: "compress~", params: { threshold: [-24, -60, 0, 0.5], ratio: [4, 1, 20, 0.1], attack: [0.01, 0.001, 0.5, 0.001], release: [0.2, 0.02, 1, 0.01], makeup: [6, 0, 24, 0.5], mix: [1, 0, 1, 0.01] } },
  metal: { label: "res.metal~", params: { note: [57, 24, 84, 1], fine: [0, -50, 50, 1], track: [0, 0, 1, 1], feedback: [0.85, 0, 0.97, 0.01], metal: [0.4, 0, 1, 0.01], drive: [0.2, 0, 1, 0.01], decay: [0.35, 0.02, 2, 0.01], tone: [6000, 300, 16000, 10], random: [0, 0, 1, 0.01], mix: [0.4, 0, 1, 0.01] } },
  spectral: { label: "spectral~", params: { amount: [0.5, 0, 1, 0.01], mix: [1, 0, 1, 0.01] } },
  sidechain: { label: "sidechain~", params: { source: [1, 1, 16, 1], threshold: [-24, -60, 0, 1], ratio: [6, 1, 20, 0.1], depth: [1, 0, 1, 0.01], attack: [0.005, 0.001, 0.1, 0.001], release: [0.2, 0.02, 1, 0.01], mix: [1, 0, 1, 0.01] } },
  djfilter: { label: "dj.filter~", params: { sweep: [0, -1, 1, 0.01], resonance: [0.7, 0.1, 8, 0.1], mix: [1, 0, 1, 0.01] } },
  reverseDelay: { label: "reverse.delay~", params: { time: [0.25, 0.02, 1.5, 0.005], sync: [4, 0, 10, 1], feedback: [0.3, 0, 0.85, 0.01], mix: [0.35, 0, 1, 0.01] } },
  acid: { label: "acid.drive~", params: { drive: [10, 1, 40, 0.1], bias: [0.35, 0, 0.9, 0.01], bite: [1800, 300, 6000, 10], tone: [7000, 800, 16000, 10], mix: [1, 0, 1, 0.01] } },
  eq: { label: "channel.eq~", params: { low: [0, -15, 15, 0.5], lowFreq: [100, 30, 400, 1], mid: [0, -15, 15, 0.5], midFreq: [1000, 200, 8000, 10], q: [1, 0.3, 8, 0.1], high: [0, -15, 15, 0.5], highFreq: [9000, 2000, 16000, 10] } },
  noisegate: { label: "gate~", params: { threshold: [-40, -80, 0, 1], attack: [0.001, 0.0005, 0.05, 0.0005], hold: [0.03, 0, 0.5, 0.005], release: [0.12, 0.01, 1.5, 0.01], range: [0, 0, 1, 0.01] } },
  drumbus: { label: "drum.bus~", params: { trans: [0, -1, 1, 0.01], smash: [0.3, 0, 1, 0.01], tone: [0, -1, 1, 0.01], clip: [0.3, 0, 1, 0.01], mix: [1, 0, 1, 0.01] } },
  gain: { label: "gain~", params: { level: [.55, 0, 1, 0.001] } },
  neurobox: { label: "neuro.box~", params: { reese: [0.35, 0, 1, 0.01], growl: [0.4, 0, 1, 0.01], squelch: [0.3, 0, 1, 0.01], disp: [0.25, 0, 1, 0.01] } },
  dyneq: { label: "dyn.eq~", params: { source: [1, 1, 16, 1], freq: [1000, 40, 12000, 10], gain: [-6, -15, 15, 0.5], threshold: [-30, -60, 0, 1], q: [1.5, 0.3, 8, 0.1], mix: [1, 0, 1, 0.01] } },
  ott: { label: "ott~", params: { depth: [0.6, 0, 1, 0.01], speed: [0.5, 0, 1, 0.01], makeup: [0, -12, 12, 0.5] } },
} satisfies Record<string, { label: string; params: Record<string, Range> }>;
export type FxType = keyof typeof FX_DEFS;
export const FX_TYPES = Object.keys(FX_DEFS) as FxType[];
export type FxUnit = { id: number; type: FxType; on: boolean; params: Record<string, number> };

let nextId = 1;
/** Mixing-desk fader taper: bottom = -INF, -60..-12 dB fast, -12..+12 dB over most of the travel, +12..+24 at the top. */
export const GAIN_ZERO = .55;
export const gainPosToDb = (p: number) => p <= .02 ? -Infinity : p < .25 ? -60 + (p - .02) / .23 * 48 : p < .85 ? -12 + (p - .25) / .6 * 24 : 12 + (p - .85) / .15 * 12;
export const gainDbToPos = (db: number) => db <= -60 ? .02 : db < -12 ? .02 + (db + 60) / 48 * .23 : db < 12 ? .25 + (db + 12) / 24 * .6 : Math.min(1, .85 + (db - 12) / 12 * .15);
export const makeFx = (type: FxType, over: Record<string, number> = {}): FxUnit => ({ id: nextId++, type, on: true, params: { ...Object.fromEntries(Object.entries(FX_DEFS[type].params).map(([k, r]) => [k, (r as Range)[0]])), ...over } });

const WORKLETS = `
class Crush extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'bits', defaultValue: 8 }, { name: 'reduce', defaultValue: 4 }]; }
  constructor() { super(); this.h = [0, 0]; this.c = [0, 0]; }
  process(ins, outs, p) {
    const inp = ins[0], out = outs[0]; if (!inp || !inp.length) return true;
    const q = Math.pow(2, p.bits[0] - 1), r = Math.max(1, p.reduce[0]);
    for (let ch = 0; ch < out.length; ch++) {
      const x = inp[ch] || inp[0], y = out[ch];
      for (let n = 0; n < y.length; n++) {
        if (++this.c[ch] >= r) { this.c[ch] = 0; this.h[ch] = Math.round(x[n] * q) / q; }
        y[n] = this.h[ch];
      }
    }
    return true;
  }
}
class Follow extends AudioWorkletProcessor {
  constructor() { super(); this.e = 0; }
  process(ins, outs) {
    const x = ins[0] && ins[0][0], y = outs[0][0];
    for (let n = 0; n < y.length; n++) { const v = x ? Math.abs(x[n]) : 0; this.e = v > this.e ? this.e + (v - this.e) * 0.01 : this.e * 0.9996; y[n] = this.e; }
    return true;
  }
}
class NGate extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'threshold', defaultValue: -40 }, { name: 'attack', defaultValue: .001 }, { name: 'hold', defaultValue: .03 }, { name: 'release', defaultValue: .12 }, { name: 'range', defaultValue: 0 }]; }
  constructor() { super(); this.g = 0; this.h = 0; }
  process(ins, outs, p) {
    const x = ins[0], y = outs[0]; if (!x || !x.length) return true; const th = Math.pow(10, p.threshold[0] / 20), fl = p.range[0];
    const ka = 1 - Math.exp(-1 / (sampleRate * Math.max(.0002, p.attack[0]))), kr = 1 - Math.exp(-1 / (sampleRate * Math.max(.005, p.release[0]))), hs = p.hold[0] * sampleRate;
    for (let n = 0; n < y[0].length; n++) {
      const v = Math.max(Math.abs(x[0][n] || 0), Math.abs((x[1] || x[0])[n] || 0));
      if (v > th) this.h = hs; else if (this.h > 0) this.h--;
      const open = v > th || this.h > 0, tg = open ? 1 : fl; this.g += (tg - this.g) * (open ? ka : kr);
      for (let c = 0; c < y.length; c++) y[c][n] = ((x[c] || x[0])[n] || 0) * this.g;
    }
    return true;
  }
}
class Transient extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'attack', defaultValue: 0 }, { name: 'sustain', defaultValue: 0 }]; }
  constructor() { super(); this.f = 0; this.s = 0; this.g = 1; }
  process(ins, outs, p) {
    const x = ins[0], y = outs[0]; if (!x || !x.length) return true; const a = p.attack[0], su = p.sustain[0];
    const kf = 1 - Math.exp(-1 / (sampleRate * .0008)), kfr = 1 - Math.exp(-1 / (sampleRate * .03)), ks = 1 - Math.exp(-1 / (sampleRate * .02)), ksr = 1 - Math.exp(-1 / (sampleRate * .25));
    for (let n = 0; n < y[0].length; n++) {
      const v = Math.max(Math.abs(x[0][n] || 0), Math.abs((x[1] || x[0])[n] || 0));
      this.f += (v - this.f) * (v > this.f ? kf : kfr); this.s += (v - this.s) * (v > this.s ? ks : ksr);
      const r = (this.f + 1e-5) / (this.s + 1e-5), t = Math.min(8, Math.max(.05, Math.pow(r, r > 1 ? a * 1.6 : -su * 1.6)));
      this.g += (t - this.g) * .02;
      for (let c = 0; c < y.length; c++) y[c][n] = ((x[c] || x[0])[n] || 0) * this.g;
    }
    return true;
  }
}
class MetalEnv extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'decay', defaultValue: .35 }]; }
  constructor() { super(); this.e = 0; }
  process(ins, outs, p) {
    const x = ins[0], y = outs[0][0], kr = Math.exp(-1 / (sampleRate * Math.max(.005, p.decay[0]) / 3));
    for (let n = 0; n < y.length; n++) { const v = Math.min(1, Math.max(Math.abs(x?.[0]?.[n] || 0), Math.abs(x?.[1]?.[n] || 0)) * 6); this.e = v > this.e ? this.e + (v - this.e) * .2 : this.e * kr; y[n] = this.e; }
    return true;
  }
}
class Phaser extends AudioWorkletProcessor {
  static get parameterDescriptors() { return ['rate','depth','manual','feedback','env'].map(name => ({ name, defaultValue: name === 'manual' ? 800 : 0 })); }
  constructor() { super(); this.ph = 0; this.e = 0; this.zx = [new Float32Array(6), new Float32Array(6)]; this.zy = [new Float32Array(6), new Float32Array(6)]; this.fb = [0, 0]; this.ratios = [.42, .62, .85, 1.18, 1.62, 2.25]; }
  process(ins, outs, p) {
    const x = ins[0], y = outs[0]; if (!x || !x.length) return true;
    const rate = p.rate[0], dep = p.depth[0], man = p.manual[0], feedback = Math.min(.85, Math.max(0, p.feedback[0])), envAmt = p.env[0];
    for (let n = 0; n < y[0].length; n++) {
      this.ph = (this.ph + rate / sampleRate) % 1;
      const peak = Math.max(Math.abs(x[0]?.[n] || 0), Math.abs((x[1] || x[0])?.[n] || 0)); this.e += (peak - this.e) * (peak > this.e ? .02 : .0005);
      const sweep = Math.pow(2, Math.sin(this.ph * Math.PI * 2) * dep * 2 + this.e * envAmt * 4);
      for (let ch = 0; ch < y.length; ch++) { const dry = (x[ch] || x[0])[n] || 0; let v = dry + this.fb[ch] * feedback;
        for (let k = 0; k < 6; k++) { const f = Math.min(sampleRate * .44, Math.max(20, man * this.ratios[k] * sweep)), t = Math.tan(Math.PI * f / sampleRate), a = (1 - t) / (1 + t), o = -a * v + this.zx[ch][k] + a * this.zy[ch][k]; this.zx[ch][k] = v; this.zy[ch][k] = o; v = o; }
        this.fb[ch] = v; y[ch][n] = (dry + v) * .5; }
    } return true;
  }
}
class Smash extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'amount', defaultValue: .3 }]; }
  constructor() { super(); this.e = 0; this.g = 1; this.r = 0; }
  process(ins, outs, p) {
    // FET "all buttons in": near-instant attack, very high ratio, program-dependent release, driven input stage.
    const x = ins[0], y = outs[0]; if (!x || !x.length) return true; const a = p.amount[0];
    if (a < .001) { for (let c = 0; c < y.length; c++) y[c].set(x[c] || x[0]); return true; }
    const th = Math.pow(10, (-6 - a * 30) / 20), ratio = 4 + a * 26, pre = 1 + a * 3, mk = Math.pow(10, a * 30 / 20), ka = 1 - Math.exp(-1 / (sampleRate * .0002));
    for (let n = 0; n < y[0].length; n++) {
      const v = Math.max(Math.abs((x[0][n] || 0) * pre), Math.abs(((x[1] || x[0])[n] || 0) * pre));
      this.r = this.r * .9995 + (v > th ? .0005 : 0);
      const kr = 1 - Math.exp(-1 / (sampleRate * (.05 + this.r * .4)));
      this.e += (v - this.e) * (v > this.e ? ka : kr);
      const gr = this.e > th ? Math.pow(th / this.e, 1 - 1 / ratio) : 1;
      for (let c = 0; c < y.length; c++) { const s = ((x[c] || x[0])[n] || 0) * pre * gr * mk; y[c][n] = Math.tanh(s * (1 + a)) / (1 + a * .6); }
    }
    return true;
  }
}
registerProcessor('nad-metalenv', MetalEnv); registerProcessor('nad-phaser', Phaser); registerProcessor('nad-smash', Smash);
registerProcessor('nad-ngate', NGate); registerProcessor('nad-transient', Transient);
class SpecGate extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'amount', defaultValue: .5 }]; }
  constructor() { super(); this.N = 512; this.H = 128; const N = this.N; this.win = new Float32Array(N); for (let i = 0; i < N; i++) this.win[i] = .5 - .5 * Math.cos(2 * Math.PI * i / N);
    this.ch = [0, 1].map(() => ({ inb: new Float32Array(N), outb: new Float32Array(N + 128), re: new Float32Array(N), im: new Float32Array(N), g: new Float32Array(N / 2 + 1) })); this.mag = new Float32Array(N / 2 + 1); this.srt = new Float32Array(N / 2 + 1); }
  fft(re, im, inv) { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let len = 2; len <= n; len <<= 1) { const a = (inv ? 2 : -2) * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const u = i + k, v = u + len / 2, tr = re[v] * cr - im[v] * ci, ti = re[v] * ci + im[v] * cr; re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti; const nc = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nc; } } } }
  process(ins, outs, p) { const x = ins[0], y = outs[0], N = this.N, H = this.H, amt = p.amount[0];
    for (let c = 0; c < y.length; c++) { const st = this.ch[c] || this.ch[0], src = x[c] || x[0], o = y[c];
      st.inb.copyWithin(0, H); for (let i = 0; i < H; i++) st.inb[N - H + i] = src ? src[i] || 0 : 0;
      for (let i = 0; i < N; i++) { st.re[i] = st.inb[i] * this.win[i]; st.im[i] = 0; } this.fft(st.re, st.im, false);
      const B = N / 2 + 1; for (let k = 0; k < B; k++) { this.mag[k] = Math.hypot(st.re[k], st.im[k]); this.srt[k] = this.mag[k]; } this.srt.sort();
      // Keep only bins above the AMOUNT percentile of this frame (spectral gate), smoothed per bin to avoid chirps.
      const q = 1 - Math.pow(1 - amt, 3), th = this.srt[Math.min(B - 1, Math.floor(q * .985 * B))] * (amt > 0 ? 1 : 0);
      for (let k = 0; k < B; k++) { const tg = this.mag[k] >= th ? 1 : 0; st.g[k] += (tg - st.g[k]) * (tg > st.g[k] ? .7 : .25); const gk = st.g[k]; st.re[k] *= gk; st.im[k] *= gk; if (k > 0 && k < N / 2) { st.re[N - k] = st.re[k]; st.im[N - k] = -st.im[k]; } }
      this.fft(st.re, st.im, true);
      for (let i = 0; i < N; i++) st.outb[i] += st.re[i] / N * this.win[i] * (2 / 3);
      for (let i = 0; i < H; i++) o[i] = st.outb[i]; st.outb.copyWithin(0, H); st.outb.fill(0, N - H); }
    return true; }
}
registerProcessor('nad-specgate', SpecGate);
class DynEq extends AudioWorkletProcessor {
  // External-key dynamic bell: the key's level above THRESH pushes a peaking band towards GAIN (smoothed, no zipper).
  static get parameterDescriptors() { return [{ name: 'freq', defaultValue: 1000 }, { name: 'gain', defaultValue: -6 }, { name: 'threshold', defaultValue: -30 }, { name: 'q', defaultValue: 1.5 }]; }
  constructor() { super(); this.e = 0; this.amt = 0; this.z = [[0, 0, 0, 0], [0, 0, 0, 0]]; this.c = [1, 0, 0, 0, 0]; this.cnt = 0; }
  coef(f, db, q) { const A = Math.pow(10, db / 40), w = 2 * Math.PI * Math.min(f, sampleRate * .45) / sampleRate, al = Math.sin(w) / (2 * q), cs = Math.cos(w), a0 = 1 + al / A;
    this.c = [(1 + al * A) / a0, -2 * cs / a0, (1 - al * A) / a0, -2 * cs / a0, (1 - al / A) / a0]; }
  process(ins, outs, p) { const x = ins[0], k = ins[1], y = outs[0]; if (!x || !x.length) return true;
    const ka = 1 - Math.exp(-1 / (sampleRate * .005)), kr = 1 - Math.exp(-1 / (sampleRate * .12)), ks = 1 - Math.exp(-1 / (sampleRate * .01)), th = p.threshold[0];
    for (let n = 0; n < y[0].length; n++) {
      const v = k && k.length ? Math.max(Math.abs(k[0][n] || 0), Math.abs((k[1] || k[0])[n] || 0)) : 0; this.e += (v - this.e) * (v > this.e ? ka : kr);
      const over = 20 * Math.log10(this.e + 1e-6) - th; this.amt += (Math.max(0, Math.min(1, over / 12)) - this.amt) * ks;
      if (++this.cnt >= 32) { this.cnt = 0; this.coef(p.freq[0], p.gain[0] * this.amt, Math.max(.2, p.q[0])); }
      const [b0, b1, b2, a1, a2] = this.c;
      for (let c = 0; c < y.length; c++) { const z = this.z[c] || this.z[0], s = (x[c] || x[0])[n] || 0, o = b0 * s + b1 * z[0] + b2 * z[1] - a1 * z[2] - a2 * z[3]; z[1] = z[0]; z[0] = s; z[3] = z[2]; z[2] = o; y[c][n] = o; }
    } return true; }
}
registerProcessor('nad-dyneq', DynEq);
registerProcessor('nad-crush', Crush); registerProcessor('nad-follow', Follow);`;

let loading: Promise<void> | null = null;
export const loadWorklets = () => (loading ??= Tone.getContext().addAudioWorkletModule(URL.createObjectURL(new Blob([WORKLETS, ADVANCED_WORKLETS, TAPE_WORKLET, METER_WORKLET], { type: "application/javascript" }))));

let eco = false;
/** Eco mode trades quality for CPU: no oversampling, shorter reverb tails. */
export const setFxEco = (on: boolean) => { eco = on; };
export const fxEco = () => eco;

/** Tempo-sync divisions (index 0 = free). Value is length in quarter-note beats. */
/** Classic trance-gate patterns (16-step masks, bit n = step n). */
export const GATE_PRESETS: [string, number][] = [["16TH", 65535], ["8TH", 21845], ["OFFB", 43690], ["332", 0b0100100101001001], ["GALOP", 0b1101101101101101], ["STUT", 0b1111000011110111], ["PUMP", 0b1110111011101110], ["BRKN", 0b1011010110110101]];
export const SYNC_DIVS: [string, number][] = [["free", 0], ["1/1", 4], ["1/2", 2], ["1/4", 1], ["1/8", 0.5], ["1/16", 0.25], ["1/4T", 2 / 3], ["1/8T", 1 / 3], ["1/16T", 1 / 6], ["1/4.", 1.5], ["1/8.", 0.75], ["1/32", 0.125]];
let fxBpm = 124;
export const setFxBpm = (b: number) => { fxBpm = b; };
const beatsOf = (p: Record<string, number>) => SYNC_DIVS[Math.round(p.sync ?? 0)]?.[1] ?? 0;
/** LFO rate in Hz, following the tempo when a sync division is chosen. */
const rateOf = (p: Record<string, number>) => { const b = beatsOf(p); return b ? fxBpm / 60 / b : p.rate; };

export type FxLevels = { input: number; output: number };
export type FxNode = { input: GainNode; output: GainNode; update: (p: Record<string, number>, at?: number) => void; levels: () => FxLevels; keyInput?: AudioNode; setPitch?: (semi: number, at: number) => void; trigger?: (at: number) => void; dispose: () => void };

const meterDb = (analyser: AnalyserNode, data: Float32Array<ArrayBuffer>) => {
  analyser.getFloatTimeDomainData(data);
  let sum = 0, peak = 0;
  for (let i = 0; i < data.length; i++) { const v = data[i]; sum += v * v; peak = Math.max(peak, Math.abs(v)); }
  const level = Math.max(Math.sqrt(sum / data.length), peak * .35);
  return level > 0.00001 ? Math.max(-60, 20 * Math.log10(level)) : -60;
};

function satCurve(k: number) { const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } return c; }
function acidCurve(drive: number, bias: number) { const c = new Float32Array(2048); for (let i = 0; i < 2048; i++) { const x = (i / 1023.5 - 1) * drive; c[i] = x >= 0 ? 1 - Math.exp(-x) : -(1 - Math.exp(x * (1 - bias))) * (1 - bias * .5); } return c; }
// Impulses are cached by rounded length so a sequenced reverb decay doesn't rebuild noise on every step.
const impulses = new WeakMap<BaseAudioContext, Map<number, AudioBuffer>>();
function impulse(ctx: BaseAudioContext, sec: number) {
  const key = Math.round(sec * 4) / 4, m = impulses.get(ctx) ?? new Map<number, AudioBuffer>(); impulses.set(ctx, m);
  const hit = m.get(key); if (hit) return hit; const b = makeImpulse(ctx, Math.max(.2, key)); m.set(key, b); return b;
}
function makeImpulse(ctx: BaseAudioContext, sec: number) {
  const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; }
  return b;
}

export function createFx(ctx: BaseAudioContext, type: FxType, init: Record<string, number>): FxNode {
  const input = ctx.createGain(), output = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain();
  input.connect(dry).connect(output); wet.connect(output);
  const inputMeter = ctx.createAnalyser(), outputMeter = ctx.createAnalyser();
  inputMeter.fftSize = outputMeter.fftSize = 256;
  inputMeter.smoothingTimeConstant = outputMeter.smoothingTimeConstant = .65;
  input.connect(inputMeter); output.connect(outputMeter);
  const inputData = new Float32Array(new ArrayBuffer(inputMeter.fftSize * Float32Array.BYTES_PER_ELEMENT));
  const outputData = new Float32Array(new ArrayBuffer(outputMeter.fftSize * Float32Array.BYTES_PER_ELEMENT));
  const nodes: AudioNode[] = [input, output, dry, wet, inputMeter, outputMeter], oscs: OscillatorNode[] = [];
  let automationTime = ctx.currentTime;
  const set = (p: AudioParam | undefined, v: number) => { if (p && Number.isFinite(v)) p.setTargetAtTime(v, automationTime, 0.005); };
  let keyInput: AudioNode | undefined;
  let setPitch: ((semi: number, at: number) => void) | undefined;
  let trigger: ((at: number) => void) | undefined;
  const worklet = (name: string, inputs = 1) => { const n = Tone.getContext().createAudioWorkletNode(name, { numberOfInputs: inputs, outputChannelCount: [2] }) as unknown as AudioWorkletNode; nodes.push(n); return n; };
  const wp = (n: AudioWorkletNode, p: Record<string, number>, keys: string[]) => keys.forEach(k => set(n.parameters.get(k), p[k]));
  const lfo = () => { const o = ctx.createOscillator(), g = ctx.createGain(); g.gain.value = 0; o.connect(g); o.start(); oscs.push(o); nodes.push(o, g); return { o, g }; };
  const follower = () => { const f = Tone.getContext().createAudioWorkletNode("nad-follow", { outputChannelCount: [1] }) as unknown as AudioNode, g = ctx.createGain(); g.gain.value = 0; input.connect(f).connect(g); nodes.push(f, g); return g; };
  let apply: (p: Record<string, number>) => void;

  if (type === "eq") {
    const [lo, mi, hi] = (["lowshelf", "peaking", "highshelf"] as const).map(t => { const b = ctx.createBiquadFilter(); b.type = t; nodes.push(b); return b; });
    input.connect(lo).connect(mi).connect(hi).connect(wet);
    apply = p => { set(lo.gain, p.low); set(lo.frequency, p.lowFreq); set(mi.gain, p.mid); set(mi.frequency, p.midFreq); set(mi.Q, p.q); set(hi.gain, p.high); set(hi.frequency, p.highFreq); };
  } else if (type === "acid") {
    // Diode-style asymmetric clipper with a resonant "bite" peak and fizzy top, for 303-style leads and basses.
    const pre = ctx.createGain(), sh = ctx.createWaveShaper(), peak = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), comp = ctx.createGain();
    peak.type = "peaking"; peak.Q.value = 1.4; peak.gain.value = 7; sh.oversample = eco ? "none" : "4x"; nodes.push(pre, sh, peak, lp, comp);
    input.connect(pre).connect(sh).connect(peak).connect(lp).connect(comp).connect(wet); let key = "";
    apply = p => { const k = `${p.drive}:${p.bias}`; if (k !== key) { key = k; sh.curve = acidCurve(p.drive, p.bias); }
      set(pre.gain, 1); set(peak.frequency, p.bite); set(lp.frequency, p.tone); set(comp.gain, curveComp(sh.curve)); };
  } else if (type === "metal") {
    // Roar-style tuned feedback: a stereo pair of combs pitched by NOTE (+FINE, optionally tracking the played note),
    // allpass dispersion (METL) for inharmonic clang, TONE lowpass and DRIVE saturation inside the loop.
    // Feedback = FDBK x input envelope (DCY), with a tanh clip, so it rings after each hit and always dies away.
    const env = worklet("nad-metalenv"), fbAmt = ctx.createGain(), merge = ctx.createChannelMerger(2), out = ctx.createGain(); nodes.push(fbAmt, merge, out);
    const clipCurve = Float32Array.from({ length: 1024 }, (_, i) => Math.tanh((i / 511.5 - 1) * 1.2) / Math.tanh(1.2));
    input.connect(env); env.connect(fbAmt);
    const sides = [0, 1].map(ch => {
      const d = ctx.createDelay(.1), ap1 = ctx.createBiquadFilter(), ap2 = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), drv = ctx.createWaveShaper(), fb = ctx.createGain(), clip = ctx.createWaveShaper();
      ap1.type = ap2.type = "allpass"; lp.type = "lowpass"; lp.Q.value = .5; clip.curve = clipCurve; fb.gain.value = 0;
      nodes.push(d, ap1, ap2, lp, drv, fb, clip);
      input.connect(d).connect(ap1).connect(ap2).connect(lp).connect(drv); drv.connect(merge, 0, ch);
      drv.connect(fb).connect(clip).connect(d); fbAmt.connect(fb.gain); return { d, ap1, ap2, lp, drv };
    });
    merge.connect(out).connect(wet); out.gain.value = 1.8;
    let semiOff = 0, last: Record<string, number> = init, driveKey = -1;
    const retune = (p: Record<string, number>, at: number, tc: number) => {
      const hz = 440 * 2 ** (((p.note ?? 57) + (p.track ? semiOff : 0) + (p.fine ?? 0) / 100 - 69) / 12);
      sides.forEach((s, ch) => { const t = Math.min(.09, Math.max(.0004, 1 / (hz * (ch ? 2 ** (7 / 1200) : 1)))); s.d.delayTime.cancelScheduledValues(at); s.d.delayTime.setTargetAtTime(t, at, tc);
        const m = p.metal ?? .4; set(s.ap1.frequency, Math.min(18000, hz * (1.7 + m * 4.3))); set(s.ap2.frequency, Math.min(18000, hz * (3.1 + m * 9.2))); set(s.ap1.Q, .2 + m * 3); set(s.ap2.Q, .2 + m * 3); });
    };
    apply = p => {
      last = p;
      retune(p, automationTime, .12); // tape-style glide: NOTE changes bend the pitch
      const dk = Math.round((p.drive ?? .2) * 50); if (dk !== driveKey) { driveKey = dk; const c = satCurve(1 + dk / 50 * 9); sides.forEach(s => { s.drv.curve = c; }); }
      sides.forEach(s => set(s.lp.frequency, p.tone ?? 6000)); set(fbAmt.gain, Math.min(.97, p.feedback ?? .85)); set(env.parameters.get("decay"), p.decay ?? .35);
    };
    setPitch = (semi, at) => { semiOff = semi; if (last.track) retune(last, at, .004); };
    trigger = at => { const amount = last.random ?? 0; if (amount <= 0) return; const r = () => Math.random() * 2 - 1;
      const rp = { ...last, note: Math.max(24, Math.min(84, (last.note ?? 57) + r() * 12 * amount)), tone: Math.max(300, Math.min(16000, (last.tone ?? 6000) * 2 ** (r() * 1.5 * amount))), metal: Math.max(0, Math.min(1, (last.metal ?? .4) + r() * .45 * amount)), feedback: Math.max(0, Math.min(.97, (last.feedback ?? .85) + r() * .12 * amount)) };
      automationTime = at; retune(rp, at, .035); sides.forEach(s => set(s.lp.frequency, rp.tone)); set(fbAmt.gain, rp.feedback); };
  } else if (type === "gain") {
    // Clean gain (after Airwindows PurestGain): a single smoothed multiply, no colour.
    const g = ctx.createGain(); nodes.push(g); input.connect(g).connect(wet);
    apply = p => { const db = p.level !== undefined ? gainPosToDb(p.level) : p.gain ?? 0; g.gain.setTargetAtTime(db === -Infinity ? 0 : 10 ** (db / 20), ctx.currentTime, .006); };
  } else if (type === "djfilter") {
    const lp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter(); hp.type = "highpass"; nodes.push(lp, hp); input.connect(lp).connect(hp).connect(wet);
    apply = p => { set(lp.frequency, p.sweep < 0 ? 20000 * (40 / 20000) ** -p.sweep : 20000); set(hp.frequency, p.sweep > 0 ? 20 * (16000 / 20) ** p.sweep : 20); set(lp.Q, p.sweep < 0 ? p.resonance : .1); set(hp.Q, p.sweep > 0 ? p.resonance : .1); };
  } else if (type === "reverseDelay") {
    const n = worklet("nad-reverse-delay"); input.connect(n).connect(wet);
    apply = p => { const b = beatsOf(p); wp(n, { ...p, time: b ? Math.min(1.5, b * 60 / fxBpm) : p.time }, ["time", "feedback"]); };
  } else if (type === "sidechain") {
    const n = worklet("nad-duck", 2), key = ctx.createGain(); key.connect(n, 0, 1); nodes.push(key); keyInput = key; input.connect(n).connect(wet);
    apply = p => wp(n, p, ["threshold", "ratio", "depth", "attack", "release"]);
  } else if (type === "dyneq") {
    const n = worklet("nad-dyneq", 2), key = ctx.createGain(); key.connect(n, 0, 1); nodes.push(key); keyInput = key; input.connect(n).connect(wet);
    apply = p => wp(n, p, ["freq", "gain", "threshold", "q"]);
  } else if (type === "neurobox") {
    // Mono sub below 150 Hz stays clean; above it: REESE (two slowly drifting detuned delays, L/R) -> GROWL (asymmetric fold)
    // -> SQUELCH (two vowel formants pushed by the input envelope) -> DISP (allpass dispersion) -> auto tone tilt.
    const lp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter(), sub = ctx.createGain(); lp.frequency.value = hp.frequency.value = 150; hp.type = "highpass";
    sub.channelCount = 1; sub.channelCountMode = "explicit"; input.connect(lp).connect(sub).connect(wet);
    const direct = ctx.createGain(), merge = ctx.createChannelMerger(2), rs = ctx.createGain(), pre = ctx.createGain(), sh = ctx.createWaveShaper(), post = ctx.createGain();
    sh.oversample = eco ? "none" : "2x"; nodes.push(lp, hp, sub, direct, merge, rs, pre, sh, post);
    input.connect(hp); hp.connect(direct).connect(pre);
    const mods = [0, 1].map(ch => { const d = ctx.createDelay(.05), m = lfo(); d.delayTime.value = .008; m.o.frequency.value = ch ? .37 : .29; m.g.connect(d.delayTime); hp.connect(d); d.connect(merge, 0, ch); nodes.push(d); return m; });
    merge.connect(rs).connect(pre); pre.connect(sh).connect(post);
    const env = follower(), f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(); f1.type = f2.type = "peaking"; nodes.push(f1, f2); env.connect(f1.frequency); env.connect(f2.frequency);
    post.connect(f1).connect(f2);
    const aps = Array.from({ length: 4 }, (_, i) => { const a = ctx.createBiquadFilter(); a.type = "allpass"; a.frequency.value = 250 * 1.8 ** i; nodes.push(a); return a; });
    const dd = ctx.createGain(), dw = ctx.createGain(), tilt = ctx.createBiquadFilter(); tilt.type = "highshelf"; tilt.frequency.value = 5000; nodes.push(dd, dw, tilt);
    f2.connect(dd).connect(tilt); f2.connect(aps[0]); aps.reduce((a, b) => (a.connect(b), b)).connect(dw).connect(tilt); tilt.connect(wet);
    let gk = -1;
    apply = p => { const r = p.reese ?? .35, g = p.growl ?? .4, sq = p.squelch ?? .3, ds = p.disp ?? .25;
      mods.forEach(m => set(m.g.gain, r * .0025)); set(direct.gain, 1 - r * .6); set(rs.gain, r * .8);
      const q = Math.round(g * 40); if (q !== gk) { gk = q; const k = 1 + q / 40 * 6; sh.curve = Float32Array.from({ length: 2048 }, (_, i) => { const x = (i / 1023.5 - 1) * k + q / 40 * .3; return Math.sin(x * 1.3) * .7 + Math.tanh(x) * .3; }); }
      set(pre.gain, 1); set(post.gain, curveComp(sh.curve) * .9);
      set(f1.frequency, 450); set(f2.frequency, 1300); set(f1.gain, sq * 12); set(f2.gain, sq * 9); set(f1.Q, 2 + sq * 4); set(f2.Q, 2 + sq * 4); set(env.gain, sq * 2600);
      aps.forEach(a => set(a.Q, .3 + ds * 6)); set(dw.gain, ds); set(dd.gain, 1 - ds * .7); set(tilt.gain, -g * 5); };
  } else if (type === "spectral") {
    // Spectral gate: 512-point FFT frames; AMOUNT keeps only the loudest bins (0 = clean, 1 = a few glassy partials).
    const n = worklet("nad-specgate"); input.connect(n).connect(wet);
    apply = p => set(n.parameters.get("amount"), p.amount ?? .5);
  } else if (type === "gate") {
    const n = worklet("nad-gate"); input.connect(n).connect(wet);
    apply = p => wp(n, { ...p, rate: rateOf(p), mask: p.mask ?? 21845, steps: p.steps ?? 16, tight: p.tight ?? 0 }, ["rate", "mask", "steps", "depth", "smooth", "tight"]);
  } else if (type === "saturation") {
    const sh = ctx.createWaveShaper(), lp = ctx.createBiquadFilter(); sh.oversample = eco ? "none" : "4x"; nodes.push(sh, lp);
    input.connect(sh).connect(lp).connect(wet); let k = 0;
    const out = ctx.createGain(); nodes.push(out); lp.disconnect(); lp.connect(out).connect(wet);
    apply = p => { if (p.drive !== k) { k = p.drive; sh.curve = satCurve(k); } set(out.gain, curveComp(sh.curve)); set(lp.frequency, p.tone); };
  } else if (type === "bitcrush") {
    const cr = Tone.getContext().createAudioWorkletNode("nad-crush", { outputChannelCount: [2] }) as unknown as AudioWorkletNode; nodes.push(cr);
    // SP mode, modelled on what makes these machines recognisable:
    // 1 = SP-1200: 26.04 kHz with no anti-alias filter, usually fed pitched-up samples played back down, so aliasing lands
    //     in the audible band (here an effective ~12 kHz hold); 12-bit linear quantising of quiet, gained-down material
    //     (grainy tails); dark resonant SSM2044-style output lowpass; hot input grit.
    // 2 = MPC60: 40 kHz/12-bit but a non-linear DAC and analogue output stage: warm saturation, fat low end, soft top.
    const id = Float32Array.from({ length: 1024 }, (_, i) => i / 511.5 - 1);
    const pre = ctx.createWaveShaper(), lp = ctx.createBiquadFilter(), low = ctx.createBiquadFilter(), gIn = ctx.createGain(), gOut = ctx.createGain();
    lp.type = "lowpass"; low.type = "lowshelf"; low.frequency.value = 110; pre.curve = id; nodes.push(pre, lp, low, gIn, gOut); let mode = -1;
    input.connect(pre).connect(gIn).connect(cr).connect(gOut).connect(lp).connect(low).connect(wet);
    apply = p => { const sp = Math.round(p.sp ?? 0);
      if (sp !== mode) { mode = sp; const d = sp === 1 ? 3 : sp === 2 ? 2.2 : 0; pre.curve = d ? Float32Array.from(id, v => Math.tanh(v * d) / Math.tanh(d)) : id; }
      // Quantise a gained-down signal so 12-bit grain is audible on tails, then restore level.
      set(gIn.gain, sp === 1 ? .12 : sp === 2 ? .2 : 1); set(gOut.gain, sp === 1 ? 1 / .12 : sp === 2 ? 1 / .2 : 1);
      set(cr.parameters.get("bits"), sp ? 12 : p.bits); set(cr.parameters.get("reduce"), sp === 1 ? Math.max(1, ctx.sampleRate / 12000) : sp === 2 ? Math.max(1, ctx.sampleRate / 20000) : p.reduce);
      set(lp.frequency, sp === 1 ? 7500 : sp === 2 ? 11000 : 20000); set(lp.Q, sp === 1 ? 2.2 : sp === 2 ? 1 : .7); set(low.gain, sp === 1 ? 3 : sp === 2 ? 5 : 0); };
  } else if (type === "delay") {
    const d = ctx.createDelay(2), lp = ctx.createBiquadFilter(), fb = ctx.createGain(), w = lfo(); nodes.push(d, lp, fb);
    w.o.frequency.value = 0.7; w.g.connect(d.delayTime);
    input.connect(d).connect(lp).connect(wet); lp.connect(fb).connect(d);
    apply = p => { const b = beatsOf(p); set(d.delayTime, Math.min(b ? b * 60 / fxBpm : p.time, 1.99)); set(fb.gain, p.feedback); set(lp.frequency, p.tone); set(w.g.gain, p.wow * 0.004); };
  } else if (type === "reverb") {
    const cv = ctx.createConvolver(), lp = ctx.createBiquadFilter(); nodes.push(cv, lp); let size = 0;
    input.connect(cv).connect(lp).connect(wet);
    apply = p => { if (Math.round(p.size * 4) !== size) { size = Math.round(p.size * 4); cv.buffer = impulse(ctx, eco ? Math.min(p.size * 0.5, 1.5) : p.size); } set(lp.frequency, p.damp); };
  } else if (type === "chorus" || type === "flanger") {
    const d = ctx.createDelay(0.1), fb = ctx.createGain(), m = lfo(), env = follower(); nodes.push(d, fb);
    input.connect(d).connect(wet); d.connect(fb).connect(d); m.g.connect(d.delayTime); env.connect(d.delayTime);
    apply = p => { const base = p.manual / 1000; set(d.delayTime, base); set(m.o.frequency, rateOf(p)); set(m.g.gain, p.depth * base * 0.9); set(env.gain, p.env * (type === "chorus" ? 0.02 : 0.008)); set(fb.gain, type === "flanger" ? p.feedback : 0); };
  } else if (type === "phaser") {
    // Six true first-order allpass stages create three moving cancellation notches when summed with dry.
    const n = worklet("nad-phaser"); input.connect(n).connect(wet); apply = p => wp(n, { ...p, rate: rateOf(p) }, ["rate", "depth", "manual", "feedback", "env"]);
  } else if (type === "vibrato") {
    // LOFI = cassette warble (ChowTape-style): slow wow + random flutter on the delay time, tape tone roll-off and soft saturation.
    const d = ctx.createDelay(0.05), m = lfo(), wow = lfo(), lp = ctx.createBiquadFilter(), sh = ctx.createWaveShaper(); nodes.push(d, lp, sh); d.delayTime.value = 0.012;
    const flutter = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), fg = ctx.createGain(); fg.gain.value = 0; fl.type = "lowpass"; fl.frequency.value = 9;
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0); for (let k = 0; k < nd.length; k++) nd[k] = Math.random() * 2 - 1;
    flutter.buffer = nb; flutter.loop = true; flutter.connect(fl).connect(fg).connect(d.delayTime); flutter.start(); oscs.push(flutter as unknown as OscillatorNode); nodes.push(flutter, fl, fg);
    sh.curve = Float32Array.from({ length: 1024 }, (_, i) => Math.tanh((i / 511.5 - 1) * 1.6) / Math.tanh(1.6)); lp.type = "lowpass";
    input.connect(d).connect(lp).connect(sh).connect(wet); m.g.connect(d.delayTime); wow.g.connect(d.delayTime); wow.o.frequency.value = .6;
    apply = p => { const lo = (p.lofi ?? 0) >= .5; set(m.o.frequency, rateOf(p)); set(m.g.gain, p.depth * (lo ? 0.0015 : 0.005)); set(wow.g.gain, lo ? p.depth * .004 : 0); set(fg.gain, lo ? p.depth * .02 : 0); set(lp.frequency, lo ? 6500 : 20000); };
  } else if (type === "tremolo") {
    const vca = ctx.createGain(), m = lfo(); nodes.push(vca);
    apply = p => { set(m.o.frequency, rateOf(p)); set(vca.gain, 1 - p.depth / 2); set(m.g.gain, p.depth / 2); };
    m.g.connect(vca.gain); input.connect(vca).connect(wet);
  } else if (type === "compressor") {
    const c = ctx.createDynamicsCompressor(), mk = ctx.createGain(); nodes.push(c, mk);
    input.connect(c).connect(mk).connect(wet);
    apply = p => { set(c.threshold, p.threshold); set(c.ratio, p.ratio); set(c.attack, p.attack); set(c.release, p.release); set(mk.gain, 10 ** (p.makeup / 20)); };
  } else if (type === "noisegate") {
    const n = worklet("nad-ngate"); input.connect(n).connect(wet);
    apply = p => wp(n, p, ["threshold", "attack", "hold", "release", "range"]);
  } else if (type === "drumbus") {
    // TIGHT (tight <-> open) -> SMASH (1176 all-buttons FET) -> TONE tilt -> CLIP (tape-style: lows hit the clipper first).
    const n = worklet("nad-transient"), sm = worklet("nad-smash"), tl = ctx.createBiquadFilter(), th = ctx.createBiquadFilter(), emph = ctx.createBiquadFilter(), drive = ctx.createGain(), sh = ctx.createWaveShaper(), de = ctx.createBiquadFilter(), roll = ctx.createBiquadFilter(), post = ctx.createGain();
    tl.type = "lowshelf"; th.type = "highshelf"; tl.frequency.value = th.frequency.value = 800; emph.type = de.type = "lowshelf"; emph.frequency.value = de.frequency.value = 160; roll.type = "lowpass"; roll.Q.value = .5;
    sh.oversample = eco ? "none" : "2x"; nodes.push(tl, th, emph, drive, sh, de, roll, post);
    input.connect(n).connect(sm).connect(tl).connect(th).connect(emph).connect(drive).connect(sh).connect(de).connect(roll).connect(post).connect(wet); let k = -1;
    apply = p => {
      const t = p.trans ?? Math.max(-1, Math.min(1, (p.sustain ?? 0) - (p.attack ?? 0) * .5)), c = p.clip ?? 0, tone = p.tone ?? 0;
      wp(n, { attack: t < 0 ? -t * .6 : 0, sustain: t }, ["attack", "sustain"]); set(sm.parameters.get("amount"), p.smash ?? 0);
      set(tl.gain, -tone * 8); set(th.gain, tone * 8);
      const e = c * 10; set(emph.gain, e); set(de.gain, -e); set(drive.gain, 1 + c * 2.5); set(roll.frequency, 20000 - c * 11000); set(post.gain, 1 / (1 + c * .6));
      const q = Math.round(c * 20); if (q !== k) { k = q; sh.curve = Float32Array.from({ length: 2048 }, (_, i) => { const x = i / 1023.5 - 1; return Math.tanh(x * (1 + q * .15)) / Math.tanh(1 + q * .15) * .98; }); }
    };
  } else if (type === "ott") {
    // 3-band split; each band squashed hard with big makeup so quiet detail is pulled up and peaks pushed down.
    const mk = ctx.createGain(); nodes.push(mk); mk.connect(wet);
    const band = (lo?: number, hi?: number) => { let n: AudioNode = input;
      for (const [t, f] of [["highpass", lo], ["lowpass", hi]] as const) if (f) { const b = ctx.createBiquadFilter(); b.type = t; b.frequency.value = f; b.Q.value = 0.5; nodes.push(b); n.connect(b); n = b; }
      const c = ctx.createDynamicsCompressor(), g = ctx.createGain(); c.knee.value = 6; nodes.push(c, g); n.connect(c).connect(g).connect(mk); return { c, g }; };
    const bands = [band(undefined, 120), band(120, 2500), band(2500)];
    apply = p => { bands.forEach(({ c, g }) => { set(c.threshold, -10 - p.depth * 40); set(c.ratio, 1 + p.depth * 19); set(c.attack, 0.001 + (1 - p.speed) * 0.05); set(c.release, 0.03 + (1 - p.speed) * 0.4); set(g.gain, 10 ** ((p.depth * 18) / 20)); }); set(mk.gain, 10 ** (p.makeup / 20)); };
  } else {
    const aps = Array.from({ length: 4 }, () => { const a = ctx.createBiquadFilter(); a.type = "allpass"; a.Q.value = 0.7; return a; });
    const fb = ctx.createGain(), m = lfo(), env = follower(); nodes.push(...aps, fb);
    input.connect(aps[0]); aps.reduce((a, b) => (a.connect(b), b)).connect(wet); aps[3].connect(fb).connect(aps[0]);
    aps.forEach(a => { m.g.connect(a.frequency); env.connect(a.frequency); });
    apply = p => { aps.forEach((a, i) => set(a.frequency, p.manual * (1 + i * 0.5))); set(m.o.frequency, rateOf(p)); set(m.g.gain, p.depth * p.manual * 0.8); set(env.gain, p.env * 6000); set(fb.gain, p.feedback); };
  }
  const update = (p: Record<string, number>, at = ctx.currentTime) => { automationTime = at; const mix = p.mix ?? (type === "ott" ? p.depth : 1); apply(p); set(wet.gain, type === "ott" ? 1 : mix); set(dry.gain, type === "ott" ? 0 : 1 - mix); };
  update(init);
  return { input, output, update, levels: () => ({ input: meterDb(inputMeter, inputData), output: meterDb(outputMeter, outputData) }), keyInput, setPitch, trigger, dispose: () => { oscs.forEach(o => o.stop()); nodes.forEach(n => n.disconnect()); } };
}

/** Relative CPU cost of each effect; the whole groovebox may hold at most MAX_FX_LOAD (Zoom MS-50G style). */
export const FX_COST: Record<FxType, number> = { saturation: 2, bitcrush: 2, delay: 3, reverb: 6, chorus: 2, flanger: 2, phaser: 3, vibrato: 1, tremolo: 1, gate: 1, compressor: 2, metal: 4, spectral: 5, sidechain: 2, djfilter: 1, reverseDelay: 3, acid: 3, eq: 1, noisegate: 1, drumbus: 4, ott: 5, gain: 1, neurobox: 4, dyneq: 2 } as Record<FxType, number>;
export const MAX_FX_LOAD = 90;
export const fxLoad = (lists: FxUnit[][]) => lists.reduce((a, l) => a + l.reduce((b, f) => b + (FX_COST[f.type] ?? 2), 0), 0);
/** Parameters a step-sequencer row can modulate for each effect (mix/amount for everything, more for the core four). */
export const MOD_PARAMS: Partial<Record<FxType, string[]>> = { reverb: ["mix", "size"], delay: ["mix", "time", "feedback"], metal: ["mix", "note", "feedback"], eq: ["low", "mid", "high"], neurobox: ["reese", "growl", "squelch"], dyneq: ["gain", "freq", "mix"] };
export const modParamsOf = (t: FxType) => MOD_PARAMS[t] ?? [t === "ott" ? "depth" : "mix"];
export const MOD_LABEL: Record<string, string> = { mix: "amount", size: "decay", time: "time", feedback: "feedback", depth: "amount", low: "low", mid: "mid", high: "high", reese: "reese", growl: "growl", squelch: "squelch", gain: "gain", freq: "freq" };
/** Maps a 0..1 lane value onto the param's real range. */
export const modValue = (t: FxType, k: string, v: number) => { const r = (FX_DEFS[t].params as Record<string, Range>)[k]; return r ? r[1] + (r[2] - r[1]) * v : v; };
