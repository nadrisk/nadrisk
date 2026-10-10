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
export type SynthParams = { osc1: OscParams; osc2: OscParams & { mode: "mix" | "fm"; fmAmount: number }; partials: number[]; partials2?: number[]; noise: number; env: ADSR; pitchEnvShape: ADSR; filterEnvShape: ADSR; filter: FilterKind; cutoff: number; res: number; filterEnv: number; filterDecay: number; wet: number; pitchEnv: number; pitchDecay: number; lfo: { wave: Wave; rate: number; depth: number; target: "pitch" | "cutoff" | "amp" } };
export type SamplerParams = { start: number; loop: boolean; pitch: number; env: ADSR; sampleName: string; sampleId?: string; reverse?: boolean; grain?: boolean; grainSize?: number; spray?: number; freeze?: boolean; loopEnd?: number; loopXfade?: number };
/** glide(delta) slides the running voice by `delta` semitones over `time` seconds (step-sequencer glide). */
export type Voice = { stop: (at: number) => void; glide?: (delta: number, at: number, time: number) => void };
export type Bass808Params = { pitchEnv: number; pitchDecay: number; decay: number; tube: number; harmonics: number; tone: number; click: number };
export const default808 = (): Bass808Params => ({ pitchEnv: 24, pitchDecay: .045, decay: 1.4, tube: .35, harmonics: .4, tone: 4500, click: .3 });
// Deltas are relative to the voice's original pitch (cached as __base), so chained slides land on the right notes.
const glideParams = (ps: AudioParam[], delta: number, at: number, time: number) => ps.forEach(p => { const q = p as AudioParam & { __base?: number }; const b = (q.__base ??= p.value); if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(at); else { p.cancelScheduledValues(at); p.setValueAtTime(p.value, at); } p.setTargetAtTime(b * 2 ** (delta / 12), at, Math.max(.005, time / 3)); });
export type PolyParams = { cutoff: number; res: number; detune: number; sub: number; pulse: number; chorus: number; env: ADSR };
export const defaultPoly = (): PolyParams => ({ cutoff: 2200, res: 1.5, detune: 9, sub: .3, pulse: .35, chorus: .35, env: { a: .04, d: .5, s: .65, r: .7 } });

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

function finish(srcs: AudioScheduledSourceNode[], nodes: AudioNode[], end: number, amp: GainNode): Voice {
  srcs.forEach(s => { s.start(Math.max(0, (s as unknown as { _t?: number })._t ?? 0)); s.stop(end); });
  let cleaned = false;
  const cleanup = () => { if (cleaned) return; cleaned = true; nodes.forEach(n => n.disconnect()); };
  const timer = window.setTimeout(cleanup, Math.max(0, (end - amp.context.currentTime) * 1000) + 200);
  srcs[0].onended = () => { clearTimeout(timer); cleanup(); };
  return { stop: at => { amp.gain.cancelScheduledValues(at); amp.gain.setTargetAtTime(0, at, 0.004); srcs.forEach(s => { try { s.stop(at + 0.04); } catch { /* already stopped */ } }); } };
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
const mach = (p: DrumParams) => ({ ...drumDefaults(p.kind), ...Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) }) as DrumParams & Required<DrumMachine>;

/** Full pitch envelope: optional attack rise to `base*2^(amt/12)`, then a curved fall to `base*2^(end/12)`. Curve 0 = linear glide, 1 = snappy. */
function pitchEnvelope(f: AudioParam, base: number, t: number, amt: number, atk: number, dec: number, curve: number, end: number) {
  const peak = clampF(base * 2 ** (amt / 12)), fin = clampF(base * 2 ** (end / 12)), d = Math.max(.003, dec);
  if (atk > .0005) { f.setValueAtTime(fin, t); f.linearRampToValueAtTime(peak, t + atk); } else f.setValueAtTime(peak, t);
  const k = 1 + curve * 9, n = 48, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const u = i / (n - 1), sh = 1 - (1 - u) ** k; c[i] = peak * (fin / peak) ** sh; }
  f.setValueCurveAtTime(c, t + atk + .0001, d);
}
const shaper = (ctx: BaseAudioContext, drive: number) => { const w = ctx.createWaveShaper(), k = 1 + drive * 14, c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } w.curve = c; w.oversample = "2x"; return w; };

