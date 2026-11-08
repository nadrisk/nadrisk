import { at, finish, link, noiseBuffer, type Voice } from "./voices";

/** PRC: three modular percussion engines for intricate IDM hits.
 *  NOIS = noise pinging a resonant filter (TONE, SWP, RES, COLR), VCO = West Coast folded/FM oscillator (TUNE, FM, FOLD, DIVE),
 *  MODL = struck modal resonator (TUNE, STRK, DAMP, INHR). a/b/c are the engine's three tone knobs after TUNE.
 *  Every engine is a percussive hit: DECAY is capped at IDM_MAX_DECAY so nothing grows into a long sound. */
export type IdmModel = "nois" | "vco" | "modl";
export type IdmParams = { model: IdmModel; tune: number; a: number; b: number; c: number; decay: number; bend: number; grit: number; drive: number; preset?: string };
export const IDM_MODELS: IdmModel[] = ["nois", "vco", "modl"];
export const IDM_LABEL: Record<IdmModel, string> = { nois: "NOIS", vco: "VCO", modl: "MODL" };
export const IDM_MIN_DECAY = .005, IDM_MAX_DECAY = .25;
/** Knob names for tune/a/b/c per engine. */
export const IDM_KNOBS: Record<IdmModel, [string, string, string, string]> = {
  nois: ["TONE", "SWP", "RES", "COLR"], vco: ["TUNE", "FM", "FOLD", "DIVE"], modl: ["TUNE", "STRK", "DAMP", "INHR"],
};
/** Starting sound per engine (DRV always starts at 0). */
export const IDM_INIT: Record<IdmModel, Omit<IdmParams, "model">> = {
  nois: { tune: 3200, a: .5, b: .45, c: .2, decay: .06, bend: 0, grit: 0, drive: 0 },
  vco: { tune: 180, a: .3, b: .35, c: .4, decay: .1, bend: 0, grit: 0, drive: 0 },
  modl: { tune: 620, a: .5, b: .4, c: .35, decay: .16, bend: 0, grit: 0, drive: 0 },
};
export const defaultIdm = (model: IdmModel = "nois"): IdmParams => ({ model, ...IDM_INIT[model] });
/** Retired models load as the closest current engine with that engine's starting tone (shared DEC/BEND/GRIT/DRV kept). */
const LEGACY: Record<string, IdmModel> = { metl: "modl", ping: "vco", zap: "vco", clik: "nois", shrd: "nois" };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
export function idmParams(p?: Partial<IdmParams>): IdmParams {
  const raw = p?.model as string | undefined, legacy = raw ? LEGACY[raw] : undefined;
  const model: IdmModel = legacy ?? (raw && IDM_MODELS.includes(raw as IdmModel) ? raw as IdmModel : "nois");
  const q = { ...defaultIdm(model), ...(legacy ? { decay: p?.decay, bend: p?.bend, grit: p?.grit, drive: p?.drive } : p), model } as IdmParams;
  const d = defaultIdm(model);
  return { ...q, tune: clamp(q.tune ?? d.tune, 20, 12000), a: clamp(q.a ?? d.a, 0, 1), b: clamp(q.b ?? d.b, 0, 1), c: clamp(q.c ?? d.c, 0, 1), decay: clamp(q.decay ?? d.decay, IDM_MIN_DECAY, IDM_MAX_DECAY), bend: clamp(q.bend ?? 0, -48, 48), grit: clamp(q.grit ?? 0, 0, 1), drive: clamp(q.drive ?? 0, 0, 1) };
}

