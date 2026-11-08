import { PAD_PRESETS, padPartials, vowelAt, type PadRecipe, type PadTable } from "./padPresets";
import { adsr, at, finish, link, noiseBuffer, type Voice } from "./voices";
import { ENGINE_TRIM } from "./loudness";

/** Saved PAD sound: preset index + four macros (0..1) + attack/release seconds. Missing fields come from the preset. */
export type PadParams = { preset: number; bright: number; motion: number; space: number; age: number; atk: number; rel: number };
export const PAD_MAX_VOICES = 6;
const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
export const padPreset = (i: number): PadRecipe => PAD_PRESETS[((Math.round(i) % PAD_PRESETS.length) + PAD_PRESETS.length) % PAD_PRESETS.length];
export const padFromPreset = (i: number): PadParams => { const r = padPreset(i); return { preset: PAD_PRESETS.indexOf(r), bright: r.bright, motion: r.motion, space: r.space, age: r.age, atk: r.a, rel: r.r }; };
export const defaultPad = (): PadParams => padFromPreset(0);
export function padParams(p?: Partial<PadParams>): PadParams {
  const d = padFromPreset(p?.preset ?? 0);
  return { preset: d.preset, bright: cl(p?.bright ?? d.bright, 0, 1), motion: cl(p?.motion ?? d.motion, 0, 1), space: cl(p?.space ?? d.space, 0, 1), age: cl(p?.age ?? d.age, 0, 1), atk: cl(p?.atk ?? d.atk, .002, 6), rel: cl(p?.rel ?? d.rel, .05, 8) };
}
/** Filter cutoff for a recipe at BRIGHT (0.5 = recipe value, ±2 octaves), darkened by AGE. */
export const padCutoff = (r: PadRecipe, p: PadParams) => cl(r.cutoff * 2 ** ((p.bright - .5) * 4) * (1 - p.age * .35), 80, 16000);
/** Number of new chord notes a pad may ring alongside the ones already ringing, so the pad never exceeds PAD_MAX_VOICES. */
export const padRingCap = (chordSize: number) => Math.max(1, Math.floor(PAD_MAX_VOICES / Math.max(1, chordSize)));

const tables = new WeakMap<BaseAudioContext, Map<PadTable, PeriodicWave>>();
function waveOf(ctx: BaseAudioContext, t: PadTable) {
  let m = tables.get(ctx); if (!m) tables.set(ctx, m = new Map());
  let w = m.get(t); if (w) return w;
  const ps = padPartials(t), re = new Float32Array(ps.length + 1), im = new Float32Array(ps.length + 1);
  ps.forEach((a, k) => { im[k + 1] = a; });
  w = ctx.createPeriodicWave(re, im); m.set(t, w); return w;
}

