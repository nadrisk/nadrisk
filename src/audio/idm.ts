import { at, finish, link, noiseBuffer, type Voice } from "./voices";

/** PRC: two modular percussion synths. NOIS (noise source) and VCO (oscillator source) each have six internal
 *  patches (ROUT) wired from real modules: resonators, folders, ring/frequency shifters, combs, cross-feedback filters,
 *  delay feedback loops. Shared knobs: TUNE, P.ENV (bipolar pitch envelope), model knob a (COLR / FOLD), snappy DEC.
 *  Every feedback loop runs through a DelayNode with gain < 1 and a soft clipper, and the voice graph is torn down at the end. */
export type IdmModel = "nois" | "vco";
export type IdmParams = { model: IdmModel; rout: number; tune: number; a: number; penv: number; decay: number; grit: number; drive: number;
  /** Legacy fields, kept so old sets load. */ b?: number; c?: number; bend?: number; preset?: string };
export const IDM_MODELS: IdmModel[] = ["nois", "vco"];
export const IDM_LABEL: Record<IdmModel, string> = { nois: "NOIS", vco: "VCO" };
export const IDM_ROUTS: Record<IdmModel, string[]> = { nois: ["METL", "FOLD", "SHFT", "GRAN", "X-FB", "COLL"], vco: ["C-FM", "X-MOD", "PLUK", "R-FLD", "SYNC", "X-FB"] };
/** Module chain per routing, drawn on the ROUT screen. */
export const IDM_PATCH: Record<IdmModel, string[][]> = {
  nois: [["NOIS", "RES", "VCA"], ["NOIS", "FOLD", "FLT", "VCA"], ["NOIS", "SHFT", "COMB", "VCA"], ["NOIS", "GRN", "BP", "VCA"], ["NOIS", "LP+BP", "XFB", "VCA"], ["NOIS", "DLY", "FOLD", "FB"]],
  vco: [["VCO1", "FM", "VCO2", "FOLD"], ["VCO1", "X", "VCO2", "VCA"], ["IMP", "DLY", "LPF", "FB"], ["VCO", "FOLD", "MODE", "VCA"], ["VCO1", "SYNC", "SHFT", "VCA"], ["VCO", "LP+BP", "XFB", "VCA"]],
};
export const IDM_MODEL_KNOB: Record<IdmModel, string> = { nois: "COLR", vco: "FOLD" };
export const IDM_MIN_DECAY = .005, IDM_MAX_DECAY = .15;
/** Starting sound per engine (DRV always starts at 0). */
export const IDM_INIT: Record<IdmModel, Omit<IdmParams, "model">> = {
  nois: { rout: 0, tune: 1200, a: .4, penv: .2, decay: .06, grit: 0, drive: 0 },
  vco: { rout: 0, tune: 160, a: .35, penv: .45, decay: .09, grit: 0, drive: 0 },
};
export const defaultIdm = (model: IdmModel = "nois"): IdmParams => ({ model, ...IDM_INIT[model] });
/** Retired models load as the closest engine + routing (shared DEC/GRIT/DRV kept). */
const LEGACY: Record<string, [IdmModel, number]> = { metl: ["nois", 0], zap: ["vco", 4], clik: ["nois", 3], shrd: ["nois", 3], ping: ["vco", 2], modl: ["vco", 3] };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
export function idmParams(p?: Partial<IdmParams>): IdmParams {
  const raw = p?.model as string | undefined, legacy = raw ? LEGACY[raw] : undefined;
  const model: IdmModel = legacy?.[0] ?? (raw && IDM_MODELS.includes(raw as IdmModel) ? raw as IdmModel : "nois");
  const d = defaultIdm(model);
  const q = legacy ? { ...d, rout: legacy[1], decay: p?.decay, grit: p?.grit, drive: p?.drive } : { ...d, ...p };
  return { ...q, model, rout: Math.round(clamp(q.rout ?? 0, 0, 5)), tune: clamp(q.tune ?? d.tune, 20, 12000), a: clamp(q.a ?? d.a, 0, 1), penv: clamp(q.penv ?? 0, -1, 1),
    decay: clamp(q.decay ?? d.decay, IDM_MIN_DECAY, IDM_MAX_DECAY), grit: clamp(q.grit ?? 0, 0, 1), drive: clamp(q.drive ?? 0, 0, 1) };
}

