import { laserParams, laserEnvelopeAt, type LaserParams } from "./laser";
// One-shot voice graphs built on the shared Web Audio context. Each trigger builds fresh nodes so every parameter applies instantly.
export type Wave = "sine" | "triangle" | "sawtooth" | "square";
export type FilterKind = "lowpass" | "highpass" | "bandpass" | "notch";
export type ADSR = { a: number; d: number; s: number; r: number };
export type DrumKind = "kick" | "snare" | "hat" | "clap";
/** Machine fields are optional so older sets load unchanged; drumDefaults() fills them per kind. */
export type DrumMachine = { pAtk?: number; pCurve?: number; pEnd?: number; fmDecay?: number; transient?: number; bodyDecay?: number; noiseDecay?: number; noiseTone?: number; tone2?: number; spread?: number; bursts?: number; burstGap?: number; tail?: number; drive?: number; fltBase?: number; fltWidth?: number };
export type DrumParams = DrumMachine & { kind: DrumKind; pitch: number; pitchEnv: number; pitchDecay: number; env: ADSR; noise: number; fm: number; fmRatio: number; ring: number; ringFreq: number; filter: FilterKind; cutoff: number; res: number; filterEnv: number; filterDecay: number };
export type OscParams = { wave: Wave | "additive"; gain: number; coarse: number; fine: number };
/** partials2 gives oscillator 2 its own additive shape; older sets without it fall back to partials. */
export type SynthParams = { osc1: OscParams; osc2: OscParams & { mode: "mix" | "fm"; fmAmount: number }; partials: number[]; partials2?: number[]; noise: number; env: ADSR; pitchEnvShape: ADSR; filterEnvShape: ADSR; filter: FilterKind; cutoff: number; res: number; filterEnv: number; filterDecay: number; wet: number; pitchEnv: number; pitchDecay: number; lfo: SynthLfo; /** Filter envelope -> FM index, 0-1. */ fenvFm?: number };
/** dests/attack are optional so older sets (single depth + target) still load; lfoDests() fills them. */
export type LfoDests = { pitch: number; cutoff: number; amp: number; osc1: number; osc2: number };
export type SynthLfo = { wave: Wave; rate: number; depth: number; target: "pitch" | "cutoff" | "amp"; attack?: number; dests?: LfoDests; /** true = restart on every note; default free-running per pad. */ retrig?: boolean };
export const lfoDests = (l: SynthLfo): LfoDests => l.dests ?? { pitch: 0, cutoff: 0, amp: 0, osc1: 0, osc2: 0, [l.target]: l.depth };
export type SamplerParams = { start: number; loop: boolean; pitch: number; env: ADSR; sampleName: string; sampleId?: string; reverse?: boolean; grain?: boolean; grainSize?: number; spray?: number; freeze?: boolean; loopEnd?: number; loopXfade?: number; stretch?: boolean; stretchAmt?: number; stretchGrain?: number; warp?: boolean; breakDouble?: boolean; sampleBpm?: number; beats?: number; slices?: number; endFrac?: number; mode?: "one" | "adsr"; end?: number; loopStartF?: number; grainDens?: number; grainRnd?: number; gLfoRate?: number; gLfoAmt?: number; gLfoShape?: "sin" | "tri" | "sqr" | "rnd"; sampleKey?: number; fine?: number };
/** glide(delta) slides the running voice by `delta` semitones over `time` seconds (step-sequencer glide). */
export type Voice = { stop: (at: number) => void; /** Fades out over r seconds from wherever the envelope is; only ever shortens the tail. */ release?: (at: number, r: number) => void; glide?: (delta: number, at: number, time: number) => void; /** Live edits while the note rings (held-pad tweaks). */ update?: (p: Partial<SynthParams> & Partial<PolyParams> & Partial<SirenParams>) => void };
export type Bass808Params = { pitchEnv: number; pitchDecay: number; decay: number; tube: number; harmonics: number; tone: number; click: number };
export const default808 = (): Bass808Params => ({ pitchEnv: 24, pitchDecay: .045, decay: 1.4, tube: .35, harmonics: .4, tone: 4500, click: .3 });
// Deltas are relative to the voice's original pitch (cached as __base), so chained slides land on the right notes.
const glideParams = (ps: AudioParam[], delta: number, at: number, time: number) => ps.forEach(p => { const q = p as AudioParam & { __base?: number }; const b = (q.__base ??= p.value); if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(at); else { p.cancelScheduledValues(at); p.setValueAtTime(p.value, at); } p.setTargetAtTime(b * 2 ** (delta / 12), at, Math.max(.005, time / 3)); });
export type PolyParams = { cutoff: number; res: number; detune: number; sub: number; pulse: number; chorus: number; env: ADSR; fenv?: ADSR; fenvAmt?: number };
export const defaultPoly = (): PolyParams => ({ cutoff: 2200, res: 1.5, detune: 9, sub: .3, pulse: .35, chorus: .35, env: { a: .04, d: .5, s: .65, r: .7 }, fenv: { a: .01, d: .4, s: .3, r: .5 }, fenvAmt: 0 });

const clampF = (f: number) => Math.min(20000, Math.max(20, f));
let noiseCache: { ctx: BaseAudioContext; buf: AudioBuffer } | null = null;
function noiseBuffer(ctx: BaseAudioContext) {
  if (noiseCache?.ctx === ctx) return noiseCache.buf;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noiseCache = { ctx, buf }; return buf;
}

/** Schedules an ADSR on a param; returns the time the voice is silent. */
function adsr(p: AudioParam, t: number, e: ADSR, gate: number, peak: number) {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + e.a);
  p.setTargetAtTime(peak * e.s, t + e.a, e.d / 3 + 0.001);
  const rel = t + Math.max(gate, e.a);
  p.setTargetAtTime(0, rel, e.r / 3 + 0.001);
  return rel + e.r * 1.5 + 0.05;
}

function modAdsr(p: AudioParam, t: number, e: ADSR | undefined, gate: number, base: number, amount: number) {
  e ??= { a: .001, d: .1, s: 0, r: .02 };
  p.setValueAtTime(base, t); p.linearRampToValueAtTime(base + amount, t + e.a);
  p.setTargetAtTime(base + amount * e.s, t + e.a, e.d / 3 + .001);
  const rel = t + Math.max(gate, e.a); p.setTargetAtTime(base, rel, e.r / 3 + .001);
}

/** Holds the gain where it is at `at`, then fades to silence with release r; returns when the voice is silent. */
/** Every voice's amp feeds a dedicated release stage, so fading out never reads or cancels the envelope
 *  (Safari can report stale AudioParam values mid-envelope, which made release jump to silence or full). */