export function playPad(ctx: BaseAudioContext, dest: AudioNode, p0: PadParams, midi: number, t: number, gate: number, vel = 1, pan = 0): Voice {
  const p = padParams(p0), r = padPreset(p.preset), f = 440 * 2 ** ((midi - 69) / 12);
  const nodes: AudioNode[] = [], srcs: AudioScheduledSourceNode[] = [];
  const amp = ctx.createGain(); amp.gain.value = 0; link(amp, dest);
  const mix = ctx.createGain(); mix.gain.value = 1;
  // Ensemble: dry plus two modulated short delays panned apart (string-machine / Dimension style).
  const out = ctx.createGain(); out.connect(amp);
  const dry = ctx.createGain(); dry.gain.value = .7; mix.connect(dry).connect(out);
  const ens = at(ctx.createOscillator(), t), ensG = ctx.createGain(); ens.frequency.value = .45 + p.motion * .5; ensG.gain.value = .0015 + p.space * .002; ens.connect(ensG); srcs.push(ens); nodes.push(ens, ensG, mix, dry, out, amp);
  const wet = .25 + p.space * .45;
  [[.011, -1], [.017, 1]].forEach(([dt, side], k) => { const d = ctx.createDelay(.05), g = ctx.createGain(), pn = ctx.createStereoPanner(); d.delayTime.value = dt; g.gain.value = wet * (k ? -1 : 1) * (k ? 1 : 1); pn.pan.value = cl(side * (.4 + p.space * .6), -1, 1);
    ensG.connect(d.delayTime); mix.connect(d).connect(g).connect(pn).connect(out); nodes.push(d, g, pn); });
  // Filter with a slow swell (or a falling stab when swell < 0) over the attack.
  const flt = ctx.createBiquadFilter(); flt.type = "lowpass"; flt.Q.value = r.res; const cut = padCutoff(r, p);
  const c0 = cl(cut * 2 ** (-r.swell * 1.5), 60, 18000);
  flt.frequency.setValueAtTime(c0, t); flt.frequency.setTargetAtTime(cut, t, Math.max(.02, p.atk * .6)); nodes.push(flt);
  // MOTION: slow LFO on cutoff; AGE: slower drift on pitch plus a little tape flutter.
  const lfo = at(ctx.createOscillator(), t), lfoG = ctx.createGain(); lfo.frequency.value = .08 + p.motion * .5; lfoG.gain.value = p.motion * 900; lfo.connect(lfoG).connect(flt.detune); srcs.push(lfo); nodes.push(lfo, lfoG);
  const drift = at(ctx.createOscillator(), t), driftG = ctx.createGain(); drift.frequency.value = .07 + (midi % 7) * .013; driftG.gain.value = 2 + p.age * 16; drift.connect(driftG); srcs.push(drift); nodes.push(drift, driftG);
  const flut = at(ctx.createOscillator(), t), flutG = ctx.createGain(); flut.frequency.value = 4.3; flutG.gain.value = p.age * 6; flut.connect(flutG); srcs.push(flut); nodes.push(flut, flutG);
  // Formant bank (choir presets): three parallel resonances morphed between two vowels by BRIGHT.
  let into: AudioNode = flt;
  if (r.vowel) { const fs = vowelAt(r.vowel, p.bright), sum = ctx.createGain(); sum.gain.value = 1; const pre = ctx.createGain(); pre.gain.value = .35;
    pre.connect(sum); fs.forEach((fq, k) => { const b = ctx.createBiquadFilter(); b.type = "bandpass"; b.frequency.value = fq; b.Q.value = fq / (k === 0 ? 90 : k === 1 ? 110 : 160); const g = ctx.createGain(); g.gain.value = [2.2, 1.6, 1][k]; pre.connect(b).connect(g).connect(sum); nodes.push(b, g); });
    sum.connect(flt); into = pre; nodes.push(sum, pre); }
  flt.connect(mix);
  // Oscillator stack: each layer is a detuned pair spread in stereo.
  const fm = r.fm ? at(ctx.createOscillator(), t) : null, fmG = fm ? ctx.createGain() : null;
  if (fm && fmG && r.fm) { fm.frequency.value = f * r.fm.ratio; const depth = f * r.fm.amt * (.5 + p.bright); fmG.gain.setValueAtTime(depth, t); fmG.gain.setTargetAtTime(depth * .15, t, r.fm.decay / 3); fm.connect(fmG); srcs.push(fm); nodes.push(fm, fmG); }
  const total = r.layers.reduce((a, l) => a + l.gain, 0) || 1, cents = r.detune * (.6 + p.space * .8);
  const freqs: AudioParam[] = [];
  r.layers.forEach((l, li) => [-1, 1].forEach(sg => {
    const o = at(ctx.createOscillator(), t), g = ctx.createGain(), pn = ctx.createStereoPanner();
    o.setPeriodicWave(waveOf(ctx, l.table)); o.frequency.value = f * 2 ** l.oct; o.detune.value = sg * cents; g.gain.value = l.gain / total * .5;
    pn.pan.value = cl(pan + sg * (.2 + p.space * .5), -1, 1);
    driftG.connect(o.detune); flutG.connect(o.detune); if (li === 0 && fmG) fmG.connect(o.frequency);
    o.connect(g).connect(pn).connect(into); srcs.push(o); nodes.push(o, g, pn); freqs.push(o.frequency);
  }));
  if (r.air > 0) { const n = at(ctx.createBufferSource(), t), bp = ctx.createBiquadFilter(), g = ctx.createGain(); n.buffer = noiseBuffer(ctx); n.loop = true; bp.type = "bandpass"; bp.frequency.value = 5000 + p.bright * 4000; bp.Q.value = .8; g.gain.value = r.air * .12; n.connect(bp).connect(g).connect(mix); srcs.push(n); nodes.push(n, bp, g); }
  const env = { a: p.atk, d: r.d, s: r.s, r: p.rel * (1 + p.space * .8) };
  // srcs[0] must be an oscillator that runs to the end; the ensemble LFO is first.
  const v = finish(srcs, nodes, adsr(amp.gain, t, env, gate, vel * .3 * ENGINE_TRIM.pad), amp);
  v.update = q => { const np = (q as { pad?: Partial<PadParams> }).pad; if (!np) return; const n = ctx.currentTime;
    if (np.bright !== undefined) flt.detune.setTargetAtTime(1200 * Math.log2(padCutoff(r, padParams({ ...p, ...np })) / cut), n, .05);
    if (np.motion !== undefined) lfoG.gain.setTargetAtTime(cl(np.motion, 0, 1) * 900, n, .05); };
  void freqs; return v;
}
