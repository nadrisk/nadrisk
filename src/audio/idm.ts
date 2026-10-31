import { at, finish, link, noiseBuffer, type Voice } from "./voices";

/** IDM: experimental drum voices. METL = FM metal cluster, PING = struck modal membrane,
 *  CLIK = glitch micro-impulse, SHRD = chopped digital noise. a/b/c are the model's three tone knobs. */
export type IdmModel = "metl" | "ping" | "clik" | "shrd";
export type IdmParams = { model: IdmModel; tune: number; a: number; b: number; c: number; decay: number; bend: number; grit: number; drive: number; preset?: string };
export const IDM_MODELS: IdmModel[] = ["metl", "ping", "clik", "shrd"];
export const IDM_LABEL: Record<IdmModel, string> = { metl: "METL", ping: "PING", clik: "CLIK", shrd: "SHRD" };
/** Knob names for a/b/c per model (TUNE is always first). */
export const IDM_KNOBS: Record<IdmModel, [string, string, string, string]> = {
  metl: ["TUNE", "FM", "RATIO", "BRIT"], ping: ["TUNE", "RES", "BODY", "DAMP"], clik: ["PTCH", "SNAP", "CRSH", "TONE"], shrd: ["TONE", "RATE", "STEP", "Q"],
};
/** Starting sound per model: loaded when the model changes and used as each knob's double-tap home. */
export const IDM_INIT: Record<IdmModel, Omit<IdmParams, "model">> = {
  metl: { tune: 520, a: .55, b: .35, c: .6, decay: .35, bend: 0, grit: 0, drive: .1 },
  ping: { tune: 180, a: .6, b: .5, c: .35, decay: .6, bend: -3, grit: 0, drive: 0 },
  clik: { tune: 900, a: .2, b: .4, c: .6, decay: .05, bend: -24, grit: .2, drive: .2 },
  shrd: { tune: 3000, a: .45, b: .5, c: .3, decay: .22, bend: 0, grit: .35, drive: .15 },
};
export const defaultIdm = (model: IdmModel = "metl"): IdmParams => ({ model, ...IDM_INIT[model] });
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
export function idmParams(p?: Partial<IdmParams>): IdmParams {
  const model = p?.model && IDM_MODELS.includes(p.model) ? p.model : "metl", q = { ...defaultIdm(model), ...p, model };
  return { ...q, tune: clamp(q.tune, 20, 12000), a: clamp(q.a, 0, 1), b: clamp(q.b, 0, 1), c: clamp(q.c, 0, 1), decay: clamp(q.decay, .01, 3), bend: clamp(q.bend, -48, 48), grit: clamp(q.grit, 0, 1), drive: clamp(q.drive, 0, 1) };
}

const stepCache = new Map<number, Float32Array<ArrayBuffer>>();
/** Bit-step curve: GRIT 0 = 8 bit, 1 = 2 bit. */
const stepCurve = (g: number) => { const k = Math.round(g * 20) / 20; let c = stepCache.get(k); if (c) return c; const lv = 2 ** (8 - k * 6) / 2; c = new Float32Array(new ArrayBuffer(1024 * 4)); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.round(x * lv) / lv; } stepCache.set(k, c); return c; };
const tanhCache = new Map<number, Float32Array<ArrayBuffer>>();
const tanhCurve = (d: number) => { const k = Math.round(d * 20) / 20; let c = tanhCache.get(k); if (c) return c; const g = 1 + k * 12; c = new Float32Array(new ArrayBuffer(1024 * 4)); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(g * x) / Math.tanh(g); } tanhCache.set(k, c); return c; };