function link(amp: GainNode, dest: AudioNode) { const rg = amp.context.createGain(); rg.gain.value = 1; amp.connect(rg).connect(dest); (amp as GainNode & { __rg?: GainNode }).__rg = rg; }
function fadeOut(amp: GainNode, at: number, r: number) {
  const rg = (amp as GainNode & { __rg?: GainNode }).__rg, g = rg ? rg.gain : amp.gain;
  g.cancelScheduledValues(at); g.setTargetAtTime(0, at, Math.max(.001, r) / 3 + .001);
  return at + Math.max(.001, r) * 1.5 + .06;
}
function finish(srcs: AudioScheduledSourceNode[], nodes: AudioNode[], end: number, amp: GainNode, onClean?: () => void): Voice {
  srcs.forEach(s => { s.start(Math.max(0, (s as unknown as { _t?: number })._t ?? 0)); s.stop(end); });
  let cleaned = false;
  const cleanup = () => { if (cleaned) return; cleaned = true; nodes.forEach(n => n.disconnect()); onClean?.(); };
  const timer = window.setTimeout(cleanup, Math.max(0, (end - amp.context.currentTime) * 1000) + 200);
  srcs[0].onended = () => { clearTimeout(timer); cleanup(); };
  let endT = end;
  return { stop: at => { endT = at; amp.gain.cancelScheduledValues(at); amp.gain.setTargetAtTime(0, at, 0.004); srcs.forEach(s => { try { s.stop(at + 0.04); } catch { /* already stopped */ } }); },
    release: (at, r) => { if (at + r * 1.5 + .06 >= endT) return; endT = fadeOut(amp, at, r); srcs.forEach(s => { try { s.stop(endT); } catch { /* already stopped */ } }); } };
}
const at = <T extends AudioScheduledSourceNode>(s: T, t: number) => { (s as unknown as { _t: number })._t = t; return s; };

function filterWithEnv(ctx: BaseAudioContext, t: number, kind: FilterKind, cutoff: number, res: number, envOct: number, decay: number) {
  const f = ctx.createBiquadFilter(); f.type = kind; f.Q.value = res;
  f.frequency.setValueAtTime(clampF(cutoff * 2 ** envOct), t);
  f.frequency.exponentialRampToValueAtTime(clampF(cutoff), t + decay + 0.001);
  return f;
}

/** Full ADSR on a filter's frequency: attack sweeps to cutoff*2^envOct, decays toward the sustain
 *  octave point, releases back to cutoff. Scheduled directly on frequency (not detune) so every
 *  fresh voice retriggers cleanly, including rapid repeated and overlapping notes. */
function filterEnvAdsr(f: AudioParam, t: number, e: ADSR | undefined, gate: number, cutoff: number, envOct: number) {
  e ??= { a: .001, d: .2, s: 0, r: .02 };
  const base = clampF(cutoff), peak = clampF(cutoff * 2 ** envOct), sus = clampF(cutoff * 2 ** (envOct * e.s));
  f.setValueAtTime(base, t);
  f.linearRampToValueAtTime(peak, t + Math.max(.001, e.a));
  f.setTargetAtTime(sus, t + Math.max(.001, e.a), e.d / 3 + .001);
  const rel = t + Math.max(gate, e.a);
  f.setTargetAtTime(base, rel, e.r / 3 + .001);
}

export const drumDefaults = (k: DrumKind): Required<DrumMachine> => ({ pAtk: 0, pCurve: .7, pEnd: 0, fmDecay: .08, transient: k === "kick" ? .4 : .2, bodyDecay: k === "snare" ? .12 : .3, noiseDecay: k === "snare" ? .18 : .1, noiseTone: k === "clap" ? 1200 : 2500, tone2: k === "clap" ? 2.5 : 1.58, spread: 1, bursts: 4, burstGap: .009, tail: .6, drive: 0, fltBase: 20, fltWidth: 10 });
/** Ready-to-play starting sound per drum machine: loaded on kind switch and used as every knob's double-tap home. */
export const DRUM_INIT: Record<DrumKind, Omit<DrumParams, "kind">> = {
  kick: { pitch: 50, pitchEnv: 38, pitchDecay: .03, pAtk: 0, pCurve: .75, pEnd: 0, fm: .6, fmRatio: 1.5, fmDecay: .03, transient: .7, noise: .01, drive: .25, ring: 0, ringFreq: 800, filter: "lowpass", cutoff: 9000, res: 1, filterEnv: 0, filterDecay: .1, fltBase: 20, fltWidth: 10, env: { a: .001, d: .32, s: 0, r: .06 } },
  snare: { pitch: 200, pitchEnv: 14, pitchDecay: .02, pAtk: 0, pCurve: .7, pEnd: 0, fm: 1.5, fmRatio: 2.4, fmDecay: .04, transient: .5, noise: .65, noiseDecay: .14, noiseTone: 4200, tone2: 1.58, bodyDecay: .09, drive: .2, ring: 0, ringFreq: 800, filter: "lowpass", cutoff: 12000, res: 1, filterEnv: 0, filterDecay: .1, fltBase: 120, fltWidth: 7, env: { a: .001, d: .16, s: 0, r: .05 } },
  hat: { pitch: 420, pitchEnv: 2, pitchDecay: .01, pAtk: 0, pCurve: .7, pEnd: 0, fm: 4, fmRatio: 1.41, fmDecay: .05, transient: .4, noise: .55, spread: 1.1, drive: .1, ring: .5, ringFreq: 3200, filter: "highpass", cutoff: 7500, res: 1, filterEnv: 0, filterDecay: .1, fltBase: 6000, fltWidth: 1.6, env: { a: .001, d: .045, s: 0, r: .02 } },
  clap: { pitch: 1000, pitchEnv: 0, pitchDecay: .01, pAtk: 0, pCurve: .7, pEnd: 0, fm: 0, fmRatio: 1, transient: .2, noise: 1, noiseTone: 1300, tone2: 2.5, bursts: 4, burstGap: .009, tail: .5, drive: .15, ring: 0, ringFreq: 800, filter: "bandpass", cutoff: 1300, res: 1, filterEnv: 0, filterDecay: .1, fltBase: 300, fltWidth: 4.5, env: { a: .001, d: .2, s: 0, r: .05 } },
};
const mach = (p: DrumParams) => ({ ...drumDefaults(p.kind), ...Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) }) as DrumParams & Required<DrumMachine>;

