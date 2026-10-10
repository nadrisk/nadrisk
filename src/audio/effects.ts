import * as Tone from "tone";
import { ADVANCED_WORKLETS } from "./advanced";
import { TAPE_WORKLET } from "./tapeWorklet";
import { METER_WORKLET } from "./meterWorklet";

// [default, min, max, step]
type Range = [number, number, number, number];
export const FX_DEFS = {
  saturation: { label: "saturate~", params: { drive: [4, 1, 30, 0.1], tone: [9000, 500, 16000, 10], mix: [1, 0, 1, 0.01] } },
  bitcrush: { label: "degrade~", params: { bits: [6, 1, 16, 1], reduce: [4, 1, 40, 1], mix: [1, 0, 1, 0.01] } },
  delay: { label: "tape.delay~", params: { time: [0.375, 0.01, 1.5, 0.005], sync: [0, 0, 10, 1], feedback: [0.45, 0, 0.95, 0.01], tone: [3000, 300, 12000, 10], wow: [0.3, 0, 1, 0.01], mix: [0.35, 0, 1, 0.01] } },
  reverb: { label: "reverb~", params: { size: [2.5, 0.2, 8, 0.1], damp: [6000, 500, 16000, 10], mix: [0.3, 0, 1, 0.01] } },
  chorus: { label: "chorus~", params: { rate: [0.8, 0, 8, 0.01], sync: [0, 0, 10, 1], depth: [0.5, 0, 1, 0.01], manual: [15, 5, 30, 0.1], env: [0, 0, 1, 0.01], mix: [0.5, 0, 1, 0.01] } },
  flanger: { label: "flange~", params: { rate: [0.25, 0, 8, 0.01], sync: [0, 0, 10, 1], depth: [0.6, 0, 1, 0.01], manual: [2, 0.2, 10, 0.1], feedback: [0.6, 0, 0.95, 0.01], env: [0, 0, 1, 0.01], mix: [0.5, 0, 1, 0.01] } },
  phaser: { label: "phase~", params: { rate: [0.4, 0, 8, 0.01], sync: [0, 0, 10, 1], depth: [0.6, 0, 1, 0.01], manual: [800, 100, 5000, 10], feedback: [0.5, 0, 0.9, 0.01], env: [0, 0, 1, 0.01], mix: [0.5, 0, 1, 0.01] } },
  vibrato: { label: "vibrato~", params: { rate: [5, 0.1, 14, 0.01], sync: [0, 0, 10, 1], depth: [0.4, 0, 1, 0.01], mix: [1, 0, 1, 0.01] } },
  tremolo: { label: "tremolo~", params: { rate: [4, 0.1, 20, 0.01], sync: [5, 0, 10, 1], depth: [0.6, 0, 1, 0.01], mix: [1, 0, 1, 0.01] } },
  gate: { label: "trance.gate~", params: { rate: [8, 0.5, 32, 0.01], sync: [5, 0, 10, 1], depth: [1, 0, 1, 0.01], smooth: [0.3, 0, 1, 0.01], mask: [21845, 0, 65535, 1], steps: [16, 1, 16, 1], mix: [1, 0, 1, 0.01] } },
  compressor: { label: "compress~", params: { threshold: [-24, -60, 0, 0.5], ratio: [4, 1, 20, 0.1], attack: [0.01, 0.001, 0.5, 0.001], release: [0.2, 0.02, 1, 0.01], makeup: [6, 0, 24, 0.5], mix: [1, 0, 1, 0.01] } },
  metal: { label: "res.metal~", params: { time: [0.008, 0.0015, 0.04, 0.0001], feedback: [0.82, 0, 0.96, 0.01], decay: [0.35, 0.02, 2, 0.01], tone: [6000, 300, 16000, 10], mix: [0.4, 0, 1, 0.01], modRate: [4, 0.1, 30, 0.1], modSync: [0, 0, 10, 1], modTime: [0, 0, 1, 0.01], modTone: [0, 0, 1, 0.01], modFb: [0, 0, 1, 0.01] } },
  spectral: { label: "spectral~", params: { freq: [1200, 80, 8000, 10], res: [6, 0.5, 24, 0.1], spread: [1, 0.25, 3, 0.01], peak: [14, 0, 24, 0.5], mix: [1, 0, 1, 0.01] } },
  sidechain: { label: "sidechain~", params: { source: [1, 1, 16, 1], threshold: [-24, -60, 0, 1], ratio: [6, 1, 20, 0.1], depth: [1, 0, 1, 0.01], attack: [0.005, 0.001, 0.1, 0.001], release: [0.2, 0.02, 1, 0.01], mix: [1, 0, 1, 0.01] } },
  djfilter: { label: "dj.filter~", params: { sweep: [0, -1, 1, 0.01], resonance: [0.7, 0.1, 8, 0.1], mix: [1, 0, 1, 0.01] } },
  reverseDelay: { label: "reverse.delay~", params: { time: [0.25, 0.02, 1.5, 0.005], sync: [4, 0, 10, 1], feedback: [0.3, 0, 0.85, 0.01], mix: [0.35, 0, 1, 0.01] } },
  acid: { label: "acid.drive~", params: { drive: [10, 1, 40, 0.1], bias: [0.35, 0, 0.9, 0.01], bite: [1800, 300, 6000, 10], tone: [7000, 800, 16000, 10], mix: [1, 0, 1, 0.01] } },
  eq: { label: "channel.eq~", params: { low: [0, -15, 15, 0.5], lowFreq: [100, 30, 400, 1], mid: [0, -15, 15, 0.5], midFreq: [1000, 200, 8000, 10], q: [1, 0.3, 8, 0.1], high: [0, -15, 15, 0.5], highFreq: [9000, 2000, 16000, 10] } },
  noisegate: { label: "gate~", params: { threshold: [-40, -80, 0, 1], attack: [0.001, 0.0005, 0.05, 0.0005], hold: [0.03, 0, 0.5, 0.005], release: [0.12, 0.01, 1.5, 0.01], range: [0, 0, 1, 0.01] } },
  drumbus: { label: "drum.bus~", params: { trans: [0, -1, 1, 0.01], smash: [0.3, 0, 1, 0.01], tone: [0, -1, 1, 0.01], clip: [0.3, 0, 1, 0.01], mix: [1, 0, 1, 0.01] } },
  ott: { label: "ott~", params: { depth: [0.6, 0, 1, 0.01], speed: [0.5, 0, 1, 0.01], makeup: [0, -12, 12, 0.5] } },
} satisfies Record<string, { label: string; params: Record<string, Range> }>;
export type FxType = keyof typeof FX_DEFS;
export const FX_TYPES = Object.keys(FX_DEFS) as FxType[];
export type FxUnit = { id: number; type: FxType; on: boolean; params: Record<string, number> };