const curves = new Map<string, Float32Array<ArrayBuffer>>();
const curve = (key: string, f: (x: number) => number) => { let c = curves.get(key); if (c) return c; c = new Float32Array(new ArrayBuffer(1024 * 4)); for (let i = 0; i < 1024; i++) c[i] = f(i / 511.5 - 1); curves.set(key, c); return c; };
const q20 = (v: number) => Math.round(v * 20) / 20;
/** Bit-step curve: GRIT 0 = 8 bit, 1 = 2 bit. */
const stepCurve = (g: number) => { const k = q20(g), lv = 2 ** (8 - k * 6) / 2; return curve(`s${k}`, x => Math.round(x * lv) / lv); };
/** Serge-style sine folder blended with the clean signal; f 0 = clean. */
export const foldCurve = (f: number) => { const k = q20(f), g = 1 + k * k * 15; return curve(`f${k}`, x => { const y = (1 - k) * x + k * Math.sin(g * x * Math.PI / 2); return Math.tanh(y * (1 + k)) / Math.tanh(1 + k); }); };
const tanhCurve = (d: number) => { const k = q20(d), g = 1 + k * 12; return curve(`t${k}`, x => Math.tanh(g * x) / Math.tanh(g)); };
const SOFT = () => curve("soft", x => Math.tanh(x * 1.5));