/** Full pitch envelope: optional attack rise to `base*2^(amt/12)`, then a curved fall to `base*2^(end/12)`. Curve 0 = linear glide, 1 = snappy. */
function pitchEnvelope(f: AudioParam, base: number, t: number, amt: number, atk: number, dec: number, curve: number, end: number) {
  const peak = clampF(base * 2 ** (amt / 12)), fin = clampF(base * 2 ** (end / 12)), d = Math.max(.003, dec);
  if (atk > .0005) { f.setValueAtTime(fin, t); f.linearRampToValueAtTime(peak, t + atk); } else f.setValueAtTime(peak, t);
  const k = 1 + curve * 9, n = 48, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const u = i / (n - 1), sh = 1 - (1 - u) ** k; c[i] = peak * (fin / peak) ** sh; }
  f.setValueCurveAtTime(c, t + atk + .0001, d);
}
// Drive curves are cached per 0.05 step so a drum hit never rebuilds a 1024-point table on the pad's critical path.
const driveCache = new Map<number, Float32Array<ArrayBuffer>>();
const driveCurve = (drive: number) => { const q = Math.round(drive * 20) / 20; let c = driveCache.get(q); if (c) return c; const k = 1 + q * 14; c = new Float32Array(new ArrayBuffer(1024 * 4)); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } driveCache.set(q, c); return c; };
const shaper = (ctx: BaseAudioContext, drive: number) => { const w = ctx.createWaveShaper(); w.curve = driveCurve(drive); w.oversample = "2x"; return w; };

export function playDrum(ctx: BaseAudioContext, dest: AudioNode, p0: DrumParams, t: number, vel = 1): Voice {
  const p = mach(p0), nodes: AudioNode[] = [], srcs: AudioScheduledSourceNode[] = [];
  const amp = ctx.createGain(); amp.gain.value = 0; link(amp, dest);
  // Output strip: base-width (HP base, LP base*2^width) -> multimode filter -> drive -> amp.
  const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = clampF(p.fltBase); hp.Q.value = .707;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = clampF(p.fltBase * 2 ** p.fltWidth); lp.Q.value = .707;
  const filt = filterWithEnv(ctx, t, p.filter, p.cutoff, p.res, p.filterEnv, p.filterDecay);
  hp.connect(lp).connect(filt); let tail: AudioNode = filt;
  if (p.drive > 0) { const w = shaper(ctx, p.drive), g = ctx.createGain(); g.gain.value = 1 / (1 + p.drive * 1.5); tail.connect(w).connect(g); nodes.push(w, g); tail = g; }
  tail.connect(amp); nodes.push(hp, lp, filt, amp);
  const bus = hp;
  const sweep = p.pitchEnv * (.6 + .4 * vel);
  const pe = (f: AudioParam, base: number) => pitchEnvelope(f, base, t, sweep, p.pAtk, p.pitchDecay, p.pCurve, p.pEnd);
  const osc = (type: OscillatorType, base: number) => { const o = at(ctx.createOscillator(), t); o.type = type; pe(o.frequency, base); srcs.push(o); nodes.push(o); return o; };
  const decGain = (lvl: number, dec: number, start = t) => { const g = ctx.createGain(); g.gain.setValueAtTime(lvl, start); g.gain.setTargetAtTime(0, start + .001, Math.max(.002, dec) / 3); nodes.push(g); return g; };
  const noise = () => { const n = at(ctx.createBufferSource(), t); n.buffer = noiseBuffer(ctx); n.loop = true; srcs.push(n); nodes.push(n); return n; };
  const fmTo = (targets: AudioParam[], base: number) => { if (p.fm <= 0) return; const m = at(ctx.createOscillator(), t); pe(m.frequency, base * p.fmRatio); const g = decGain(p.fm * base, p.fmDecay); m.connect(g); targets.forEach(x => g.connect(x)); srcs.push(m); nodes.push(m); };
  if (p.kind === "kick") {
    const o = osc("sine", p.pitch); fmTo([o.frequency], p.pitch);
    o.connect(decGain(1 - p.noise * .5, p.env.d * 4)).connect(bus);
    if (p.transient > 0) { const n = noise(), f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 1500; nodes.push(f); n.connect(f).connect(decGain(p.transient * vel * 1.4, .006)).connect(bus); }
    if (p.noise > 0) noise().connect(decGain(p.noise * .4, p.noiseDecay)).connect(bus);
  } else if (p.kind === "snare") {
    const o1 = osc("triangle", p.pitch), o2 = osc("sine", p.pitch * p.tone2); fmTo([o1.frequency, o2.frequency], p.pitch);
    const body = decGain(1 - p.noise * .6, p.bodyDecay); o1.connect(body); o2.connect(body); body.connect(bus);
    const nf = ctx.createBiquadFilter(); nf.type = "highpass"; nf.frequency.value = clampF(p.noiseTone); nodes.push(nf);
    noise().connect(nf).connect(decGain(p.noise * (.7 + .3 * vel), p.noiseDecay)).connect(bus);
  } else if (p.kind === "hat") {
    const R = [1, 1.304, 1.466, 1.787, 1.932, 2.536], sum = ctx.createGain(); sum.gain.value = (1 - p.noise) / 3; nodes.push(sum);
    const os = R.map(r => osc("square", p.pitch * r ** p.spread)); fmTo(os.map(o => o.frequency), p.pitch);
    const ring = ctx.createGain(); ring.gain.value = 1 - p.ring; nodes.push(ring);
    if (p.ring > 0) { const ro = osc("sine", p.ringFreq), rd = ctx.createGain(); rd.gain.value = p.ring; ro.connect(rd).connect(ring.gain); nodes.push(rd); }
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = .8; pe(bp.frequency, p.pitch * 12); nodes.push(bp);
    os.forEach(o => o.connect(ring)); ring.connect(sum).connect(bp).connect(bus);
    noise().connect(decGain(p.noise * .8, p.env.d + .02)).connect(bus);
    if (p.transient > 0) noise().connect(decGain(p.transient * vel * .6, .004)).connect(bus);
  } else {
    // Clap: N short noise bursts then a room tail, all through a band-pass whose centre follows the pitch envelope.
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = p.tone2; pe(bp.frequency, p.noiseTone); nodes.push(bp);
    const g = ctx.createGain(); g.gain.value = 0; nodes.push(g);
    const nb = Math.max(1, Math.round(p.bursts));
    for (let i = 0; i < nb; i++) { const bt = t + i * p.burstGap; g.gain.setValueAtTime(i === nb - 1 ? 1 : .8 + .2 * vel, bt); g.gain.setTargetAtTime(0, bt + .0005, .0025); }
    const tt = t + (nb - 1) * p.burstGap + .002; g.gain.setValueAtTime(p.tail, tt); g.gain.setTargetAtTime(0, tt + .001, Math.max(.01, p.env.d) / 3);
    noise().connect(g).connect(bp).connect(bus);
    const clapEnv: ADSR = { ...p.env, d: p.env.d + (nb - 1) * p.burstGap, a: Math.min(p.env.a, .001) };
    const end = adsr(amp.gain, t, { ...clapEnv, s: 1 }, clapEnv.d + .05, vel * 1.6);
    return finish(srcs, nodes, end, amp);
  }
  const end = adsr(amp.gain, t, p.env, p.env.a + p.env.d, vel);
  return finish(srcs, nodes, end, amp);
}

