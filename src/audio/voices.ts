// One-shot voice graphs built on the shared Web Audio context. Each trigger builds fresh nodes so every parameter applies instantly.
export type Wave = "sine" | "triangle" | "sawtooth" | "square";
export type FilterKind = "lowpass" | "highpass" | "bandpass" | "notch";
export type ADSR = { a: number; d: number; s: number; r: number };
export type DrumParams = { kind: "kick" | "snare" | "hat"; pitch: number; pitchEnv: number; pitchDecay: number; env: ADSR; noise: number; fm: number; fmRatio: number; ring: number; ringFreq: number; filter: FilterKind; cutoff: number; res: number; filterEnv: number; filterDecay: number };
export type OscParams = { wave: Wave | "additive"; gain: number; coarse: number; fine: number };
export type SynthParams = { osc1: OscParams; osc2: OscParams & { mode: "mix" | "fm"; fmAmount: number }; partials: number[]; noise: number; env: ADSR; filter: FilterKind; cutoff: number; res: number; filterEnv: number; filterDecay: number; wet: number; pitchEnv: number; pitchDecay: number; lfo: { wave: Wave; rate: number; depth: number; target: "pitch" | "cutoff" | "amp" } };
export type SamplerParams = { start: number; loop: boolean; pitch: number; env: ADSR; sampleName: string };
export type Voice = { stop: (at: number) => void };

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

function finish(srcs: AudioScheduledSourceNode[], nodes: AudioNode[], end: number, amp: GainNode): Voice {
  srcs.forEach(s => { s.start(Math.max(0, (s as unknown as { _t?: number })._t ?? 0)); s.stop(end); });
  srcs[0].onended = () => nodes.forEach(n => n.disconnect());
  return { stop: at => { amp.gain.cancelScheduledValues(at); amp.gain.setTargetAtTime(0, at, 0.004); srcs.forEach(s => { try { s.stop(at + 0.04); } catch { /* already stopped */ } }); } };
}
const at = <T extends AudioScheduledSourceNode>(s: T, t: number) => { (s as unknown as { _t: number })._t = t; return s; };

function filterWithEnv(ctx: BaseAudioContext, t: number, kind: FilterKind, cutoff: number, res: number, envOct: number, decay: number) {
  const f = ctx.createBiquadFilter(); f.type = kind; f.Q.value = res;
  f.frequency.setValueAtTime(clampF(cutoff * 2 ** envOct), t);
  f.frequency.exponentialRampToValueAtTime(clampF(cutoff), t + decay + 0.001);
  return f;
}

export function playDrum(ctx: BaseAudioContext, dest: AudioNode, p: DrumParams, t: number, vel = 1): Voice {
  const nodes: AudioNode[] = [], srcs: AudioScheduledSourceNode[] = [];
  const amp = ctx.createGain(); amp.gain.value = 0; amp.connect(dest);
  const filt = filterWithEnv(ctx, t, p.filter, p.cutoff, p.res, p.filterEnv, p.filterDecay); filt.connect(amp);
  const osc = at(ctx.createOscillator(), t); osc.type = p.kind === "hat" ? "square" : p.kind === "snare" ? "triangle" : "sine";
  osc.frequency.setValueAtTime(clampF(p.pitch * 2 ** (p.pitchEnv / 12)), t);
  osc.frequency.exponentialRampToValueAtTime(clampF(p.pitch), t + p.pitchDecay + 0.001);
  if (p.fm > 0) {
    const mod = at(ctx.createOscillator(), t); mod.frequency.value = p.pitch * p.fmRatio;
    const mg = ctx.createGain(); mg.gain.value = p.fm * p.pitch; mod.connect(mg).connect(osc.frequency); srcs.push(mod); nodes.push(mod, mg);
  }
  const ringVca = ctx.createGain(); ringVca.gain.value = 1 - p.ring;
  if (p.ring > 0) {
    const ro = at(ctx.createOscillator(), t); ro.frequency.value = p.ringFreq;
    const rd = ctx.createGain(); rd.gain.value = p.ring; ro.connect(rd).connect(ringVca.gain); srcs.push(ro); nodes.push(ro, rd);
  }
  const toneG = ctx.createGain(); toneG.gain.value = 1 - p.noise;
  osc.connect(ringVca).connect(toneG).connect(filt);
  const n = at(ctx.createBufferSource(), t); n.buffer = noiseBuffer(ctx); n.loop = true;
  const ng = ctx.createGain(); ng.gain.value = p.noise; n.connect(ng).connect(filt);
  srcs.unshift(osc); srcs.push(n); nodes.push(osc, ringVca, toneG, n, ng, filt, amp);
  const end = adsr(amp.gain, t, p.env, p.env.a + p.env.d, vel);
  return finish(srcs, nodes, end, amp);
}

export function partialWave(ctx: BaseAudioContext, partials: number[]) {
  const real = new Float32Array(17), imag = new Float32Array(17);
  partials.forEach((v, i) => { const h = i < 8 ? i * 2 + 1 : (i - 8) * 2 + 2; imag[h] = v; });
  if (!imag.some(v => v > 0)) imag[1] = 1;
  return ctx.createPeriodicWave(real, imag);
}

export function playSynth(ctx: BaseAudioContext, dest: AudioNode, p: SynthParams, midi: number, t: number, gate: number, vel = 1): Voice {
  const nodes: AudioNode[] = [], srcs: AudioScheduledSourceNode[] = [];
  const base = 440 * 2 ** ((midi - 69) / 12);
  const amp = ctx.createGain(); amp.gain.value = 0; amp.connect(dest);
  const trem = ctx.createGain(); trem.connect(amp);
  const mix = ctx.createGain();
  const filt = filterWithEnv(ctx, t, p.filter, p.cutoff, p.res, p.filterEnv, p.filterDecay);
  const wet = ctx.createGain(); wet.gain.value = p.wet; const dry = ctx.createGain(); dry.gain.value = 1 - p.wet;
  mix.connect(filt).connect(wet).connect(trem); mix.connect(dry).connect(trem);
  const makeOsc = (o: OscParams) => {
    const osc = at(ctx.createOscillator(), t);
    if (o.wave === "additive") osc.setPeriodicWave(partialWave(ctx, p.partials)); else osc.type = o.wave;
    osc.frequency.value = base * 2 ** (o.coarse / 12);
    osc.detune.setValueAtTime(o.fine + p.pitchEnv * 100, t);
    osc.detune.linearRampToValueAtTime(o.fine, t + p.pitchDecay + 0.001);
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
  return finish(srcs, nodes, end, amp);
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
  src.onended = () => { src.disconnect(); amp.disconnect(); };
  return { stop: s => { amp.gain.cancelScheduledValues(s); amp.gain.setTargetAtTime(0, s, 0.004); try { src.stop(s + 0.04); } catch { /* stopped */ } } };
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