export function playDrum(ctx: BaseAudioContext, dest: AudioNode, p0: DrumParams, t: number, vel = 1): Voice {
  const p = mach(p0), nodes: AudioNode[] = [], srcs: AudioScheduledSourceNode[] = [];
  const amp = ctx.createGain(); amp.gain.value = 0; amp.connect(dest);
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

export function partialWave(ctx: BaseAudioContext, partials: number[]) {
  const real = new Float32Array(17), imag = new Float32Array(17);
  // One sequential row like a classic FM operator: index 0 = harmonic 1 (fundamental), index 15 = harmonic 16.
  partials.slice(0, 16).forEach((v, i) => { imag[i + 1] = v; });
  if (!imag.some(v => v > 0)) imag[1] = 1;
  return ctx.createPeriodicWave(real, imag);
}

export function playSynth(ctx: BaseAudioContext, dest: AudioNode, p: SynthParams, midi: number, t: number, gate: number, vel = 1): Voice {
  const nodes: AudioNode[] = [], srcs: AudioScheduledSourceNode[] = [];
  const base = 440 * 2 ** ((midi - 69) / 12);
  const amp = ctx.createGain(); amp.gain.value = 0; amp.connect(dest);
  const trem = ctx.createGain(); trem.connect(amp);
  const mix = ctx.createGain();
  const filt = ctx.createBiquadFilter(); filt.type = p.filter; filt.Q.value = p.res;
  filterEnvAdsr(filt.frequency, t, p.filterEnvShape, gate, p.cutoff, p.filterEnv);
  const wet = ctx.createGain(); wet.gain.value = p.wet; const dry = ctx.createGain(); dry.gain.value = 1 - p.wet;
  mix.connect(filt).connect(wet).connect(trem); mix.connect(dry).connect(trem);
  const makeOsc = (o: OscParams, partials: number[]) => {
    const osc = at(ctx.createOscillator(), t);
    if (o.wave === "additive") osc.setPeriodicWave(partialWave(ctx, partials)); else osc.type = o.wave;
    osc.frequency.value = base * 2 ** (o.coarse / 12);
    modAdsr(osc.detune, t, p.pitchEnvShape, gate, o.fine, p.pitchEnv * 100);
    srcs.push(osc); nodes.push(osc); return osc;
  };
  const o1 = makeOsc(p.osc1), o2 = makeOsc(p.osc2);
  const g1 = ctx.createGain(); g1.gain.value = p.osc1.gain; o1.connect(g1).connect(mix);
  const g2 = ctx.createGain();
  if (p.osc2.mode === "fm") { g2.gain.value = p.osc2.fmAmount * base * p.osc2.gain; o2.connect(g2).connect(o1.frequency); }
  else { g2.gain.value = p.osc2.gain; o2.connect(g2).connect(mix); }
  if (p.noise > 0) { const n = at(ctx.createBufferSource(), t); n.buffer = noiseBuffer(ctx); n.loop = true; const ng = ctx.createGain(); ng.gain.value = p.noise; n.connect(ng).connect(mix); srcs.push(n); nodes.push(n, ng); }
  if (p.lfo.depth > 0) {
    const lfo = at(ctx.createOscillator(), t); lfo.type = p.lfo.wave; lfo.frequency.value = p.lfo.rate;
    const lg = ctx.createGain(); lfo.connect(lg);
    if (p.lfo.target === "pitch") { lg.gain.value = p.lfo.depth * 1200; lg.connect(o1.detune); lg.connect(o2.detune); }
    else if (p.lfo.target === "cutoff") { lg.gain.value = p.lfo.depth * 2400; lg.connect(filt.detune); }
    else { trem.gain.value = 1 - p.lfo.depth / 2; lg.gain.value = p.lfo.depth / 2; lg.connect(trem.gain); }
    srcs.push(lfo); nodes.push(lfo, lg);
  }
  nodes.push(g1, g2, mix, filt, wet, dry, trem, amp);
  const end = adsr(amp.gain, t, p.env, gate, vel * 0.5);
  const v = finish(srcs, nodes, end, amp);
  // Glide moves both oscillators from their current pitch, so slides start wherever the last one ended.
  v.glide = (delta, at, time) => glideParams([o1.frequency, o2.frequency], delta, at, time);
  return v;
}

export function playSampler(ctx: BaseAudioContext, dest: AudioNode, p: SamplerParams, buf: AudioBuffer, t: number, gate: number, vel = 1): Voice {
  const amp = ctx.createGain(); amp.gain.value = 0; amp.connect(dest);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const rate = 2 ** (p.pitch / 12); src.playbackRate.value = rate;
  const offset = Math.min(buf.duration - 0.01, p.start * buf.duration);
  if (p.loop) { src.loop = true; src.loopStart = offset; src.loopEnd = buf.duration; }
  src.connect(amp);
  const g = p.loop ? gate : Math.max(p.env.a, (buf.duration - offset) / rate - p.env.r);
  const end = adsr(amp.gain, t, p.env, g, vel);
  src.start(t, offset); src.stop(end);
  const cleanup = () => { src.disconnect(); amp.disconnect(); };
  const timer = window.setTimeout(cleanup, Math.max(0, (end - ctx.currentTime) * 1000) + 200);
  src.onended = () => { clearTimeout(timer); cleanup(); };
  return { stop: s => { amp.gain.cancelScheduledValues(s); amp.gain.setTargetAtTime(0, s, 0.004); try { src.stop(s + 0.04); } catch { /* stopped */ } }, glide: (delta, a, time) => glideParams([src.playbackRate], delta, a, time) };
}

// Granular budget: one shared Hann window, at most 12 grains sounding at once across all pads, at most ~25 grains/s per voice.
const HANN = (() => { const c = new Float32Array(new ArrayBuffer(64 * 4)); for (let i = 0; i < 64; i++) c[i] = .7 * Math.sin(Math.PI * i / 63) ** 2; return c; })();
let liveGrains = 0;
/** Light granulator: overlapping windowed grains read around the start position; freeze holds the position still. */
export function playGrains(ctx: BaseAudioContext, dest: AudioNode, p: SamplerParams, buf: AudioBuffer, t: number, gate: number, vel = 1): Voice {
  const amp = ctx.createGain(); amp.gain.value = 0; amp.connect(dest);
  let stopAt = adsr(amp.gain, t, p.env, gate, vel);
  const size = Math.max(.03, p.grainSize ?? .08), hop = Math.max(.04, size / 2), rate = 2 ** (p.pitch / 12), spray = p.spray ?? .1;
  let next = t, pos = p.start * buf.duration;
  const pump = () => {
    const horizon = ctx.currentTime + .12;
    while (next < horizon && next < stopAt) {
      if (liveGrains >= 12) { next += hop; continue; }
      const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = buf; src.playbackRate.value = rate;
      g.gain.value = 0; g.gain.setValueCurveAtTime(HANN, next, size); liveGrains++;
      src.connect(g).connect(amp);
      const off = Math.max(0, Math.min(buf.duration - .01, pos + (Math.random() * 2 - 1) * spray * Math.min(1, buf.duration) * .5));
      src.start(next, off); src.stop(next + size + .01); src.onended = () => { liveGrains--; src.disconnect(); g.disconnect(); };
      next += hop; if (!p.freeze) { pos += hop * .5; if (pos > buf.duration - size) pos = p.start * buf.duration; }
    }
    if (next >= stopAt) { clearInterval(iv); window.setTimeout(() => amp.disconnect(), Math.max(0, (stopAt - ctx.currentTime) * 1000) + 300); }
  };
  const iv = window.setInterval(pump, 40); pump();
  return { stop: s => { amp.gain.cancelScheduledValues(s); amp.gain.setTargetAtTime(0, s, Math.max(.004, p.env.r / 4)); stopAt = Math.min(stopAt, s + Math.max(.05, p.env.r)); } };
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
  const amp = ctx.createGain(); amp.gain.value = 0; amp.connect(dest);
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
  const amp = ctx.createGain(), mix = ctx.createGain(); amp.gain.value = 0; amp.connect(dest); nodes.push(amp, mix);
  const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(); f1.frequency.value = f2.frequency.value = p.cutoff; f1.Q.value = p.res; f2.Q.value = .707;
  mix.connect(f1).connect(f2).connect(amp); nodes.push(f1, f2);
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
  return finish(srcs, nodes, adsr(amp.gain, t, p.env, gate, vel * .25), amp);
}

export type SirenParams = { wave: Wave; lfoWave: Wave; rate: number; depth: number; sweep: number; sweepTime: number; release: number; tone: number };
export const defaultSiren = (): SirenParams => ({ wave: "square", lfoWave: "square", rate: 4, depth: 7, sweep: 12, sweepTime: 1.5, release: .4, tone: 3500 });
/** Dub siren: one oscillator wobbled by an LFO (semitones) plus a long pitch rise/fall; sustains while the pad is held. */
export function playSiren(ctx: BaseAudioContext, dest: AudioNode, p: SirenParams, midi: number, t: number, gate: number, vel = 1): Voice {
  const f = 440 * 2 ** ((midi - 69) / 12), nodes: AudioNode[] = [], srcs: AudioScheduledSourceNode[] = [];
  const amp = ctx.createGain(), lp = ctx.createBiquadFilter(); amp.gain.value = 0; lp.frequency.value = p.tone; lp.Q.value = 2; lp.connect(amp).connect(dest);
  const osc = at(ctx.createOscillator(), t), lfo = at(ctx.createOscillator(), t), lg = ctx.createGain();
  osc.type = p.wave; lfo.type = p.lfoWave; lfo.frequency.value = p.rate; lg.gain.value = p.depth * 100;
  osc.frequency.setValueAtTime(f, t); osc.detune.setValueAtTime(0, t); osc.detune.linearRampToValueAtTime(p.sweep * 100, t + Math.max(.01, p.sweepTime));
  lfo.connect(lg).connect(osc.detune); osc.connect(lp); srcs.push(osc, lfo); nodes.push(osc, lfo, lg, lp, amp);
  const peak = vel * (p.wave === "sine" ? .5 : .28), hold = Math.max(gate, .02);
  amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(peak, t + .005); amp.gain.setTargetAtTime(0, t + hold, p.release / 3 + .005);
  const v = finish(srcs, nodes, t + hold + p.release * 2 + .1, amp);
  const stop = v.stop; v.stop = st => { amp.gain.cancelScheduledValues(st); amp.gain.setTargetAtTime(0, st, p.release / 3 + .005); stop(st + p.release * 2 + .05); };
  return v;
}