const stepCache = new Map<number, Float32Array<ArrayBuffer>>();
/** Bit-step curve: GRIT 0 = 8 bit, 1 = 2 bit. */
const stepCurve = (g: number) => { const k = Math.round(g * 20) / 20; let c = stepCache.get(k); if (c) return c; const lv = 2 ** (8 - k * 6) / 2; c = new Float32Array(new ArrayBuffer(1024 * 4)); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.round(x * lv) / lv; } stepCache.set(k, c); return c; };
const foldCache = new Map<number, Float32Array<ArrayBuffer>>();
/** Lockhart/Serge-style folder: sine fold blended with the clean core; FOLD 0 = clean triangle. */
const foldCurve = (f: number) => { const k = Math.round(f * 20) / 20; let c = foldCache.get(k); if (c) return c; const g = 1 + k * 5; c = new Float32Array(new ArrayBuffer(1024 * 4)); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = (1 - k) * x + k * Math.sin(g * x * Math.PI / 2); } foldCache.set(k, c); return c; };
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
  if (p.model === "nois") {
    // Noise into a resonant band: SWP dives the filter from up to 4 octaves above TONE, RES sets the ping, COLR steps the noise into crackle.
    const n = noise(), bp = ctx.createBiquadFilter(), hz = Math.min(18000, base); bp.type = "bandpass"; bp.Q.value = .5 + p.b * 30; nodes.push(bp);
    bp.frequency.setValueAtTime(Math.min(20000, hz * 2 ** (p.a * 4)), t); bp.frequency.exponentialRampToValueAtTime(Math.max(20, hz * 2 ** (p.bend / 12)), t + .003 + dec * (.15 + (1 - p.a) * .3));
    let src: AudioNode = n; if (p.c > 0) { const w = ctx.createWaveShaper(), wet = ctx.createGain(), dry = ctx.createGain(), sum = ctx.createGain(); w.curve = stepCurve(.5 + p.c * .5); wet.gain.value = p.c; dry.gain.value = 1 - p.c; n.connect(w).connect(wet).connect(sum); n.connect(dry).connect(sum); nodes.push(w, wet, dry, sum); src = sum; }
    src.connect(bp).connect(env(1.2 + p.b * 2, dec)).connect(bus);
  } else if (p.model === "vco") {
    // Triangle core diving DIVE octaves into TUNE, an inharmonic FM modulator decaying fast, then a Lockhart-style folder (FOLD).
    const o = osc("triangle", base), dive = p.c * 4, spd = .004 + dec * .4;
    o.frequency.cancelScheduledValues(t); o.frequency.setValueAtTime(Math.min(20000, base * 2 ** dive), t); o.frequency.exponentialRampToValueAtTime(Math.max(20, base * 2 ** (p.bend / 12)), t + spd);
    if (p.a > 0) { const m = osc("sine", base * 1.73), mg = env(base * p.a * 8, dec * .4); m.connect(mg).connect(o.frequency); }
    const pre = ctx.createGain(), w = ctx.createWaveShaper(), post = ctx.createGain(); pre.gain.value = 1; w.curve = foldCurve(p.b); post.gain.value = .9; nodes.push(pre, w, post);
    o.connect(pre).connect(w).connect(post).connect(env(1, dec)).connect(bus);
  } else {
    // Modal: a short noise strike (STRK = brightness) rings five high-Q partials; DAMP shortens and darkens the upper modes, INHR spreads them.
    const strike = noise(), lp = ctx.createBiquadFilter(), sg = env(1.5, .002 + (1 - p.a) * .006); lp.type = "lowpass"; lp.frequency.value = 800 + p.a * 15000; nodes.push(lp);
    strike.connect(lp).connect(sg);
    const ratios = [1, 2.0, 3.0, 4.0, 5.0].map((h, k) => k ? h + p.c * [0, .76, 2.4, 4.1, 6.7][k] : 1), ring = dec * (1.4 - p.b);
    ratios.forEach((r, k) => { const hz = base * r * 2 ** (p.bend / 12); if (hz > 18000) return; const f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = "bandpass"; f.frequency.value = hz;
      const tau = ring * (1 - p.b * k * .15); f.Q.value = Math.max(2, Math.min(400, Math.PI * hz * Math.max(.005, tau) / 3)); g.gain.value = (k ? .7 / (1 + k * p.b * 1.5) : 1) * 6; nodes.push(f, g); sg.connect(f).connect(g).connect(bus); });
  }
  amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(vel, t + .001);
  const end = t + dec * 2 + .08; amp.gain.setTargetAtTime(0, t + dec * 1.3, .02);
  return finish(srcs, nodes, end, amp);
}
