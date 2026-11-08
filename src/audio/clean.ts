import { ENGINE_TRIM } from "./loudness";
import { adsr, at, filterEnvAdsr, finish, link, type ADSR, type SynthParams, type Voice } from "./voices";

/** SYN: a clean subtractive voice. WAVE morphs saw > square > triangle > sine; VOICES 1 = mono glide, 2-8 = poly. */
export type CleanParams = { wave: number; sub: number; detune: number; voices: number; cutoff: number; res: number; envAmt: number; drive: number; env: ADSR; glide: number; /** Filter model: 0 CLEAN, 1 LADDER, 2 SEM, 3 MS20 (missing = CLEAN). */ flt?: number };
export const defaultClean = (): CleanParams => ({ wave: 0, sub: .25, detune: .15, voices: 8, cutoff: 2400, res: .15, envAmt: .35, drive: .1, env: { a: .005, d: .35, s: .6, r: .3 }, glide: .06 });
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
const WAVE_OF: Record<string, number> = { sawtooth: 0, square: 1, triangle: 2, sine: 3, additive: 0 };
export const WAVES: OscillatorType[] = ["sawtooth", "square", "triangle", "sine"];
export const WAVE_NAMES = ["SAW", "SQR", "TRI", "SIN"];
export const FILTER_MODELS = ["CLEAN", "LADDR", "SEM", "MS20"] as const;
/** Resonance Q of the env-tracked stages per model (res 0..1). LADDER resonance comes from its peak stage, MS20 screams. */
export const modelQ = (flt: number, res: number): number[] => flt === 1 ? [.54, .54, .54, .54] : flt === 2 ? [.5 + res * 5] : flt === 3 ? [.707 + res * 24, .707] : [.707 + res * 14, .6];
const screamCache: { c?: Float32Array<ArrayBuffer> } = {};
const scream = () => screamCache.c ??= (() => { const c = new Float32Array(new ArrayBuffer(1024 * 4)); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(2.5 * x) / Math.tanh(2.5); } return c; })();

/** Fills missing fields; legacy additive/spectral synths are read as the closest clean patch (cutoff, res, amp env, osc 1 wave). */
export function cleanOf(s?: Partial<SynthParams>): CleanParams {
  const d = defaultClean(), c = s?.clean;
  const legacy: Partial<CleanParams> = c ? {} : { wave: WAVE_OF[s?.osc1?.wave ?? "sawtooth"] ?? 0, cutoff: s?.cutoff ?? d.cutoff, res: clamp(((s?.res ?? 1) - .7) / 12, 0, 1), envAmt: clamp((s?.filterEnv ?? 1.4) / 4, 0, 1), env: s?.env ?? d.env };
  const p = { ...d, ...legacy, ...c, env: { ...d.env, ...legacy.env, ...c?.env } };
  return { ...p, wave: clamp(p.wave, 0, 3), sub: clamp(p.sub, 0, 1), detune: clamp(p.detune, 0, 1), voices: Math.round(clamp(p.voices, 1, 8)), cutoff: clamp(p.cutoff, 40, 16000), res: clamp(p.res, 0, 1), envAmt: clamp(p.envAmt, 0, 1), drive: clamp(p.drive, 0, 1), glide: clamp(p.glide, 0, .5), flt: Math.round(clamp(p.flt ?? 0, 0, 3)) };
}

const driveCache = new Map<number, Float32Array<ArrayBuffer>>();
const softCurve = (d: number) => { const k = Math.round(d * 20) / 20; let c = driveCache.get(k); if (c) return c; const g = 1 + k * 8; c = new Float32Array(new ArrayBuffer(1024 * 4)); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(g * x) / Math.tanh(g); } driveCache.set(k, c); return c; };
/** Weight of each wave for a morph position: two neighbours crossfade with equal power. */
export const waveMix = (w: number) => { const i = Math.min(2, Math.floor(w)), f = w - i, out = [0, 0, 0, 0]; out[i] = Math.cos(f * Math.PI / 2); out[i + 1] = Math.sin(f * Math.PI / 2); return out; };
// Squares and saws are louder than sines at equal amplitude; this keeps WAVE sweeps level.
const WAVE_GAIN = [.55, .5, .85, 1];