// PeriodicWaves are cached per context and partial recipe (built once on edit, never per hit), with their real peak
// so FM depth can be sized independently of how loud a recipe is.
const waveCache = new WeakMap<BaseAudioContext, Map<string, { wave: PeriodicWave; peak: number }>>();
export function partialWaveInfo(ctx: BaseAudioContext, partials: number[]) {
  const key = partials.slice(0, 16).map(v => Math.round(v * 100)).join(",");
  let m = waveCache.get(ctx); if (!m) { m = new Map(); waveCache.set(ctx, m); }
  const hit = m.get(key); if (hit) return hit;
  const real = new Float32Array(17), imag = new Float32Array(17);
  // Harmonic additive: index i = harmonic i+1 at (i+1) x the root. Bars are perceptual (squared to amplitude) and the
  // wave is normalised to a fixed peak budget ourselves, so raising one partial adds that tone instead of just
  // turning every other partial down (the default PeriodicWave normalisation hides single-partial edits).
  partials.slice(0, 16).forEach((v, i) => { imag[i + 1] = v * v; });
  const sum = imag.reduce((a, b) => a + b, 0), g = 1 / Math.max(1, sum);
  for (let i = 1; i < 17; i++) imag[i] *= g;
  let peak = 0; for (let k = 0; k < 512; k++) { let y = 0; for (let h = 1; h < 17; h++) if (imag[h]) y += imag[h] * Math.sin(2 * Math.PI * h * k / 512); peak = Math.max(peak, Math.abs(y)); }
  const r = { wave: ctx.createPeriodicWave(real, imag, { disableNormalization: true }), peak: Math.max(.05, peak) };
  if (m.size > 64) m.clear(); m.set(key, r); return r;
}
export const partialWave = (ctx: BaseAudioContext, partials: number[]) => partialWaveInfo(ctx, partials).wave;

export function playSynth(ctx: BaseAudioContext, dest: AudioNode, p: SynthParams, midi: number, t: number, gate: number, vel = 1, freeLfo?: AudioNode): Voice {
  const nodes: AudioNode[] = [], srcs: AudioScheduledSourceNode[] = [];
  const base = 440 * 2 ** ((midi - 69) / 12);
  const amp = ctx.createGain(); amp.gain.value = 0; link(amp, dest);
  const trem = ctx.createGain(); trem.connect(amp);
  const mix = ctx.createGain();
  const filt = ctx.createBiquadFilter(); filt.type = p.filter; filt.Q.value = p.res;
  filterEnvAdsr(filt.frequency, t, p.filterEnvShape, gate, p.cutoff, Math.max(0, p.filterEnv));
  const wet = ctx.createGain(); wet.gain.value = p.wet; const dry = ctx.createGain(); dry.gain.value = 1 - p.wet;
  mix.connect(filt).connect(wet).connect(trem); mix.connect(dry).connect(trem);
  let peak2 = 1;
  const makeOsc = (o: OscParams, partials: number[], isMod = false) => {
    const osc = at(ctx.createOscillator(), t);
    if (o.wave === "additive") { const w = partialWaveInfo(ctx, partials); osc.setPeriodicWave(w.wave); if (isMod) peak2 = w.peak; } else osc.type = o.wave;
    osc.frequency.value = base * 2 ** (o.coarse / 12);
    modAdsr(osc.detune, t, p.pitchEnvShape, gate, Math.max(-50, Math.min(50, o.fine)), p.pitchEnv * 100);
    srcs.push(osc); nodes.push(osc); return osc;
  };
  const o1 = makeOsc(p.osc1, p.partials), o2 = makeOsc(p.osc2, p.partials2 ?? p.partials, true);
  const g1 = ctx.createGain(); g1.gain.value = p.osc1.gain; o1.connect(g1).connect(mix);
  const g2 = ctx.createGain();
  // Serum-style "FM from B": O2 only modulates O1 (never heard) and its GAIN doesn't scale the depth. Depth is a
  // modulation index: deviation = index x modulator frequency / modulator peak, so the timbre tracks the keyboard and
  // O2's PTCH like phase modulation, whatever O2's wave. The filter envelope can add index on top (fenvFm).
  const f2 = base * 2 ** (p.osc2.coarse / 12), fmK = f2 / peak2;
  if (p.osc2.mode === "fm") { const idx = p.osc2.fmAmount * fmK; if (p.fenvFm) modAdsr(g2.gain, t, p.filterEnvShape, gate, idx, p.fenvFm * 10 * fmK); else g2.gain.value = idx; o2.connect(g2).connect(o1.frequency); }
  else { g2.gain.value = p.osc2.gain; o2.connect(g2).connect(mix); }
  const ng = ctx.createGain(); ng.gain.value = p.noise; nodes.push(ng); ng.connect(mix);
  if (p.noise > 0) { const n = at(ctx.createBufferSource(), t); n.buffer = noiseBuffer(ctx); n.loop = true; n.connect(ng).connect(mix); srcs.push(n); nodes.push(n, ng); }
  const ld = lfoDests(p.lfo); let unhook: (() => void) | undefined;
  if (ld.pitch || ld.cutoff || ld.amp || ld.osc1 || ld.osc2) {
    // The pad's free-running LFO is picked up where it is (TRIG mode restarts a per-note one), faded in by
    // its attack and fanned out to per-destination depths.
    const fade = ctx.createGain();
    if (freeLfo && !p.lfo.retrig) { freeLfo.connect(fade); unhook = () => { try { freeLfo.disconnect(fade); } catch { /* gone */ } }; }
    else { const lfo = at(ctx.createOscillator(), t); lfo.type = p.lfo.wave; lfo.frequency.value = p.lfo.rate; lfo.connect(fade); srcs.push(lfo); nodes.push(lfo); }
    const atk = Math.max(0, p.lfo.attack ?? 0);
    if (atk > .001) { fade.gain.setValueAtTime(0, t); fade.gain.linearRampToValueAtTime(1, t + atk); } else fade.gain.value = 1;
    const send = (amt: number, ...to: AudioParam[]) => { const g = ctx.createGain(); g.gain.value = amt; fade.connect(g); to.forEach(a => g.connect(a)); nodes.push(g); };
    if (ld.pitch) send(ld.pitch * 1200, o1.detune, o2.detune);
    if (ld.cutoff) send(ld.cutoff * 2400, filt.detune);
    if (ld.amp) { trem.gain.value = 1 - ld.amp / 2; send(ld.amp / 2, trem.gain); }
    if (ld.osc1) send(ld.osc1 * g1.gain.value, g1.gain);
    if (ld.osc2) send(ld.osc2 * g2.gain.value, g2.gain);
    nodes.push(fade);
  }
  nodes.push(g1, g2, mix, filt, wet, dry, trem, amp);
  const end = adsr(amp.gain, t, p.env, gate, vel * 0.5);
  const v = finish(srcs, nodes, end, amp, () => unhook?.());
  // Glide moves both oscillators from their current pitch, so slides start wherever the last one ended.
  v.glide = (delta, at, time) => glideParams([o1.frequency, o2.frequency], delta, at, time);
  // Held-note tweaks glide over ~20 ms. Cutoff moves via detune so the filter envelope keeps running underneath.
  let cur = p;
  v.update = q => { const n = ctx.currentTime, tc = .007, nx = { ...cur, ...q } as SynthParams; cur = nx;
    if (q.cutoff) filt.detune.setTargetAtTime(1200 * Math.log2(q.cutoff / p.cutoff), n, tc);
    if (q.res !== undefined) filt.Q.setTargetAtTime(q.res, n, tc);
    if (q.wet !== undefined) { wet.gain.setTargetAtTime(q.wet, n, tc); dry.gain.setTargetAtTime(1 - q.wet, n, tc); }
    if (q.noise !== undefined) ng.gain.setTargetAtTime(q.noise, n, tc);
    if (q.osc1) { g1.gain.setTargetAtTime(q.osc1.gain, n, tc); o1.frequency.setTargetAtTime(base * 2 ** ((q.osc1.coarse + (q.osc1.fine - p.osc1.fine) / 100) / 12), n, tc); }
    if (q.osc2) { const nf2 = base * 2 ** ((q.osc2.coarse + (q.osc2.fine - p.osc2.fine) / 100) / 12); o2.frequency.setTargetAtTime(nf2, n, tc);
      if (p.osc2.mode === "fm") { if (!p.fenvFm) g2.gain.setTargetAtTime(q.osc2.fmAmount * nf2 / peak2, n, tc); } else g2.gain.setTargetAtTime(q.osc2.gain, n, tc); } };
  return v;
}

