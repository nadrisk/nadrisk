import { adsr, at, filterEnvAdsr, finish, link, type ADSR, type SynthParams, type Voice } from "./voices";

/** SYN: a clean subtractive voice. WAVE morphs saw > square > triangle > sine; VOICES 1 = mono glide, 2-8 = poly. */
export type CleanParams = { wave: number; sub: number; detune: number; voices: number; cutoff: number; res: number; envAmt: number; drive: number; env: ADSR; glide: number };
export const defaultClean = (): CleanParams => ({ wave: 0, sub: .25, detune: .15, voices: 8, cutoff: 2400, res: .15, envAmt: .35, drive: .1, env: { a: .005, d: .35, s: .6, r: .3 }, glide: .06 });
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
const WAVE_OF: Record<string, number> = { sawtooth: 0, square: 1, triangle: 2, sine: 3, additive: 0 };
export const WAVES: OscillatorType[] = ["sawtooth", "square", "triangle", "sine"];
export const WAVE_NAMES = ["SAW", "SQR", "TRI", "SIN"];

/** Fills missing fields; legacy additive/spectral synths are read as the closest clean patch (cutoff, res, amp env, osc 1 wave). */
export function cleanOf(s?: Partial<SynthParams>): CleanParams {
  const d = defaultClean(), c = s?.clean;
  const legacy: Partial<CleanParams> = c ? {} : { wave: WAVE_OF[s?.osc1?.wave ?? "sawtooth"] ?? 0, cutoff: s?.cutoff ?? d.cutoff, res: clamp(((s?.res ?? 1) - .7) / 12, 0, 1), envAmt: clamp((s?.filterEnv ?? 1.4) / 4, 0, 1), env: s?.env ?? d.env };
  const p = { ...d, ...legacy, ...c, env: { ...d.env, ...legacy.env, ...c?.env } };
  return { ...p, wave: clamp(p.wave, 0, 3), sub: clamp(p.sub, 0, 1), detune: clamp(p.detune, 0, 1), voices: Math.round(clamp(p.voices, 1, 8)), cutoff: clamp(p.cutoff, 40, 16000), res: clamp(p.res, 0, 1), envAmt: clamp(p.envAmt, 0, 1), drive: clamp(p.drive, 0, 1), glide: clamp(p.glide, 0, .5) };
}

const driveCache = new Map<number, Float32Array<ArrayBuffer>>();
const softCurve = (d: number) => { const k = Math.round(d * 20) / 20; let c = driveCache.get(k); if (c) return c; const g = 1 + k * 8; c = new Float32Array(new ArrayBuffer(1024 * 4)); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(g * x) / Math.tanh(g); } driveCache.set(k, c); return c; };
/** Weight of each wave for a morph position: two neighbours crossfade with equal power. */
export const waveMix = (w: number) => { const i = Math.min(2, Math.floor(w)), f = w - i, out = [0, 0, 0, 0]; out[i] = Math.cos(f * Math.PI / 2); out[i + 1] = Math.sin(f * Math.PI / 2); return out; };
// Squares and saws are louder than sines at equal amplitude; this keeps WAVE sweeps level.
const WAVE_GAIN = [.55, .5, .85, 1];

export function playClean(ctx: BaseAudioContext, dest: AudioNode, c: CleanParams, midi: number, t: number, gate: number, vel = 1, glideFrom?: number): Voice {
  const nodes: AudioNode[] = [], srcs: AudioScheduledSourceNode[] = [], f = 440 * 2 ** ((midi - 69) / 12);
  const from = glideFrom != null && c.glide > .001 ? 440 * 2 ** ((glideFrom - 69) / 12) : f;
  const amp = ctx.createGain(); amp.gain.value = 0; link(amp, dest);
  const mix = ctx.createGain(), sh = ctx.createWaveShaper(), post = ctx.createGain();
  sh.curve = softCurve(c.drive); sh.oversample = "2x"; mix.gain.value = 1 + c.drive * 2; post.gain.value = 1 / (1 + c.drive * 1.2);
  const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(); f1.type = f2.type = "lowpass"; f1.Q.value = .707 + c.res * 14; f2.Q.value = .6;
  filterEnvAdsr(f1.frequency, t, c.env, gate, c.cutoff, c.envAmt * 5); filterEnvAdsr(f2.frequency, t, c.env, gate, c.cutoff, c.envAmt * 5);
  mix.connect(sh).connect(post).connect(f1).connect(f2).connect(amp); nodes.push(mix, sh, post, f1, f2, amp);
  const freqs: AudioParam[] = [], dets: [OscillatorNode, number][] = [];
  const cents = c.detune * 28;
  waveMix(c.wave).forEach((w, k) => { if (w < .01) return;
    [-1, 1].forEach(sg => { const o = at(ctx.createOscillator(), t), g = ctx.createGain(); o.type = WAVES[k]; o.detune.value = sg * cents; g.gain.value = w * WAVE_GAIN[k] * .5;
      o.connect(g).connect(mix); freqs.push(o.frequency); dets.push([o, sg]); srcs.push(o); nodes.push(o, g); }); });
  const sub = at(ctx.createOscillator(), t), sg = ctx.createGain(); sub.type = "sine"; sg.gain.value = c.sub * .6; sub.connect(sg).connect(mix); srcs.push(sub); nodes.push(sub, sg);
  freqs.forEach(p => { p.setValueAtTime(from, t); if (from !== f) p.setTargetAtTime(f, t, c.glide / 3); (p as AudioParam & { __base?: number }).__base = f; });
  sub.frequency.setValueAtTime(from / 2, t); if (from !== f) sub.frequency.setTargetAtTime(f / 2, t, c.glide / 3); (sub.frequency as AudioParam & { __base?: number }).__base = f / 2;
  const v = finish(srcs, nodes, adsr(amp.gain, t, c.env, gate, vel * .42), amp);
  v.glide = (delta, a, time) => [...freqs, sub.frequency].forEach(p => { const q = p as AudioParam & { __base?: number }; const b = q.__base ?? p.value; p.cancelScheduledValues(a); p.setTargetAtTime(b * 2 ** (delta / 12), a, Math.max(.005, time / 3)); });
  v.update = q => { const nc = (q as { clean?: Partial<CleanParams> }).clean; if (!nc) return; const n = ctx.currentTime, tc = .01;
    if (nc.cutoff) { const ct = 1200 * Math.log2(nc.cutoff / c.cutoff); f1.detune.setTargetAtTime(ct, n, tc); f2.detune.setTargetAtTime(ct, n, tc); }
    if (nc.res !== undefined) f1.Q.setTargetAtTime(.707 + nc.res * 14, n, tc);
    if (nc.detune !== undefined) dets.forEach(([o, s]) => o.detune.setTargetAtTime(s * nc.detune! * 28, n, tc));
    if (nc.sub !== undefined) sg.gain.setTargetAtTime(nc.sub * .6, n, tc); };
  return v;
}