export function playClean(ctx: BaseAudioContext, dest: AudioNode, c: CleanParams, midi: number, t: number, gate: number, vel = 1, glideFrom?: number, pan = 0): Voice {
  const nodes: AudioNode[] = [], srcs: AudioScheduledSourceNode[] = [], f = 440 * 2 ** ((midi - 69) / 12);
  const from = glideFrom != null && c.glide > .001 ? 440 * 2 ** ((glideFrom - 69) / 12) : f;
  const amp = ctx.createGain(); amp.gain.value = 0; link(amp, dest);
  const mix = ctx.createGain(), sh = ctx.createWaveShaper(), post = ctx.createGain();
  sh.curve = softCurve(c.drive); sh.oversample = "2x"; mix.gain.value = 1 + c.drive * 2; post.gain.value = 1 / (1 + c.drive * 1.2);
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
  let last: AudioNode = post; mix.connect(sh).connect(post); for (const n of chain) { last.connect(n); last = n; } last.connect(amp);
  nodes.push(mix, sh, post, ...chain, amp);
  const tracked = peak ? [...fs, peak] : fs;
  const freqs: AudioParam[] = [], dets: [OscillatorNode, number][] = [];
  // Each detuned pair is panned apart (and each chord voice gets its own spot), so detune widens in stereo instead of combing in mono.
  const cents = c.detune * 28;
  waveMix(c.wave).forEach((w, k) => { if (w < .01) return;
    [-1, 1].forEach(sg => { const o = at(ctx.createOscillator(), t), g = ctx.createGain(); o.type = WAVES[k]; o.detune.value = sg * cents; g.gain.value = w * WAVE_GAIN[k] * .5;
      const pn = ctx.createStereoPanner(); pn.pan.value = clamp(pan + sg * (.25 + c.detune * .45), -1, 1);
      o.connect(g).connect(pn).connect(mix); nodes.push(pn); freqs.push(o.frequency); dets.push([o, sg]); srcs.push(o); nodes.push(o, g); }); });
  const sub = at(ctx.createOscillator(), t), sg = ctx.createGain(), sp = ctx.createStereoPanner(); sp.pan.value = 0; sub.type = "sine"; sg.gain.value = c.sub * .6; sub.connect(sg).connect(sp).connect(mix); nodes.push(sp); srcs.push(sub); nodes.push(sub, sg);
  freqs.forEach(p => { p.setValueAtTime(from, t); if (from !== f) p.setTargetAtTime(f, t, c.glide / 3); (p as AudioParam & { __base?: number }).__base = f; });
  sub.frequency.setValueAtTime(from / 2, t); if (from !== f) sub.frequency.setTargetAtTime(f / 2, t, c.glide / 3); (sub.frequency as AudioParam & { __base?: number }).__base = f / 2;
  const v = finish(srcs, nodes, adsr(amp.gain, t, c.env, gate, vel * .42 * ENGINE_TRIM.synth), amp);
  v.glide = (delta, a, time) => [...freqs, sub.frequency].forEach(p => { const q = p as AudioParam & { __base?: number }; const b = q.__base ?? p.value; p.cancelScheduledValues(a); p.setTargetAtTime(b * 2 ** (delta / 12), a, Math.max(.005, time / 3)); });
  v.update = q => { const nc = (q as { clean?: Partial<CleanParams> }).clean; if (!nc) return; const n = ctx.currentTime, tc = .01;
    if (nc.cutoff) { const ct = 1200 * Math.log2(nc.cutoff / c.cutoff); tracked.forEach(b => b.detune.setTargetAtTime(ct, n, tc)); }
    if (nc.res !== undefined) { const r = Math.max(0, Math.min(1, nc.res)); modelQ(flt, r).forEach((q, k) => fs[k].Q.setTargetAtTime(q, n, tc));
      if (peak) { peak.gain.setTargetAtTime(r * 18, n, tc); peak.Q.setTargetAtTime(3 + r * 6, n, tc); } if (shelf) shelf.gain.setTargetAtTime(-r * 6, n, tc); }
    if (nc.detune !== undefined) dets.forEach(([o, s]) => o.detune.setTargetAtTime(s * nc.detune! * 28, n, tc));
    if (nc.sub !== undefined) sg.gain.setTargetAtTime(nc.sub * .6, n, tc); };
  return v;
}