// Crossfaded loop buffers are baked per sample/region so the seam is click-free; cached by parameters.
const loopCache = new WeakMap<AudioBuffer, Map<string, { buf: AudioBuffer; loopStart: number; loopEnd: number }>>();
/** Baked loop: plays from the sample START into the loop. The buffer runs START..LOOP END; its last x samples fade
 *  into the audio just before LOOP START+x, so wrapping to LOOP START+x continues with no jump at the seam. */
function loopBufferOf(ctx: BaseAudioContext, buf: AudioBuffer, start: number, ls: number, end: number, xf: number) {
  const key = `${start.toFixed(3)}:${ls.toFixed(3)}:${end.toFixed(3)}:${xf.toFixed(3)}`;
  let m = loopCache.get(buf); if (!m) { m = new Map(); loopCache.set(buf, m); }
  const hit = m.get(key); if (hit) return hit;
  const sr = buf.sampleRate, a0 = Math.floor(start * sr), l0 = Math.floor(ls * sr), s1 = Math.floor(end * sr), x = Math.floor(xf * sr);
  const len = s1 - a0; if (s1 - l0 - x < 256 || l0 < a0) return null;
  const out = ctx.createBuffer(buf.numberOfChannels, len, sr);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const sd = buf.getChannelData(c), dst = out.getChannelData(c);
    for (let i = 0; i < len - x; i++) dst[i] = sd[a0 + i];
    for (let i = 0; i < x; i++) { const g = (i + .5) / x; dst[len - x + i] = sd[s1 - x + i] * Math.cos(g * Math.PI / 2) + sd[l0 + i] * Math.sin(g * Math.PI / 2); }
  }
  const r = { buf: out, loopStart: (l0 + x - a0) / sr, loopEnd: len / sr }; m.set(key, r); return r;
}

// Vintage (Akai-style) time stretch: fixed-size blocks re-read from the source at the stretched rate with only
// tiny crossfades, so length changes without pitch and long settings give the classic metallic, stuttery artefacts.
const stretchCache = new WeakMap<AudioBuffer, Map<string, AudioBuffer>>();
export function stretchBuffer(ctx: BaseAudioContext, buf: AudioBuffer, ratio: number, grainSec: number) {
  const key = `${ratio.toFixed(3)}:${grainSec.toFixed(3)}`;
  let m = stretchCache.get(buf); if (!m) { m = new Map(); stretchCache.set(buf, m); }
  const hit = m.get(key); if (hit) return hit;
  const sr = buf.sampleRate, N = Math.max(64, Math.round(grainSec * sr)), fade = Math.min(Math.round(N / 8), Math.round(.002 * sr)) || 1;
  const outLen = Math.max(1, Math.round(buf.length * ratio)), out = ctx.createBuffer(buf.numberOfChannels, outLen, sr);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const src = buf.getChannelData(c), dst = out.getChannelData(c);
    for (let o = 0; o < outLen; o += N - fade) {
      const from = Math.floor(o / ratio);
      for (let i = 0; i < N && o + i < outLen; i++) {
        const v = src[from + i] ?? 0, w = i < fade ? i / fade : i >= N - fade ? (N - i) / fade : 1;
        dst[o + i] = i < fade ? dst[o + i] + v * w : v * w;
      }
    }
  }
  if (m.size > 6) m.clear();
  m.set(key, out); return out;
}