export function playIdm(ctx: BaseAudioContext, dest: AudioNode, p0: IdmParams, t: number, vel = 1, semi = 0): Voice {
  const p = idmParams(p0), nodes: AudioNode[] = [], srcs: AudioScheduledSourceNode[] = [];
  const amp = ctx.createGain(); amp.gain.value = 0; link(amp, dest); nodes.push(amp);
  const bus = ctx.createGain(); nodes.push(bus); let tail: AudioNode = bus;
  if (p.drive > 0) { const w = ctx.createWaveShaper(), g = ctx.createGain(); w.curve = tanhCurve(p.drive); g.gain.value = 1 / (1 + p.drive); tail.connect(w).connect(g); nodes.push(w, g); tail = g; }
  if (p.grit > 0) { const w = ctx.createWaveShaper(), wet = ctx.createGain(), dry = ctx.createGain(), sum = ctx.createGain(); w.curve = stepCurve(p.grit); wet.gain.value = p.grit; dry.gain.value = 1 - p.grit * .7; tail.connect(w).connect(wet).connect(sum); tail.connect(dry).connect(sum); nodes.push(w, wet, dry, sum); tail = sum; }
  tail.connect(amp);
  const base = p.tune * 2 ** (semi / 12), dec = p.decay;
  // BEND sweeps from +bend semitones down to the tuned pitch (negative = rising into it), over a third of the decay.
  const bendTo = (fp: AudioParam, hz: number, span = dec * .35) => { const s = Math.min(20000, Math.max(10, hz * 2 ** (-p.bend / 12 * -1))); fp.setValueAtTime(s, t); fp.exponentialRampToValueAtTime(Math.max(10, hz), t + Math.max(.004, span)); };
  const osc = (type: OscillatorType, hz: number) => { const o = at(ctx.createOscillator(), t); o.type = type; bendTo(o.frequency, hz); srcs.push(o); nodes.push(o); return o; };
  const noise = () => { const n = at(ctx.createBufferSource(), t); n.buffer = noiseBuffer(ctx); n.loop = true; srcs.push(n); nodes.push(n); return n; };
  const env = (lvl: number, d: number) => { const g = ctx.createGain(); g.gain.setValueAtTime(lvl, t); g.gain.setTargetAtTime(0, t + .0005, Math.max(.001, d) / 3); nodes.push(g); return g; };
  if (p.model === "metl") {
    // Three inharmonic FM pairs (carrier square, modulator sine) through a bright band: cymbal and bell clusters.
    const ratio = 1.41 + p.b * 3.1, hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 400 + p.c * 5000; hp.Q.value = .7; nodes.push(hp); hp.connect(bus);
    [1, 1.483, 2.17].forEach((r, k) => { const c = osc(k ? "square" : "sine", base * r), m = osc("sine", base * r * ratio), mg = env(base * r * p.a * 9, dec * (.6 + p.a * .6));
      m.connect(mg).connect(c.frequency); c.connect(env(.33, dec * (1 - k * .2))).connect(hp); });
  } else if (p.model === "ping") {
    // Short noise strike into four membrane modes; RES narrows them, BODY adds the fundamental, DAMP rolls off upper modes.
    const strike = noise(), sg = env(1, .003); strike.connect(sg);
    [1, 1.594, 2.136, 2.653].forEach((r, k) => { const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bendTo(bp.frequency, base * r); bp.Q.value = 8 + p.a * 260; nodes.push(bp);
      const g = env(6 * (1 - p.c) ** k * (1 + p.a * 2), dec * (1 - k * .15 * p.c)); sg.connect(bp).connect(g).connect(bus); });
    if (p.b > 0) osc("sine", base).connect(env(p.b * .7, dec)).connect(bus);
  } else if (p.model === "clik") {
    // Micro impulse: a sine dropping several octaves in a few ms plus a pulse tick; CRSH folds it, TONE sets brightness.
    const o = osc("sine", base), snap = .002 + p.a * .03; o.frequency.cancelScheduledValues(t); o.frequency.setValueAtTime(Math.min(20000, base * 8), t); o.frequency.exponentialRampToValueAtTime(Math.max(20, base * 2 ** (p.bend / 12)), t + snap);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600 + p.c * 14000; nodes.push(lp); lp.connect(bus);
    let n: AudioNode = o; if (p.b > 0) { const w = ctx.createWaveShaper(); w.curve = stepCurve(.4 + p.b * .6); nodes.push(w); o.connect(w); n = w; }
    n.connect(env(1, dec)).connect(lp);
    const tick = osc("square", base * 2); tick.connect(env(.4 * (1 - p.a), .0015)).connect(lp);
  } else {
    // Shredded noise: band-passed noise chopped by a square gate at RATE, then stepped by STEP.
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bendTo(bp.frequency, base); bp.Q.value = .5 + p.c * 14; nodes.push(bp);
    const chop = ctx.createGain(); chop.gain.value = .5; nodes.push(chop);
    const lfo = at(ctx.createOscillator(), t), lg = ctx.createGain(); lfo.type = "square"; lfo.frequency.value = 8 + p.a * 260; lg.gain.value = .5; lfo.connect(lg).connect(chop.gain); srcs.push(lfo); nodes.push(lfo, lg);
    let n: AudioNode = bp; if (p.b > 0) { const w = ctx.createWaveShaper(); w.curve = stepCurve(p.b); nodes.push(w); bp.connect(w); n = w; }
    noise().connect(bp); n.connect(chop).connect(env(1.4 + p.c, dec)).connect(bus);
  }
  amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(vel, t + .001);
  const end = t + dec * 2 + .08; amp.gain.setTargetAtTime(0, t + dec * 1.3, .02);
  return finish(srcs, nodes, end, amp);
}