export function playIdm(ctx: BaseAudioContext, dest: AudioNode, p0: IdmParams, t: number, vel = 1, semi = 0): Voice {
  const p = idmParams(p0), nodes: AudioNode[] = [], srcs: AudioScheduledSourceNode[] = [];
  const amp = ctx.createGain(); amp.gain.value = 0; link(amp, dest); nodes.push(amp);
  const bus = ctx.createGain(); nodes.push(bus); let tail: AudioNode = bus;
  if (p.drive > 0) { const w = ctx.createWaveShaper(), g = ctx.createGain(); w.curve = tanhCurve(p.drive); g.gain.value = 1 / (1 + p.drive); tail.connect(w).connect(g); nodes.push(w, g); tail = g; }
  if (p.grit > 0) { const w = ctx.createWaveShaper(), wet = ctx.createGain(), dry = ctx.createGain(), sum = ctx.createGain(); w.curve = stepCurve(p.grit); wet.gain.value = p.grit; dry.gain.value = 1 - p.grit * .7; tail.connect(w).connect(wet).connect(sum); tail.connect(dry).connect(sum); nodes.push(w, wet, dry, sum); tail = sum; }
  // Final safety clip so no routing can exceed full scale.
  const safe = ctx.createWaveShaper(); safe.curve = SOFT(); tail.connect(safe).connect(amp); nodes.push(safe);
  const hz = clamp(p.tune * 2 ** (semi / 12), 20, 16000), dec = p.decay, span = .004 + dec * .5, A = p.a;
  /** Bipolar pitch envelope: + dives from up to 4 oct above, − scoops up from 2 oct below. */
  const sweep = (fp: AudioParam, f: number, mul = 1) => { const to = clamp(f, 10, 20000), s = clamp(to * 2 ** (p.penv >= 0 ? p.penv * 4 * mul : p.penv * 2 * mul), 10, 20000); fp.setValueAtTime(s, t); fp.exponentialRampToValueAtTime(to, t + span); };
  const G = (v: number) => { const g = ctx.createGain(); g.gain.value = v; nodes.push(g); return g; };
  const F = (type: BiquadFilterType, f: number, Q: number) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = clamp(f, 10, 20000); b.Q.value = Q; nodes.push(b); return b; };
  const W = (c: Float32Array<ArrayBuffer>) => { const w = ctx.createWaveShaper(); w.curve = c; nodes.push(w); return w; };
  const D = (s: number) => { const d = ctx.createDelay(.05); d.delayTime.value = clamp(s, 1 / 20000, .05); nodes.push(d); return d; };
  const osc = (type: OscillatorType, f: number, mul = 1) => { const o = at(ctx.createOscillator(), t); o.type = type; sweep(o.frequency, f, mul); srcs.push(o); nodes.push(o); return o; };
  const ring = (src: AudioNode, car: AudioNode) => { const r = G(0); src.connect(r); car.connect(r.gain); return r; };
  /** Feedback loop: in → delay → clip → gain (< 1) → back to in. Returns loop gain node. */
  const loop = (input: AudioNode, sec: number, fb: number, through?: AudioNode) => { const d = D(sec), c = W(SOFT()), g = G(Math.min(.92, fb)); input.connect(d); (through ? (d.connect(through), through) : d).connect(c).connect(g).connect(input); return d; };
  const vca = G(1.4); vca.connect(bus);
  if (p.model === "nois") {
    // COLR: dark (lowpassed) → white → bit-stepped crackle.
    const n = at(ctx.createBufferSource(), t); n.buffer = noiseBuffer(ctx); n.loop = true; srcs.push(n); nodes.push(n);
    const col = F("lowpass", 600 * 2 ** (Math.min(A, .6) / .6 * 5), .7); n.connect(col); let src: AudioNode = col;
    if (A > .6) { const w = W(stepCurve((A - .6) / .4)), mx = G(1); col.connect(w).connect(mx); src = mx; }
    switch (p.rout) {
      case 0: { // METL: resonator bank (3 inharmonic tuned bandpasses)
        [1, 1.47, 2.09].forEach((r, k) => { const b = F("bandpass", hz * r, 40 + k * 20); sweep(b.frequency, hz * r, .5); src.connect(b).connect(G(5 / (k + 1))).connect(vca); }); break; }
      case 1: { // FOLD: noise → folder → resonant filter
        const lp = F("lowpass", hz, 9); sweep(lp.frequency, hz * 2); src.connect(G(3)).connect(W(foldCurve(.85))).connect(lp).connect(G(.6)).connect(vca); break; }
      case 2: { // SHFT: noise band ring-shifted by a swept carrier → comb
        const bp = F("bandpass", hz, 4), car = osc("sine", hz * 1.414), sh = ring(src, car); src.connect(bp); bp.connect(sh);
        const comb = G(1); sh.connect(comb); loop(comb, 1 / hz, .75); comb.connect(G(2)).connect(vca); break; }
      case 3: { // GRAN: random particle gate → pitch-swept bandpass
        const gate = G(0), cnt = 4 + Math.round(dec * 120); let x = 1;
        for (let i = 0; i < cnt; i++) { x = (x * 16807) % 2147483647; const s = t + (x / 2147483647) * dec * 1.2, w = .0008 + (i % 3) * .0006; gate.gain.setValueAtTime(1, s); gate.gain.setValueAtTime(0, s + w); }
        const bp = F("bandpass", hz, 12); sweep(bp.frequency, hz); src.connect(gate).connect(bp).connect(G(6)).connect(vca); break; }
      case 4: { // X-FB: parallel LP + BP cross-feeding each other
        const lp = F("lowpass", hz, 14), bp = F("bandpass", hz * 1.5, 18); sweep(lp.frequency, hz); sweep(bp.frequency, hz * 1.5);
        src.connect(lp); src.connect(bp);
        const d1 = D(.0007), d2 = D(.0011), c1 = W(SOFT()), c2 = W(SOFT());
        lp.connect(d1).connect(c1).connect(G(.7)).connect(bp); bp.connect(d2).connect(c2).connect(G(.7)).connect(lp);
        lp.connect(G(.5)).connect(vca); bp.connect(G(1.2)).connect(vca); break; }
      default: { // COLL: noise burst → short delay → folder → feedback
        const burst = G(0); burst.gain.setValueAtTime(1, t); burst.gain.setTargetAtTime(0, t + .001, .002); src.connect(burst);
        const sum = G(1), fold = W(foldCurve(.7)); burst.connect(sum); const d = loop(sum, clamp(1 / hz, .001, .025), .85, fold);
        const dt = clamp(1 / hz, .001, .025); d.delayTime.setValueAtTime(clamp(dt * 2 ** (-p.penv * 2), .0005, .05), t); d.delayTime.linearRampToValueAtTime(dt, t + span);
        fold.connect(G(.9)).connect(vca); }
    }
  } else {
    const fold = (src: AudioNode, amt: number) => src.connect(G(1 + amt * amt * 9)).connect(W(foldCurve(amt)));
    switch (p.rout) {
      case 0: { // C-FM: VCO1 → linear FM → VCO2 → folder
        const m = osc("sine", hz * 1.4), mg = G(0); mg.gain.setValueAtTime(hz * (1 + A * 8), t); mg.gain.setTargetAtTime(hz * .3, t, dec * .3); m.connect(mg);
        const c = osc("sine", hz); mg.connect(c.frequency); fold(c, A).connect(G(.8)).connect(vca); break; }
      case 1: { // X-MOD: VCO1 ↔ VCO2 bidirectional FM (through a sample delay)
        const o1 = osc("sine", hz), o2 = osc("triangle", hz * 1.73), g1 = G(hz * (1 + A * 5)), g2 = G(hz * (.5 + A * 4));
        o1.connect(g1).connect(o2.frequency); o2.connect(D(1 / 44100)).connect(g2).connect(o1.frequency); o1.connect(G(.6)).connect(vca); o2.connect(G(.4)).connect(vca); break; }
      case 2: { // PLUK: impulse → tuned delay → lowpass damping → feedback (Karplus-Strong)
        const imp = osc("square", hz * 3, .3), ig = G(0); ig.gain.setValueAtTime(1, t); ig.gain.setValueAtTime(0, t + Math.min(.004, 1 / hz)); imp.connect(ig);
        const sum = G(1), lp = F("lowpass", 1500 + (1 - A) * 9000, .5); ig.connect(sum); const d = loop(sum, 1 / hz, .9 + A * .02, lp);
        d.delayTime.setValueAtTime(clamp(1 / (hz * 2 ** (p.penv * 1.5)), 1 / 20000, .05), t); d.delayTime.exponentialRampToValueAtTime(clamp(1 / hz, 1 / 20000, .05), t + span);
        lp.connect(G(1.2)).connect(vca); break; }
      case 3: { // R-FLD: VCO → folder → modal resonator bank
        const o = osc("triangle", hz), f = fold(o, .3 + A * .7);
        [1, 2.76, 5.4].forEach((r, k) => { const b = F("bandpass", hz * r, 7); f.connect(b).connect(G(1.4 / (k + 1))).connect(vca); }); f.connect(G(.7)).connect(vca); break; }
      case 4: { // SYNC: master-locked slave sweep (AM by master saw) → frequency shifter (ring)
        const mst = osc("sawtooth", hz), slv = osc("sawtooth", hz * (2 + A * 6), 1.5), am = ring(slv, mst), car = osc("sine", hz * .5);
        const sh = ring(am, car); am.connect(G(.5)).connect(vca); sh.connect(G(.7)).connect(vca); break; }
      default: { // X-FB: VCO → parallel filters → saturating cross-feedback
        const o = osc("sawtooth", hz), lp = F("lowpass", hz * 2, 12), bp = F("bandpass", hz * 3, 14); sweep(lp.frequency, hz * 2); o.connect(lp); o.connect(bp);
        const d1 = D(.0009), d2 = D(.0013); lp.connect(d1).connect(W(SOFT())).connect(G(.6 + A * .25)).connect(bp); bp.connect(d2).connect(W(SOFT())).connect(G(.6 + A * .25)).connect(lp);
        lp.connect(G(.6)).connect(vca); bp.connect(G(.8)).connect(vca); }
    }
  }
  amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(vel, t + .001);
  amp.gain.setTargetAtTime(0, t + .001, dec / 2.5);
  const end = t + dec * 2.5 + .06;
  if (!srcs.length) { const k = at(ctx.createConstantSource(), t); const z = G(0); k.connect(z); srcs.push(k); nodes.push(k); }
  return finish(srcs, nodes, end, amp);
}