export function playSampler(ctx: BaseAudioContext, dest: AudioNode, p: SamplerParams, buf: AudioBuffer, t: number, gate: number, vel = 1): Voice {
  const amp = ctx.createGain(); amp.gain.value = 0; link(amp, dest);
  if (p.stretch && Math.abs((p.stretchAmt ?? 1) - 1) > .01) buf = stretchBuffer(ctx, buf, p.stretchAmt ?? 1, p.stretchGrain ?? .05);
  const src = ctx.createBufferSource();
  const rate = 2 ** (p.pitch / 12); src.playbackRate.value = rate;
  let offset = Math.min(buf.duration - 0.01, p.start * buf.duration);
  if (p.loop) {
    // LOOP: playback starts at START, runs into the loop region (L-ST..L-END) and repeats it while held.
    const ls = Math.max(offset, Math.min(buf.duration - .03, (p.loopStartF ?? p.start) * buf.duration));
    const endSec = Math.max(ls + 0.02, Math.min(buf.duration, (p.loopEnd ?? 1) * buf.duration));
    // XFD is a fraction of the loop length (0..1), so the knob keeps working on short loops.
    const xf = Math.max(0, Math.min(p.loopXfade ?? 0, 1)) * Math.max(0, (endSec - ls) / 2 - 0.005);
    const baked = xf > 0.002 ? loopBufferOf(ctx, buf, offset, ls, endSec, xf) : null;
    // A source buffer can only be assigned once, so the baked crossfade loop is chosen before assignment.
    if (baked) { src.buffer = baked.buf; src.loop = true; src.loopStart = baked.loopStart; src.loopEnd = baked.loopEnd; offset = 0; }
    else { src.buffer = buf; src.loop = true; src.loopStart = ls; src.loopEnd = endSec; }
  } else src.buffer = buf;
  src.connect(amp);
  // The sampler follows the gate (finger down / step length), then fades by RELEASE. One-shots that end
  // before the gate just end; slices stop at their slice edge. Loops sustain for the whole gate.
  // Region end: sample END (and a slice edge, when slicing) bounds playback.
  const endF = Math.min(p.endFrac ?? 1, p.end ?? 1), stopSec = !p.loop ? Math.max(offset + .005, endF * buf.duration) : buf.duration;
  const playLen = (stopSec - offset) / rate, oneShot = p.mode === "one" && !p.loop;
  let endT: number;
  if (oneShot) {
    // ONE: the region plays to its end regardless of hold time; only a 3 ms declick at each edge, no envelope.
    const e = t + playLen; amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(vel, t + .003);
    amp.gain.setValueAtTime(vel, Math.max(t + .003, e - .003)); amp.gain.linearRampToValueAtTime(0, e); endT = e + .01;
  } else {
    // ADSR: the envelope shapes volume only; playback position runs independently through the region.
    const g = p.loop ? Math.max(.005, gate) : Math.max(.005, Math.min(gate, playLen));
    const envEnd = adsr(amp.gain, t, p.env, g, vel);
    endT = p.loop ? envEnd : Math.min(envEnd, t + playLen + .01);
  }
  src.start(t, offset); src.stop(endT);
  const cleanup = () => { src.disconnect(); amp.disconnect(); };
  const timer = window.setTimeout(cleanup, Math.max(0, (endT - ctx.currentTime) * 1000) + 200);
  src.onended = () => { clearTimeout(timer); cleanup(); };
  return { stop: s => { endT = s; amp.gain.cancelScheduledValues(s); amp.gain.setTargetAtTime(0, s, 0.004); try { src.stop(s + 0.04); } catch { /* stopped */ } },
    release: (s, r) => { if (oneShot || s + r * 1.5 + .06 >= endT) return; endT = fadeOut(amp, s, r); try { src.stop(endT); } catch { /* stopped */ } },
    glide: (delta, a, time) => glideParams([src.playbackRate], delta, a, time) };
}

// Shared smooth window; the 16-grain global budget also includes booked grains.
const HANN = (() => { const c = new Float32Array(new ArrayBuffer(256 * 4)); for (let i = 0; i < c.length; i++) c[i] = Math.sin(Math.PI * i / (c.length - 1)) ** 2; return c; })();
let liveGrains = 0;
/** Soft stereo cloud: overlap stays continuous at low densities; freeze holds the reading position. */
export function playGrains(ctx: BaseAudioContext, dest: AudioNode, p: SamplerParams, buf: AudioBuffer, t: number, gate: number, vel = 1): Voice {
  const amp = ctx.createGain(); amp.gain.value = 0; link(amp, dest);
  let stopAt = adsr(amp.gain, t, p.env, gate, vel);
  const size = Math.max(.02, Math.min(.4, p.grainSize ?? .08)), hop = 1 / Math.max(2, Math.min(40, p.grainDens ?? 12)), rate = 2 ** (p.pitch / 12), spray = p.spray ?? .1;
  // A SIZE of 80 ms at 12/s used to leave near-silent gaps. Broaden the window to
  // overlap at least 2.5 neighbours, with energy compensation instead of louder peaks.
  const duration = Math.max(size, hop * 2.5), overlap = duration / hop;
  const cloud = ctx.createGain(), tone = ctx.createBiquadFilter();
  cloud.gain.value = .7 / Math.sqrt(Math.max(1, overlap * .375));
  tone.type = "lowpass"; tone.frequency.value = Math.min(8500, ctx.sampleRate * .4); tone.Q.value = .5;
  cloud.connect(tone).connect(amp);
  const D = buf.duration, lo = Math.max(0, Math.min(D - .001, p.start * D)), hi = Math.min(D, Math.max(lo + .001, (p.end ?? 1) * D)), rnd = p.grainRnd ?? 0;
  const lRate = p.gLfoRate ?? 0, lAmt = p.gLfoAmt ?? 0, shp = p.gLfoShape ?? "sin";
  // Free-running LFO read from the audio clock, so its phase continues across notes.
  const lfo = (at: number) => { const ph = at * lRate, f = ph - Math.floor(ph);
    if (shp === "tri") return 1 - 4 * Math.abs(f - .5); if (shp === "sqr") return f < .5 ? 1 : -1;
    if (shp === "rnd") { const x = Math.sin(Math.floor(ph) * 12.9898) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; } return Math.sin(2 * Math.PI * f); };
  let next = t, pos = lo;
  const pump = () => {
    const horizon = ctx.currentTime + .12;
    while (next < horizon && next < stopAt) {
      if (liveGrains >= 16) { next += hop; continue; }
       const src = ctx.createBufferSource(), g = ctx.createGain(), pan = ctx.createStereoPanner(); src.buffer = buf;
      src.playbackRate.value = rate * 2 ** ((Math.random() * 2 - 1) * rnd / 12);
       const grainDuration = Math.min(duration, (hi - lo) / src.playbackRate.value);
       g.gain.value = 0; g.gain.setValueCurveAtTime(HANN, next, grainDuration); liveGrains++;
       pan.pan.value = (Math.random() * 2 - 1) * .65;
       src.connect(g).connect(pan).connect(cloud);
      const c = pos + (lAmt > 0 && lRate > 0 ? lfo(next) * lAmt * .5 * D : 0) + (Math.random() * 2 - 1) * spray * Math.min(1, D) * .5;
       const off = Math.max(lo, Math.min(hi - grainDuration * src.playbackRate.value, c));
       src.start(next, off); src.stop(next + grainDuration); src.onended = () => { liveGrains--; src.disconnect(); g.disconnect(); pan.disconnect(); };
       // Slightly irregular spacing avoids a rigid buzz without changing average density.
       next += hop * (.9 + Math.random() * .2); if (!p.freeze) { pos += hop * .5 * rate; if (pos > hi) pos = lo; }
    }
     if (next >= stopAt) { clearInterval(iv); window.setTimeout(() => { cloud.disconnect(); tone.disconnect(); amp.disconnect(); }, Math.max(0, (stopAt + duration - ctx.currentTime) * 1000) + 100); }
  };
  const iv = window.setInterval(pump, 40); pump();
  return { stop: s => { amp.gain.cancelScheduledValues(s); amp.gain.setTargetAtTime(0, s, .004); stopAt = Math.min(stopAt, s + .05); },
    release: (s, r) => { if (s + r * 1.5 + .06 >= stopAt) return; stopAt = fadeOut(amp, s, r); } };
}

