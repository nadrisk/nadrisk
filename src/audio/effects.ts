import * as Tone from "tone";

// [default, min, max, step]
type Range = [number, number, number, number];
export const FX_DEFS = {
  saturation: { label: "saturate~", params: { drive: [4, 1, 30, 0.1], tone: [9000, 500, 16000, 10], mix: [1, 0, 1, 0.01] } },
  bitcrush: { label: "degrade~", params: { bits: [6, 1, 16, 1], reduce: [4, 1, 40, 1], mix: [1, 0, 1, 0.01] } },
  delay: { label: "tape.delay~", params: { time: [0.375, 0.01, 1.5, 0.005], feedback: [0.45, 0, 0.95, 0.01], tone: [3000, 300, 12000, 10], wow: [0.3, 0, 1, 0.01], mix: [0.35, 0, 1, 0.01] } },
  reverb: { label: "reverb~", params: { size: [2.5, 0.2, 8, 0.1], damp: [6000, 500, 16000, 10], mix: [0.3, 0, 1, 0.01] } },
  chorus: { label: "chorus~", params: { rate: [0.8, 0, 8, 0.01], depth: [0.5, 0, 1, 0.01], manual: [15, 5, 30, 0.1], env: [0, 0, 1, 0.01], mix: [0.5, 0, 1, 0.01] } },
  flanger: { label: "flange~", params: { rate: [0.25, 0, 8, 0.01], depth: [0.6, 0, 1, 0.01], manual: [2, 0.2, 10, 0.1], feedback: [0.6, 0, 0.95, 0.01], env: [0, 0, 1, 0.01], mix: [0.5, 0, 1, 0.01] } },
  phaser: { label: "phase~", params: { rate: [0.4, 0, 8, 0.01], depth: [0.6, 0, 1, 0.01], manual: [800, 100, 5000, 10], feedback: [0.5, 0, 0.9, 0.01], env: [0, 0, 1, 0.01], mix: [0.5, 0, 1, 0.01] } },
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
registerProcessor('nad-crush', Crush); registerProcessor('nad-follow', Follow);`;

let loading: Promise<void> | null = null;
export const loadWorklets = () => (loading ??= Tone.getContext().addAudioWorkletModule(URL.createObjectURL(new Blob([WORKLETS], { type: "application/javascript" }))));

let eco = false;
/** Eco mode trades quality for CPU: no oversampling, shorter reverb tails. */
export const setFxEco = (on: boolean) => { eco = on; };
export const fxEco = () => eco;

export type FxNode = { input: GainNode; output: GainNode; update: (p: Record<string, number>) => void; dispose: () => void };

function satCurve(k: number) { const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } return c; }
function impulse(ctx: BaseAudioContext, sec: number) {
  const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; }
  return b;
}

export function createFx(ctx: BaseAudioContext, type: FxType, init: Record<string, number>): FxNode {
  const input = ctx.createGain(), output = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain();
  input.connect(dry).connect(output); wet.connect(output);
  const nodes: AudioNode[] = [input, output, dry, wet], oscs: OscillatorNode[] = [];
  const set = (p: AudioParam, v: number) => p.setTargetAtTime(v, ctx.currentTime, 0.02);
  const lfo = () => { const o = ctx.createOscillator(), g = ctx.createGain(); g.gain.value = 0; o.connect(g); o.start(); oscs.push(o); nodes.push(o, g); return { o, g }; };
  const follower = () => { const f = Tone.getContext().createAudioWorkletNode("nad-follow", { outputChannelCount: [1] }) as unknown as AudioNode, g = ctx.createGain(); g.gain.value = 0; input.connect(f).connect(g); nodes.push(f, g); return g; };
  let apply: (p: Record<string, number>) => void;

  if (type === "saturation") {
    const sh = ctx.createWaveShaper(), lp = ctx.createBiquadFilter(); sh.oversample = eco ? "none" : "4x"; nodes.push(sh, lp);
    input.connect(sh).connect(lp).connect(wet); let k = 0;
    apply = p => { if (p.drive !== k) { k = p.drive; sh.curve = satCurve(k); } set(lp.frequency, p.tone); };
  } else if (type === "bitcrush") {
    const cr = Tone.getContext().createAudioWorkletNode("nad-crush", { outputChannelCount: [2] }) as unknown as AudioWorkletNode; nodes.push(cr);
    input.connect(cr).connect(wet);
    apply = p => { set(cr.parameters.get("bits")!, p.bits); set(cr.parameters.get("reduce")!, p.reduce); };
  } else if (type === "delay") {
    const d = ctx.createDelay(2), lp = ctx.createBiquadFilter(), fb = ctx.createGain(), w = lfo(); nodes.push(d, lp, fb);
    w.o.frequency.value = 0.7; w.g.connect(d.delayTime);
    input.connect(d).connect(lp).connect(wet); lp.connect(fb).connect(d);
    apply = p => { set(d.delayTime, p.time); set(fb.gain, p.feedback); set(lp.frequency, p.tone); set(w.g.gain, p.wow * 0.004); };
  } else if (type === "reverb") {
    const cv = ctx.createConvolver(), lp = ctx.createBiquadFilter(); nodes.push(cv, lp); let size = 0;
    input.connect(cv).connect(lp).connect(wet);
    apply = p => { if (p.size !== size) { size = p.size; cv.buffer = impulse(ctx, eco ? Math.min(size * 0.5, 1.5) : size); } set(lp.frequency, p.damp); };
  } else if (type === "chorus" || type === "flanger") {
    const d = ctx.createDelay(0.1), fb = ctx.createGain(), m = lfo(), env = follower(); nodes.push(d, fb);
    input.connect(d).connect(wet); d.connect(fb).connect(d); m.g.connect(d.delayTime); env.connect(d.delayTime);
    apply = p => { const base = p.manual / 1000; set(d.delayTime, base); set(m.o.frequency, p.rate); set(m.g.gain, p.depth * base * 0.9); set(env.gain, p.env * (type === "chorus" ? 0.02 : 0.008)); set(fb.gain, type === "flanger" ? p.feedback : 0); };
  } else {
    const aps = Array.from({ length: 4 }, () => { const a = ctx.createBiquadFilter(); a.type = "allpass"; a.Q.value = 0.7; return a; });
    const fb = ctx.createGain(), m = lfo(), env = follower(); nodes.push(...aps, fb);
    input.connect(aps[0]); aps.reduce((a, b) => (a.connect(b), b)).connect(wet); aps[3].connect(fb).connect(aps[0]);
    aps.forEach(a => { m.g.connect(a.frequency); env.connect(a.frequency); });
    apply = p => { aps.forEach((a, i) => set(a.frequency, p.manual * (1 + i * 0.5))); set(m.o.frequency, p.rate); set(m.g.gain, p.depth * p.manual * 0.8); set(env.gain, p.env * 6000); set(fb.gain, p.feedback); };
  }
  const update = (p: Record<string, number>) => { apply(p); set(wet.gain, p.mix); set(dry.gain, 1 - p.mix); };
  update(init);
  return { input, output, update, dispose: () => { oscs.forEach(o => o.stop()); nodes.forEach(n => n.disconnect()); } };
}