let nextId = 1;
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
class SampleHold extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'rate', defaultValue: 4 }]; }
  constructor() { super(); this.ph = 1; this.v = [0, 0, 0]; }
  process(ins, outs, p) {
    const y = outs[0], inc = Math.max(.01, p.rate[0]) / sampleRate;
    for (let n = 0; n < y[0].length; n++) { this.ph += inc; if (this.ph >= 1) { this.ph -= 1; this.v = [Math.random(), Math.random(), Math.random()]; } for (let c = 0; c < y.length; c++) y[c][n] = this.v[c] ?? 0; }
    return true;
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
registerProcessor('nad-metalenv', MetalEnv); registerProcessor('nad-sh', SampleHold); registerProcessor('nad-smash', Smash);
registerProcessor('nad-ngate', NGate); registerProcessor('nad-transient', Transient);
registerProcessor('nad-crush', Crush); registerProcessor('nad-follow', Follow);`;

let loading: Promise<void> | null = null;
export const loadWorklets = () => (loading ??= Tone.getContext().addAudioWorkletModule(URL.createObjectURL(new Blob([WORKLETS, ADVANCED_WORKLETS, TAPE_WORKLET, METER_WORKLET], { type: "application/javascript" }))));

let eco = false;
/** Eco mode trades quality for CPU: no oversampling, shorter reverb tails. */
export const setFxEco = (on: boolean) => { eco = on; };
export const fxEco = () => eco;

/** Tempo-sync divisions (index 0 = free). Value is length in quarter-note beats. */
export const SYNC_DIVS: [string, number][] = [["free", 0], ["1/1", 4], ["1/2", 2], ["1/4", 1], ["1/8", 0.5], ["1/16", 0.25], ["1/4T", 2 / 3], ["1/8T", 1 / 3], ["1/16T", 1 / 6], ["1/4.", 1.5], ["1/8.", 0.75]];
let fxBpm = 124;
export const setFxBpm = (b: number) => { fxBpm = b; };
const beatsOf = (p: Record<string, number>) => SYNC_DIVS[Math.round(p.sync ?? 0)]?.[1] ?? 0;
/** LFO rate in Hz, following the tempo when a sync division is chosen. */
const rateOf = (p: Record<string, number>) => { const b = beatsOf(p); return b ? fxBpm / 60 / b : p.rate; };

export type FxLevels = { input: number; output: number };
export type FxNode = { input: GainNode; output: GainNode; update: (p: Record<string, number>, at?: number) => void; levels: () => FxLevels; keyInput?: AudioNode; dispose: () => void };

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
      set(pre.gain, 1); set(peak.frequency, p.bite); set(lp.frequency, p.tone); set(comp.gain, 1 / (1 + p.drive * .02)); };
  } else if (type === "metal") {
    // Envelope-gated comb: feedback = FDBK x input envelope (DCY sets how long it stays open), so the loop can only
    // ring while sound comes in and always dies away. A tanh clip and a 0.9 ceiling keep it from screaming.
    const d = ctx.createDelay(.1), lp = ctx.createBiquadFilter(), fb = ctx.createGain(), fbMod = ctx.createGain(), clip = ctx.createWaveShaper(), env = worklet("nad-metalenv"), fbAmt = ctx.createGain();
    const sh = Tone.getContext().createAudioWorkletNode("nad-sh", { numberOfInputs: 1, outputChannelCount: [3] }) as unknown as AudioWorkletNode, split = ctx.createChannelSplitter(3), mT = ctx.createGain(), mF = ctx.createGain(), mB = ctx.createGain();
    nodes.push(sh, split, mT, mF, mB); sh.connect(split); split.connect(mT, 0); split.connect(mF, 1); split.connect(mB, 2);
    clip.curve = Float32Array.from({ length: 1024 }, (_, i) => Math.tanh(i / 511.5 - 1)); nodes.push(d, lp, fb, fbMod, clip, fbAmt);
    fb.gain.value = 0;
    input.connect(env); env.connect(fbAmt).connect(fb.gain);
    input.connect(d).connect(lp).connect(wet); lp.connect(fb).connect(fbMod).connect(clip).connect(d);
    mT.connect(d.delayTime); mF.connect(lp.detune); mB.connect(fbMod.gain);
    apply = p => {
      const b = SYNC_DIVS[Math.round(p.modSync ?? 0)]?.[1] ?? 0, rate = b ? fxBpm / 60 / b : p.modRate ?? 4, mt = p.modTime ?? 0, mb = p.modFb ?? 0;
      set(d.delayTime, p.time * (1 - mt * .4)); set(lp.frequency, p.tone); set(fbAmt.gain, Math.min(.9, p.feedback));
      set(env.parameters.get("decay"), p.decay ?? .35); set(sh.parameters.get("rate"), rate);
      set(mT.gain, p.time * mt * .8); set(mF.gain, (p.modTone ?? 0) * 2400); set(fbMod.gain, 1 - mb * .5); set(mB.gain, mb * .5);
    };
  } else if (type === "djfilter") {
    const lp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter(); hp.type = "highpass"; nodes.push(lp, hp); input.connect(lp).connect(hp).connect(wet);
    apply = p => { set(lp.frequency, p.sweep < 0 ? 20000 * (40 / 20000) ** -p.sweep : 20000); set(hp.frequency, p.sweep > 0 ? 20 * (16000 / 20) ** p.sweep : 20); set(lp.Q, p.sweep < 0 ? p.resonance : .1); set(hp.Q, p.sweep > 0 ? p.resonance : .1); };
  } else if (type === "reverseDelay") {
    const n = worklet("nad-reverse-delay"); input.connect(n).connect(wet);
    apply = p => { const b = beatsOf(p); wp(n, { ...p, time: b ? Math.min(1.5, b * 60 / fxBpm) : p.time }, ["time", "feedback"]); };
  } else if (type === "sidechain") {
    const n = worklet("nad-duck", 2), key = ctx.createGain(); key.connect(n, 0, 1); nodes.push(key); keyInput = key; input.connect(n).connect(wet);
    apply = p => wp(n, p, ["threshold", "ratio", "depth", "attack", "release"]);
  } else if (type === "spectral") {
    // Resonant spectral band-bank: 8 log-spaced bandpasses around a center frequency. PEAK sets how
    // hard the center bands are emphasized, SPREAD the octave spacing, RES the sharpness — sweeping
    // FREQ moves the whole spectral focus, giving the resonant, harmonic-reshaping character.
    const N = 8, bps: BiquadFilterNode[] = [], gains: GainNode[] = [];
    const sum = ctx.createGain(); sum.gain.value = .5; nodes.push(sum);
    const cf = (f: number) => Math.min(16000, Math.max(40, f));
    for (let i = 0; i < N; i++) {
      const b = ctx.createBiquadFilter(); b.type = "bandpass"; const g = ctx.createGain();
      nodes.push(b, g); input.connect(b).connect(g).connect(sum); bps.push(b); gains.push(g);
    }
    sum.connect(wet);
    apply = p => {
      for (let i = 0; i < N; i++) {
        const d = (i - (N - 1) / 2) / (N / 2);
        set(bps[i].frequency, cf(p.freq * 2 ** (d * p.spread * 2))); set(bps[i].Q, p.res);
        set(gains[i].gain, 2 * 10 ** (p.peak * Math.exp(-d * d * 2.2) / 20) / N);
      }
    };
  } else if (type === "gate") {
    const n = worklet("nad-gate"); input.connect(n).connect(wet);
    apply = p => wp(n, { ...p, rate: rateOf(p), mask: p.mask ?? 21845, steps: p.steps ?? 16 }, ["rate", "mask", "steps", "depth", "smooth"]);
  } else if (type === "saturation") {
    const sh = ctx.createWaveShaper(), lp = ctx.createBiquadFilter(); sh.oversample = eco ? "none" : "4x"; nodes.push(sh, lp);
    input.connect(sh).connect(lp).connect(wet); let k = 0;
    apply = p => { if (p.drive !== k) { k = p.drive; sh.curve = satCurve(k); } set(lp.frequency, p.tone); };
  } else if (type === "bitcrush") {
    const cr = Tone.getContext().createAudioWorkletNode("nad-crush", { outputChannelCount: [2] }) as unknown as AudioWorkletNode; nodes.push(cr);
    input.connect(cr).connect(wet);
    apply = p => { set(cr.parameters.get("bits"), p.bits); set(cr.parameters.get("reduce"), p.reduce); };
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
  } else if (type === "vibrato") {
    const d = ctx.createDelay(0.05), m = lfo(); nodes.push(d); d.delayTime.value = 0.006;
    input.connect(d).connect(wet); m.g.connect(d.delayTime);
    apply = p => { set(m.o.frequency, rateOf(p)); set(m.g.gain, p.depth * 0.005); };
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
    // TRANS (tight <-> open) -> SMASH (1176 all-buttons FET) -> TONE tilt -> CLIP (tape-style: lows hit the clipper first).
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
  return { input, output, update, levels: () => ({ input: meterDb(inputMeter, inputData), output: meterDb(outputMeter, outputData) }), keyInput, dispose: () => { oscs.forEach(o => o.stop()); nodes.forEach(n => n.disconnect()); } };
}

/** Relative CPU cost of each effect; the whole groovebox may hold at most MAX_FX_LOAD (Zoom MS-50G style). */
export const FX_COST: Record<FxType, number> = { saturation: 2, bitcrush: 2, delay: 3, reverb: 6, chorus: 2, flanger: 2, phaser: 3, vibrato: 1, tremolo: 1, gate: 1, compressor: 2, metal: 4, spectral: 5, sidechain: 2, djfilter: 1, reverseDelay: 3, acid: 3, eq: 1, noisegate: 1, drumbus: 4, ott: 5 } as Record<FxType, number>;
export const MAX_FX_LOAD = 90;
export const fxLoad = (lists: FxUnit[][]) => lists.reduce((a, l) => a + l.reduce((b, f) => b + (FX_COST[f.type] ?? 2), 0), 0);
/** Parameters a step-sequencer row can modulate for each effect (mix/amount for everything, more for the core four). */
export const MOD_PARAMS: Partial<Record<FxType, string[]>> = { reverb: ["mix", "size"], delay: ["mix", "time", "feedback"], metal: ["mix", "time", "feedback"], eq: ["low", "mid", "high"] };
export const modParamsOf = (t: FxType) => MOD_PARAMS[t] ?? [t === "ott" ? "depth" : "mix"];
export const MOD_LABEL: Record<string, string> = { mix: "amount", size: "decay", time: "time", feedback: "feedback", depth: "amount", low: "low", mid: "mid", high: "high" };
/** Maps a 0..1 lane value onto the param's real range. */
export const modValue = (t: FxType, k: string, v: number) => { const r = (FX_DEFS[t].params as Record<string, Range>)[k]; return r ? r[1] + (r[2] - r[1]) * v : v; };