const tubeCache = new Map<number, Float32Array<ArrayBuffer>>(), harmCache = new Map<number, Float32Array<ArrayBuffer>>();
/** Asymmetric soft clip: the positive half saturates harder, adding even (tube-like) harmonics. */
function tubeCurve(drive: number) { const k = Math.round(drive * 20) / 20; let c = tubeCache.get(k); if (c) return c; const g = 1 + k * 9; c = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = (x >= 0 ? Math.tanh(g * x) : Math.tanh(g * .65 * x) / .9) / Math.tanh(g); } tubeCache.set(k, c); return c; }
/** Chebyshev enhancer: adds 2nd and 3rd harmonics so the sub is audible on small speakers. */
function harmCurve(h: number) { const k = Math.round(h * 20) / 20; let c = harmCache.get(k); if (c) return c; c = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = (x + k * (.55 * (2 * x * x - 1) + .4 * (4 * x ** 3 - 3 * x))) / (1 + k * .95); } harmCache.set(k, c); return c; }

/** 808 bass: sine with pitch sweep, sub octave, harmonic enhancer and tube drive; glides like a trap 808. */
export function play808(ctx: BaseAudioContext, dest: AudioNode, p: Bass808Params, midi: number, t: number, gate: number, vel = 1): Voice {
  const f = 440 * 2 ** ((midi - 69) / 12), nodes: AudioNode[] = [], srcs: AudioScheduledSourceNode[] = [];
  const amp = ctx.createGain(); amp.gain.value = 0; link(amp, dest);
  const lp = ctx.createBiquadFilter(); lp.frequency.value = p.tone; lp.Q.value = .5; lp.connect(amp);
  const dc = ctx.createBiquadFilter(); dc.type = "highpass"; dc.frequency.value = 18; dc.connect(lp);
  const tube = ctx.createWaveShaper(); tube.curve = tubeCurve(p.tube); tube.oversample = "2x";
  const pre = ctx.createGain(); pre.gain.value = 1 + p.tube * 2; pre.connect(tube).connect(dc);
  const harm = ctx.createWaveShaper(); harm.curve = harmCurve(p.harmonics); harm.connect(pre);
  const osc = at(ctx.createOscillator(), t), sub = at(ctx.createOscillator(), t), subG = ctx.createGain();
  osc.frequency.setValueAtTime(clampF(f * 2 ** (p.pitchEnv / 12)), t); osc.frequency.exponentialRampToValueAtTime(f, t + p.pitchDecay + .001);
  sub.frequency.setValueAtTime(f / 2, t); subG.gain.value = p.harmonics * .45;
  osc.connect(harm); sub.connect(subG).connect(pre); (osc.frequency as AudioParam & { __base?: number }).__base = f; (sub.frequency as AudioParam & { __base?: number }).__base = f / 2;
  const click = at(ctx.createBufferSource(), t), cg = ctx.createGain(); click.buffer = noiseBuffer(ctx);
  cg.gain.setValueAtTime(p.click * .5, t); cg.gain.exponentialRampToValueAtTime(.0001, t + .012); click.connect(cg).connect(lp);
  srcs.push(osc, sub, click); nodes.push(osc, sub, subG, harm, pre, tube, dc, lp, click, cg, amp);
  const peak = vel * .7 / (1 + p.tube * .6), hold = Math.max(gate, .02);
  amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(peak, t + .002);
  // Decay rings out; a held/tied note keeps the body alive until release so glides stay audible.
  amp.gain.setTargetAtTime(peak * .55, t + .002, p.decay / 3);
  // Release honors the full decay value (up to 4 s) so the slider stays audible across its range.
  amp.gain.setTargetAtTime(0, t + hold, p.decay / 3 + .01);
  const end = t + hold + p.decay * 2 + .1;
  const v = finish(srcs, nodes, end, amp);
  v.glide = (delta, a, time) => glideParams([osc.frequency, sub.frequency], delta, a, time);
  return v;
}

export function defaultSample(ctx: BaseAudioContext) {
  const len = Math.floor(ctx.sampleRate * 0.9), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / ctx.sampleRate, env = Math.exp(-t * 4) * Math.min(1, t * 200);
    const f = 196 * (1 + 0.02 * Math.sin(t * 30));
    d[i] = env * (0.6 * Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2.01 * t) + 0.15 * Math.sin(2 * Math.PI * f * 3.03 * t) * Math.sin(t * 9)) + (t < 0.01 ? (Math.random() - 0.5) * 0.4 : 0);
  }
  return buf;
}

export function peaksOf(buf: AudioBuffer, n = 160) {
  const d = buf.getChannelData(0), size = Math.floor(d.length / n), out: number[] = [];
  for (let i = 0; i < n; i++) { let m = 0; for (let j = i * size; j < (i + 1) * size; j++) m = Math.max(m, Math.abs(d[j])); out.push(m); }
  const max = Math.max(...out, 0.0001); return out.map(v => v / max);
}

/** Bounded five-note analog-style chord voice; detuned saw/PWM/sub through a four-pole filter and stereo modulated delay. */
export function playPoly(ctx: BaseAudioContext, dest: AudioNode, p: PolyParams, notes: number[], t: number, gate: number, vel = 1): Voice {
  const nodes: AudioNode[] = [], srcs: AudioScheduledSourceNode[] = [];
  const amp = ctx.createGain(), mix = ctx.createGain(); amp.gain.value = 0; link(amp, dest); nodes.push(amp, mix);
  const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(); f1.frequency.value = f2.frequency.value = p.cutoff; f1.Q.value = p.res; f2.Q.value = .707;
  mix.connect(f1).connect(f2).connect(amp); nodes.push(f1, f2);
  if (p.fenvAmt) { filterEnvAdsr(f1.frequency, t, p.fenv, gate, p.cutoff, p.fenvAmt); filterEnvAdsr(f2.frequency, t, p.fenv, gate, p.cutoff, p.fenvAmt); }
  const merger = ctx.createChannelMerger(2); merger.connect(amp); nodes.push(merger);
  for (let c = 0; c < 2; c++) { const d = ctx.createDelay(.05), g = ctx.createGain(), lfo = at(ctx.createOscillator(), t), lg = ctx.createGain();
    d.delayTime.value = c ? .017 : .012; g.gain.value = p.chorus * .4; lfo.frequency.value = c ? .7 : .5; lg.gain.value = .003 * p.chorus;
    f2.connect(d).connect(g).connect(merger, 0, c); lfo.connect(lg).connect(d.delayTime); srcs.push(lfo); nodes.push(d, g, lfo, lg);
  }
  notes.slice(0, 5).forEach(midi => { const f = 440 * 2 ** ((midi - 69) / 12);
    for (let k = 0; k < 3; k++) { const o = at(ctx.createOscillator(), t), g = ctx.createGain();
      o.type = k === 2 ? "square" : k === 1 ? "square" : "sawtooth"; o.frequency.value = k === 2 ? f / 2 : f; o.detune.value = k === 0 ? -p.detune : k === 1 ? p.detune : 0;
      g.gain.value = (k === 2 ? p.sub : k === 1 ? p.pulse : .7) / Math.sqrt(notes.length); o.connect(g).connect(mix); srcs.push(o); nodes.push(o, g);
      if (k === 1) { const pwm = at(ctx.createOscillator(), t), pg = ctx.createGain(); pwm.frequency.value = .4; pg.gain.value = p.pulse * 8; pwm.connect(pg).connect(o.detune); srcs.push(pwm); nodes.push(pwm, pg); }
    }
  });
  const v = finish(srcs, nodes, adsr(amp.gain, t, p.env, gate, vel * .25), amp);
  const dets = srcs.filter((o): o is OscillatorNode => o instanceof OscillatorNode && o.detune.value !== 0 && Math.abs(o.detune.value) === p.detune);
  v.update = q => { const n = ctx.currentTime, tc = .007;
    if (q.cutoff) { const c = 1200 * Math.log2(q.cutoff / p.cutoff); f1.detune.setTargetAtTime(c, n, tc); f2.detune.setTargetAtTime(c, n, tc); }
    if (q.res !== undefined) f1.Q.setTargetAtTime(q.res, n, tc);
    if (q.detune !== undefined) dets.forEach(o => o.detune.setTargetAtTime(Math.sign(o.detune.value) * q.detune!, n, tc)); };
  return v;
}

