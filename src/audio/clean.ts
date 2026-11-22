import * as Tone from "tone";
import { ENGINE_TRIM } from "./loudness";
import { TERRAIN_DEFAULTS } from "./terrain";
import { adsr, at, filterEnvAdsr, finish, link, noiseBuffer, type ADSR, type SynthParams, type Voice } from "./voices";

/** SYN = SURF: a wave-terrain voice (nad-terrain). TRN knobs shape the terrain (FREQ, HOLD, SNOW, FOLD); cx/cy move the orbit
 *  centre (the XY pad), rad is the orbit size. Filter, envelopes, sub, noise and glide follow. VOICES 1 = mono glide, 2-8 = poly. */
export type CleanParams = { sub: number; detune: number; voices: number; cutoff: number; res: number; envAmt: number; drive: number; env: ADSR; glide: number; /** Filter model: 0 CLEAN, 1 LADDER, 2 SEM, 3 MS20 (missing = CLEAN). */ flt?: number;
  tfreq: number; hold: number; snow: number; fold: number; cx: number; cy: number; rad: number;
  /** Pre-filter noise 0-1. */ noise?: number; /** Pitch envelope semitones (-24..24) and decay seconds. */ pAmt?: number; pDec?: number; /** Tempo (set per trigger, not saved). */ bpm?: number };
export const defaultClean = (): CleanParams => ({ sub: 0, detune: 0, voices: 8, cutoff: 16000, res: 0, envAmt: 0, drive: 0, env: { a: .005, d: .35, s: .6, r: .3 }, glide: .06, noise: 0, pAmt: 0, pDec: .05,
  tfreq: TERRAIN_DEFAULTS.freq, hold: TERRAIN_DEFAULTS.hold, snow: TERRAIN_DEFAULTS.snow, fold: TERRAIN_DEFAULTS.fold, cx: 0, cy: 0, rad: .6 });
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
export const FILTER_MODELS = ["CLEAN", "LADDR", "SEM", "MS20"] as const;
/** Resonance Q of the env-tracked stages per model (res 0..1). LADDER resonance comes from its peak stage, MS20 screams. */
export const modelQ = (flt: number, res: number): number[] => flt === 1 ? [.54, .54, .54, .54] : flt === 2 ? [.5 + res * 5] : flt === 3 ? [.707 + res * 24, .707] : [.707 + res * 14, .6];
const screamCache: { c?: Float32Array<ArrayBuffer> } = {};
const scream = () => screamCache.c ??= (() => { const c = new Float32Array(new ArrayBuffer(1024 * 4)); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(2.5 * x) / Math.tanh(2.5); } return c; })();

/** Fills missing fields; legacy additive/spectral synths are read as the closest clean patch (cutoff, res, amp env, osc 1 wave). */
export function cleanOf(s?: Partial<SynthParams>): CleanParams {
  const d = defaultClean(), c = s?.clean;
  const legacy: Partial<CleanParams> = c ? {} : { cutoff: s?.cutoff ?? d.cutoff, res: clamp(((s?.res ?? 1) - .7) / 12, 0, 1), envAmt: clamp((s?.filterEnv ?? 1.4) / 4, 0, 1), env: s?.env ?? d.env };
  const e0 = { ...d.env, ...legacy.env, ...c?.env };
  const p = { ...d, ...legacy, ...c, env: { a: clamp(e0.a, .001, 1), d: clamp(e0.d, .005, 1), s: clamp(e0.s, 0, 1), r: clamp(e0.r, .005, 1) } };
  return { ...p, sub: clamp(p.sub, 0, 1), detune: clamp(p.detune, 0, 1), voices: Math.round(clamp(p.voices, 1, 8)), cutoff: clamp(p.cutoff, 40, 16000), res: clamp(p.res, 0, 1), envAmt: clamp(p.envAmt, 0, 1), drive: clamp(p.drive, 0, 1), glide: clamp(p.glide, 0, .5), flt: Math.round(clamp(p.flt ?? 0, 0, 3)), noise: clamp(p.noise ?? 0, 0, 1), pAmt: clamp(p.pAmt ?? 0, -24, 24), pDec: clamp(p.pDec ?? .05, .002, 1),
    tfreq: clamp(p.tfreq, 0, 1), hold: clamp(p.hold, -1, 1), snow: clamp(p.snow, 0, 1), fold: clamp(p.fold, 0, 1), cx: clamp(p.cx, -1, 1), cy: clamp(p.cy, -1, 1), rad: clamp(p.rad, .05, 1) };
}

const driveCache = new Map<number, Float32Array<ArrayBuffer>>();
const softCurve = (d: number) => { const k = Math.round(d * 20) / 20; let c = driveCache.get(k); if (c) return c; const g = 1 + k * 8; c = new Float32Array(new ArrayBuffer(1024 * 4)); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(g * x) / Math.tanh(g); } driveCache.set(k, c); return c; };

export function playClean(ctx: BaseAudioContext, dest: AudioNode, c: CleanParams, midi: number, t: number, gate: number, vel = 1, glideFrom?: number, pan = 0): Voice {
  const nodes: AudioNode[] = [], srcs: AudioScheduledSourceNode[] = [], f = 440 * 2 ** ((midi - 69) / 12);
  const from = glideFrom != null && c.glide > .001 ? 440 * 2 ** ((glideFrom - 69) / 12) : f;
  const amp = ctx.createGain(); amp.gain.value = 0; link(amp, dest);
  const mix = ctx.createGain(), sh = ctx.createWaveShaper(), post = ctx.createGain();
  // DRIVE 0 must be a clean wire: tanh(1·x)/tanh(1) still bends loud peaks (~5% THD), so bypass the shaper entirely.
  const dry = c.drive <= 0;
  if (!dry) { sh.curve = softCurve(c.drive); sh.oversample = "2x"; }
  mix.gain.value = dry ? 1 : 1 + c.drive * 2; post.gain.value = dry ? 1 : 1 / (1 + c.drive * 1.2);
  // Filter model: env-tracked stages (fs) share cutoff + envelope; extras give each model its character.
  const flt = c.flt ?? 0, qs = modelQ(flt, c.res), fs = qs.map((q, k) => { const b = ctx.createBiquadFilter(); b.type = flt === 3 && k === 1 ? "highpass" : "lowpass"; b.Q.value = q; return b; });
  const envOf = (b: BiquadFilterNode, mul = 1) => filterEnvAdsr(b.frequency, t, c.env, gate, c.cutoff * mul, c.envAmt * 5);
  fs.forEach((b, k) => envOf(b, flt === 3 && k === 1 ? 1 / 10 : 1));
  const chain: AudioNode[] = [...fs];
  let peak: BiquadFilterNode | null = null, shelf: BiquadFilterNode | null = null;
  if (flt === 1) { // LADDER: 24 dB cascade, resonant peak at cutoff, bass thins as resonance rises (like a Moog ladder).
    peak = ctx.createBiquadFilter(); peak.type = "peaking"; peak.Q.value = 3 + c.res * 6; peak.gain.value = c.res * 18; envOf(peak);
    shelf = ctx.createBiquadFilter(); shelf.type = "lowshelf"; shelf.frequency.value = 180; shelf.gain.value = -c.res * 6;
    chain.unshift(shelf); chain.push(peak);
  } else if (flt === 3) { const w = ctx.createWaveShaper(); w.curve = scream(); w.oversample = "2x"; chain.splice(1, 0, w); }
  let last: AudioNode = post; if (dry) mix.connect(post); else mix.connect(sh).connect(post); for (const n of chain) { last.connect(n); last = n; } last.connect(amp);
  nodes.push(mix, sh, post, ...chain, amp);
  const tracked = peak ? [...fs, peak] : fs;
  const freqs: AudioParam[] = [], dets: [AudioParam, number][] = [];
  // Two orbiters per voice (detune sides, panned apart) read the same terrain; native sine only before worklets load.
  const cents = c.detune * 28, ters: AudioWorkletNode[] = [];
  const TP = (o: AudioWorkletNode, k: string) => o.parameters?.get(k);
  const terrainSet = (q: CleanParams, n: number, tc: number) => ters.forEach(o => { TP(o, "cx")?.setTargetAtTime(q.cx, n, tc); TP(o, "cy")?.setTargetAtTime(q.cy, n, tc); TP(o, "radius")?.setTargetAtTime(q.rad, n, tc);
    TP(o, "tfreq")?.setTargetAtTime(q.tfreq, n, tc); TP(o, "hold")?.setTargetAtTime(q.hold, n, tc); TP(o, "snow")?.setTargetAtTime(q.snow, n, tc); TP(o, "fold")?.setTargetAtTime(q.fold, n, tc); });
  for (const sg of [-1, 1]) {
    // Tone wraps the raw context (standardized-audio-context), so the native AudioWorkletNode constructor rejects it; Tone's factory works on both.
    let o: AudioWorkletNode | null = null; if ((Tone.getContext().rawContext as unknown) === ctx) try { o = Tone.getContext().createAudioWorkletNode("nad-terrain", { numberOfInputs: 0, outputChannelCount: [1] }) as unknown as AudioWorkletNode; } catch { o = null; }
    const g = ctx.createGain(), pn = ctx.createStereoPanner(); g.gain.value = .5; pn.pan.value = clamp(pan + sg * (.25 + c.detune * .45), -1, 1);
    if (o && TP(o, "frequency") && TP(o, "detune")) { const fq = TP(o, "frequency")!, dt = TP(o, "detune")!; dt.value = sg * cents; ters.push(o); o.connect(g).connect(pn).connect(mix); nodes.push(o, g, pn); freqs.push(fq); dets.push([dt, sg]); }
    else { o?.disconnect(); const n = at(ctx.createOscillator(), t); n.type = "sine"; n.detune.value = sg * cents; n.connect(g).connect(pn).connect(mix); nodes.push(n, g, pn); srcs.push(n); freqs.push(n.frequency); dets.push([n.detune, sg]); }
  }
  for (const o of ters) for (const [k, v] of [["cx", c.cx], ["cy", c.cy], ["radius", c.rad], ["tfreq", c.tfreq], ["hold", c.hold], ["snow", c.snow], ["fold", c.fold]] as const) { const p = TP(o, k); if (p) p.value = v; }
  // Noise oscillator, pre-filter so the envelope and filter shape it.
  let ng: GainNode | null = null;
  if ((c.noise ?? 0) > 0) { const n = at(ctx.createBufferSource(), t); n.buffer = noiseBuffer(ctx); n.loop = true; n.loopStart = Math.random(); ng = ctx.createGain(); ng.gain.value = (c.noise ?? 0) ** 2 * .35; n.connect(ng).connect(mix); srcs.push(n); nodes.push(n, ng); }
  const sub = at(ctx.createOscillator(), t), sg = ctx.createGain(), sp = ctx.createStereoPanner(); sp.pan.value = 0; sub.type = "sine"; sg.gain.value = c.sub * .6; sub.connect(sg).connect(sp).connect(mix); nodes.push(sp); srcs.push(sub); nodes.push(sub, sg);
  freqs.forEach(p => { p.setValueAtTime(from, t); if (from !== f) p.setTargetAtTime(f, t, c.glide / 3); (p as AudioParam & { __base?: number }).__base = f; });
  sub.frequency.setValueAtTime(from / 2, t); if (from !== f) sub.frequency.setTargetAtTime(f / 2, t, c.glide / 3); (sub.frequency as AudioParam & { __base?: number }).__base = f / 2;
  // A separate audio-rate control signal adds pitch decay to every oscillator's detune.
  // Baseline detune edits cannot replace this automation, including on nad-terrain AudioParams.
  if (c.pAmt) {
    const pitch = at(ctx.createConstantSource(), t);
    pitch.offset.setValueAtTime(c.pAmt * 100, t);
    pitch.offset.setTargetAtTime(0, t, Math.max(.002, c.pDec ?? .05) / 4);
    dets.forEach(([detune]) => pitch.connect(detune)); pitch.connect(sub.detune);
    nodes.push(pitch); srcs.push(pitch);
  }
  const v = finish(srcs, nodes, adsr(amp.gain, t, c.env, gate, vel * .42 * ENGINE_TRIM.synth), amp, () => { ters.forEach(o => o.port.postMessage({ stop: 1 })); });
  const cur: CleanParams = { ...c };
  v.glide = (delta, a, time) => [...freqs, sub.frequency].forEach(p => { const q = p as AudioParam & { __base?: number }; const b = q.__base ?? p.value; p.cancelScheduledValues(a); p.setTargetAtTime(b * 2 ** (delta / 12), a, Math.max(.005, time / 3)); });
  v.update = q => { const nc = (q as { clean?: Partial<CleanParams> }).clean; if (!nc) return; const n = ctx.currentTime, tc = .01;
    if (nc.cutoff) { const ct = 1200 * Math.log2(nc.cutoff / c.cutoff); tracked.forEach(b => b.detune.setTargetAtTime(ct, n, tc)); }
    if (nc.res !== undefined) { const r = Math.max(0, Math.min(1, nc.res)); modelQ(flt, r).forEach((q, k) => fs[k].Q.setTargetAtTime(q, n, tc));
      if (peak) { peak.gain.setTargetAtTime(r * 18, n, tc); peak.Q.setTargetAtTime(3 + r * 6, n, tc); } if (shelf) shelf.gain.setTargetAtTime(-r * 6, n, tc); }
    const detune = nc.detune;
    if (detune !== undefined && detune !== cur.detune) dets.forEach(([p, s]) => p.setTargetAtTime(s * detune * 28, n, tc));
    if (nc.sub !== undefined) sg.gain.setTargetAtTime(nc.sub * .6, n, tc);
    if (nc.noise !== undefined && ng) ng.gain.setTargetAtTime(nc.noise ** 2 * .35, n, tc);
    Object.assign(cur, nc); terrainSet(cur, n, tc); };
  return v;
}