export type SirenParams = { mode?: "dub" | "laser"; laser?: LaserParams; wave: Wave; lfoWave: Wave; rate: number; depth: number; sweep: number; sweepTime: number; release: number; tone: number };
export const defaultSiren = (): SirenParams => ({ wave: "square", lfoWave: "square", rate: 4, depth: 7, sweep: 12, sweepTime: 1.5, release: .4, tone: 3500 });
/** Dub siren: one oscillator wobbled by an LFO (semitones) plus a long pitch rise/fall; sustains while the pad is held. */
export function playSiren(ctx: BaseAudioContext, dest: AudioNode, p: SirenParams, midi: number, t: number, gate: number, vel = 1, freeLfo?: AudioNode): Voice {
  if (p.mode === "laser") return playLaser(ctx, dest, laserParams(p.laser), midi, t, gate, vel);
  const f = 440 * 2 ** ((midi - 69) / 12), nodes: AudioNode[] = [], srcs: AudioScheduledSourceNode[] = [];
  const amp = ctx.createGain(), lp = ctx.createBiquadFilter(); amp.gain.value = 0; lp.frequency.value = p.tone; lp.Q.value = 2; lp.connect(amp); link(amp, dest);
  const osc = at(ctx.createOscillator(), t), lg = ctx.createGain(); lg.gain.value = p.depth * 100; osc.type = p.wave;
  // The wobble comes from the pad's free-running LFO when given, so it continues across hits.
  let lfo: AudioNode, unhook: (() => void) | undefined;
  if (freeLfo) { lfo = freeLfo; unhook = () => { try { freeLfo.disconnect(lg); } catch { /* gone */ } }; }
  else { const o = at(ctx.createOscillator(), t); o.type = p.lfoWave; o.frequency.value = p.rate; srcs.push(o); nodes.push(o); lfo = o; }
  osc.frequency.setValueAtTime(f, t); osc.detune.setValueAtTime(0, t); osc.detune.linearRampToValueAtTime(p.sweep * 100, t + Math.max(.01, p.sweepTime));
  lfo.connect(lg).connect(osc.detune); osc.connect(lp); srcs.unshift(osc); nodes.push(osc, lg, lp, amp);
  const peak = vel * (p.wave === "sine" ? .5 : .28), hold = Math.max(gate, .02);
  amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(peak, t + .005); amp.gain.setTargetAtTime(0, t + hold, p.release / 3 + .005);
  const v = finish(srcs, nodes, t + hold + p.release * 2 + .1, amp, () => unhook?.());
  return v;
}

/** Three bounded native oscillators; LASER never connects to the DUB LFO. */
function playLaser(ctx: BaseAudioContext, dest: AudioNode, p: LaserParams, midi: number, t: number, gate: number, vel: number): Voice {
  const lp = ctx.createBiquadFilter(), amp = ctx.createGain();
  lp.type = "lowpass"; lp.Q.value = .7;
  lp.frequency.value = Math.min(ctx.sampleRate * .45, clampF(p.tone));
  lp.connect(amp); link(amp, dest);
  // Frequency carries the envelope; detune remains independently editable.
  const limit = ctx.sampleRate * .45 / 2 ** (100 / 1200);
  const root = Math.min(limit / 2 ** (Math.max(0, p.amount) / 12), Math.max(20 * 2 ** (Math.max(0, -p.amount) / 12), 440 * 2 ** ((midi - 69) / 12)));
  const duration = Math.max(.005, Math.min(2, p.decay));
  const attack = Math.max(0, Math.min(.1, p.attack ?? 0));
  const oscs: OscillatorNode[] = [], nodes: AudioNode[] = [lp, amp];
  for (const side of [0, -1, 1]) {
    const o = at(ctx.createOscillator(), t), pan = ctx.createStereoPanner(), gain = ctx.createGain();
    o.type = p.wave; o.detune.value = side * Math.max(0, Math.min(100, p.detune));
    pan.pan.value = side * .65; gain.gain.value = 1 / 3;
    o.frequency.setValueAtTime(root * 2 ** (laserEnvelopeAt(p, 0) / 12), t);
    if (attack > 0) o.frequency.exponentialRampToValueAtTime(root * 2 ** (laserEnvelopeAt(p, attack) / 12), t + attack);
    for (let k = 1; k <= 64; k++) {
      const elapsed = attack + duration * k / 64;
      o.frequency.exponentialRampToValueAtTime(root * 2 ** (laserEnvelopeAt(p, elapsed) / 12), t + elapsed);
    }
    o.connect(gain).connect(pan).connect(lp); oscs.push(o); nodes.push(o, pan, gain);
  }
  const end = adsr(amp.gain, t, p.env, gate, vel * .32);
  const v = finish(oscs, nodes, end, amp);
  v.glide = (delta, at, time) => glideParams(oscs.map(o => o.frequency), delta, at, time);
  v.update = q => {
    if (q.mode && q.mode !== "laser") return;
    const next = q.laser; if (!next) return;
    const now = ctx.currentTime;
    lp.frequency.setTargetAtTime(Math.min(ctx.sampleRate * .45, clampF(next.tone)), now, .007);
    oscs.forEach((o, i) => o.detune.setTargetAtTime([0, -1, 1][i] * Math.max(0, Math.min(100, next.detune)), now, .007));
  };
  return v;
}
