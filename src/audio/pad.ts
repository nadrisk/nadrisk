import { PAD_PRESETS, padPartials, vowelAt, type PadRecipe, type PadTable } from "./padPresets";
import { adsr, at, finish, link, noiseBuffer, type Voice } from "./voices";
import { ENGINE_TRIM } from "./loudness";
import { pianoBuffers, pianoPick, preloadPiano } from "./pianoSamples";

/** Saved PAD sound: preset index + four macros (0..1) + attack/release seconds. Missing fields come from the preset. */
export type PadParams = { preset: number; bright: number; motion: number; space: number; age: number; atk: number; rel: number; /** Pad octave −3..+3. */ oct?: number; /** Chord-tone octave −2..+2 (root stays). */ coct?: number; /** Piano decay scale (XY TIGHT): 1 = natural ring, lower = shorter. */ dec?: number };
export const PAD_MAX_VOICES = 6;
const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
export const padPreset = (i: number): PadRecipe => PAD_PRESETS[((Math.round(i) % PAD_PRESETS.length) + PAD_PRESETS.length) % PAD_PRESETS.length];
export const padFromPreset = (i: number): PadParams => { const r = padPreset(i); return { preset: PAD_PRESETS.indexOf(r), bright: r.bright, motion: r.motion, space: r.space, age: r.age, atk: r.a, rel: r.r, oct: 0, coct: 0 }; };
export const defaultPad = (): PadParams => padFromPreset(0);
export function padParams(p?: Partial<PadParams>): PadParams {
  const d = padFromPreset(p?.preset ?? 0);
  return { preset: d.preset, bright: cl(p?.bright ?? d.bright, -.25, 1), motion: cl(p?.motion ?? d.motion, 0, 1), space: cl(p?.space ?? d.space, 0, 1), age: cl(p?.age ?? d.age, 0, 1), atk: cl(p?.atk ?? d.atk, .002, 6), rel: cl(p?.rel ?? d.rel, .05, 8), oct: Math.round(cl(p?.oct ?? 0, -3, 3)), coct: Math.round(cl(p?.coct ?? 0, -2, 2)), ...(p?.dec !== undefined ? { dec: cl(p.dec, .05, 1) } : {}) };
}
/** Filter cutoff for a recipe at BRIGHT (0 = recipe value, up to +2.5 octaves), darkened by AGE. */
export const padCutoff = (r: PadRecipe, p: PadParams) => cl(r.cutoff * 2 ** (p.bright * 2.5) * (1 - p.age * .3), 80, 16000);
/** Piano tone spans felt-dark to open; velocity adds a bounded half-octave, AGE darkens it. */
export const keysCutoff = (p: PadParams, vel: number) => cl(800 * 17.5 ** p.bright * 2 ** ((cl(vel, 0, 1) - 1) * .5) * (1 - p.age * .55), 250, 16000);
/** SP-1200 style 12-bit staircase (shared per context). */
const crush = new WeakMap<BaseAudioContext, Float32Array>();
export function bitCurve(bits: number, n = 8192) { const q = 2 ** (bits - 1), c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.round(x * q) / q; } return c; }
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
  if (typeof fetch !== "undefined" && typeof window !== "undefined") void preloadPiano(ctx);
  const p = padParams(p0), r = padPreset(p.preset), f = 440 * 2 ** ((midi - 69) / 12);
  const nodes: AudioNode[] = [], srcs: AudioScheduledSourceNode[] = [];
  const amp = ctx.createGain(); amp.gain.value = 0; link(amp, dest);
  const mix = ctx.createGain(); mix.gain.value = 1;
  // Ensemble: dry plus two modulated short delays panned apart (string-machine / Dimension style).
  const out = ctx.createGain();
  // AGE: SP-1200 character — pre-gain into a 12-bit staircase (quieter = grainier), then the steep SSM2044-ish output lowpass.
  if (!r.keys && p.age > 0) { let cv = crush.get(ctx); if (!cv) crush.set(ctx, cv = bitCurve(12));
    const pre = ctx.createGain(), sh = ctx.createWaveShaper(), post = ctx.createGain(), lp1 = ctx.createBiquadFilter(), lp2 = ctx.createBiquadFilter();
    const drop = 1 - p.age * .9; pre.gain.value = drop; sh.curve = cv as Float32Array<ArrayBuffer>; post.gain.value = 1 / drop;
    lp1.type = lp2.type = "lowpass"; lp1.frequency.value = lp2.frequency.value = 16000 - p.age * 7000; lp1.Q.value = .9; lp2.Q.value = .6;
    const dryA = ctx.createGain(), wetA = ctx.createGain(); dryA.gain.value = 1 - Math.min(1, p.age * 2); wetA.gain.value = Math.min(1, p.age * 2);
    out.connect(dryA).connect(amp); out.connect(pre).connect(sh).connect(post).connect(lp1).connect(lp2).connect(wetA).connect(amp); nodes.push(pre, sh, post, lp1, lp2, dryA, wetA);
  } else out.connect(amp);
  if (r.keys) return playKeys(ctx, out, amp, srcs, nodes, r, p, f, midi, t, gate, vel, pan);
  // Dry voice: no internal chorus/ensemble; space comes from the slot FX rack.
  mix.connect(out); nodes.push(mix, out, amp);
  // Filter with a slow swell (or a falling stab when swell < 0) over the attack.
  const flt = ctx.createBiquadFilter(); flt.type = "lowpass"; flt.Q.value = r.res; const cut = padCutoff(r, p);
  const c0 = cl(cut * 2 ** (-r.swell * 1.5), 60, 18000);
  flt.frequency.setValueAtTime(c0, t); flt.frequency.setTargetAtTime(cut, t, Math.max(.02, p.atk * .6)); nodes.push(flt);
  // AGE only: sampler pitch drift plus a little flutter (silent at AGE 0). No MOTION LFO.
  const drift = at(ctx.createOscillator(), t), driftG = ctx.createGain(); drift.frequency.value = .07 + (midi % 7) * .013; driftG.gain.value = p.age * 16; drift.connect(driftG); srcs.push(drift); nodes.push(drift, driftG);
  const flut = at(ctx.createOscillator(), t), flutG = ctx.createGain(); flut.frequency.value = 4.3; flutG.gain.value = p.age * 6; flut.connect(flutG); srcs.push(flut); nodes.push(flut, flutG);
  // Formant bank (choir presets): three parallel resonances morphed between two vowels by BRIGHT.
  let into: AudioNode = flt; const bands: BiquadFilterNode[] = [];
  if (r.vowel) { const fs = vowelAt(r.vowel, p.bright), sum = ctx.createGain(); sum.gain.value = 1; const pre = ctx.createGain(); pre.gain.value = .35;
    pre.connect(sum); fs.forEach((fq, k) => { const b = ctx.createBiquadFilter(); b.type = "bandpass"; b.frequency.value = fq; b.Q.value = fq / (k === 0 ? 90 : k === 1 ? 110 : 160); bands.push(b); const g = ctx.createGain(); g.gain.value = [2.2, 1.6, 1][k]; pre.connect(b).connect(g).connect(sum); nodes.push(b, g); });
    sum.connect(flt); into = pre; nodes.push(sum, pre); }
  flt.connect(mix);
  // Oscillator stack: each layer is a detuned pair spread in stereo.
  const fm = r.fm ? at(ctx.createOscillator(), t) : null, fmG = fm ? ctx.createGain() : null;
  if (fm && fmG && r.fm) { fm.frequency.value = f * r.fm.ratio; const depth = f * r.fm.amt * (.5 + p.bright); fmG.gain.setValueAtTime(depth, t); fmG.gain.setTargetAtTime(depth * .15, t, r.fm.decay / 3); fm.connect(fmG); srcs.push(fm); nodes.push(fm, fmG); }
  const total = r.layers.reduce((a, l) => a + l.gain, 0) || 1, cents = r.detune * .6;
  const freqs: AudioParam[] = [];
  r.layers.forEach((l, li) => [-1, 1].forEach(sg => {
    const o = at(ctx.createOscillator(), t), g = ctx.createGain(), pn = ctx.createStereoPanner();
    o.setPeriodicWave(waveOf(ctx, l.table)); o.frequency.value = f * 2 ** l.oct; o.detune.value = sg * cents; g.gain.value = l.gain / total * .5;
    pn.pan.value = cl(pan + sg * .2, -1, 1);
    driftG.connect(o.detune); flutG.connect(o.detune); if (li === 0 && fmG) fmG.connect(o.frequency);
    o.connect(g).connect(pn).connect(into); srcs.push(o); nodes.push(o, g, pn); freqs.push(o.frequency);
  }));
  if (r.air > 0) { const n = at(ctx.createBufferSource(), t), bp = ctx.createBiquadFilter(), g = ctx.createGain(); n.buffer = noiseBuffer(ctx); n.loop = true; bp.type = "bandpass"; bp.frequency.value = 5000 + p.bright * 4000; bp.Q.value = .8; g.gain.value = r.air * .12; n.connect(bp).connect(g).connect(mix); srcs.push(n); nodes.push(n, bp, g); }
  const env = { a: p.atk, d: r.d, s: r.s, r: p.rel };
  // srcs[0] must be an oscillator that runs to the end; the drift oscillator is first.
  const v = finish(srcs, nodes, adsr(amp.gain, t, env, gate, vel * .3 * ENGINE_TRIM.pad, 5), amp, undefined, 5);
  v.update = q => { const np = (q as { pad?: Partial<PadParams> }).pad; if (!np) return; const n = ctx.currentTime;
    if (np.bright === undefined) return; const q2 = padParams({ ...p, ...np });
    flt.detune.setTargetAtTime(1200 * Math.log2(padCutoff(r, q2) / cut), n, .05);
    if (r.vowel) vowelAt(r.vowel, q2.bright).forEach((fq, k) => bands[k]?.frequency.setTargetAtTime(fq, n, .05)); };
  void freqs; return v;
}

/** Recorded grand / FM electric piano, with live tone and neutral-at-zero tape ageing. */
function playKeys(ctx: BaseAudioContext, out: AudioNode, amp: GainNode, srcs: AudioScheduledSourceNode[], nodes: AudioNode[], r: PadRecipe, p: PadParams, f: number, midi: number, t: number, gate: number, vel: number, pan: number): Voice {
  const v01 = cl(vel, .05, 1), pn = ctx.createStereoPanner(); pn.pan.value = cl(pan + (midi - 60) / 60 * .3, -1, 1); pn.connect(out); nodes.push(out, amp, pn);
  // Higher notes decay faster, like real strings / tines.
  const ring = r.d * 2 ** (-(midi - 60) / 24), flt = ctx.createBiquadFilter(); flt.type = "lowpass"; flt.Q.value = .5; flt.connect(pn); nodes.push(flt);
  let current = p;
  // Build the age path once even at zero: knob/XY edits never rebuild a ringing voice.
  out.disconnect();
  let cv = crush.get(ctx); if (!cv) crush.set(ctx, cv = bitCurve(12));
  const pre = ctx.createGain(), sh = ctx.createWaveShaper(), post = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain();
  sh.curve = cv as Float32Array<ArrayBuffer>;
  out.connect(dry).connect(amp); out.connect(pre).connect(sh).connect(post).connect(wet).connect(amp);
  nodes.push(pre, sh, post, dry, wet);
  const drift = at(ctx.createOscillator(), t), flutter = at(ctx.createOscillator(), t), driftG = ctx.createGain(), flutterG = ctx.createGain();
  drift.frequency.value = .17; flutter.frequency.value = 4.3;
  drift.connect(driftG); flutter.connect(flutterG); srcs.push(drift, flutter); nodes.push(drift, flutter, driftG, flutterG);
  const age = (p: PadParams, time: number, smooth = false) => {
    const set = (param: AudioParam, value: number) => smooth ? param.setTargetAtTime(value, time, .04) : param.setValueAtTime(value, time);
    const drop = 1 - p.age * .95;
    set(pre.gain, drop); set(post.gain, 1 / drop); set(dry.gain, 1 - p.age); set(wet.gain, p.age);
    set(driftG.gain, p.age * 24); set(flutterG.gain, p.age * 9);
    set(flt.frequency, keysCutoff(p, v01));
  };
  age(p, t);
  const pitchAge = (param: AudioParam) => { driftG.connect(param); flutterG.connect(param); };
  const attachLive = (v: Voice) => {
    v.update = q => { const patch = (q as { pad?: Partial<PadParams> }).pad; if (!patch) return;
      current = padParams({ ...current, ...patch }); age(current, Math.max(t, ctx.currentTime), true);
    };
    return v;
  };
  if (r.keys === "grand") {
    // Real recorded grand (Salamander): nearest sample re-pitched; velocity sets level + brightness; BRT opens the tone filter.
    const bufs = pianoBuffers(ctx); if (!bufs) { void preloadPiano(ctx); }
    const keep = at(ctx.createConstantSource(), t), kg = ctx.createGain(); kg.gain.value = 0; keep.connect(kg).connect(pn); srcs.push(keep); nodes.push(keep, kg);
    if (bufs?.size) { const { root, rate } = pianoPick(midi, [...bufs.keys()]), buffer = bufs.get(root);
      if (buffer) { const b = at(ctx.createBufferSource(), t), g = ctx.createGain();
        b.buffer = buffer; b.playbackRate.value = rate; const cg = ctx.createGain(); cg.gain.value = rate * Math.LN2 / 1200; driftG.connect(cg); flutterG.connect(cg); cg.connect(b.playbackRate); nodes.push(cg); g.gain.value = 1.6; b.connect(g).connect(flt); srcs.push(b); nodes.push(b, g); } }
    const dec = p.dec ?? 1, env = dec >= .999 ? { a: p.atk, d: 30, s: 1, r: p.rel } : { a: p.atk, d: .1 + dec * 5, s: 0, r: p.rel };
    const v = finish(srcs, nodes, Math.min(t + 20, adsr(amp.gain, t, env, gate, v01 * .3 * ENGINE_TRIM.pad, 5)), amp, undefined, 5);
    return attachLive(v);
  } else {
    const st = ctx.createGain(); st.gain.setValueAtTime(1, t); st.gain.setTargetAtTime(0, t + .01, ring * .35); st.connect(flt); nodes.push(st);
    const pair = (ratio: number, index: number, idxDecay: number, level: number, det: number) => {
      const c = at(ctx.createOscillator(), t), m = at(ctx.createOscillator(), t), mg = ctx.createGain(), cg = ctx.createGain();
      c.frequency.value = f; c.detune.value = det; m.frequency.value = f * ratio; m.detune.value = det;
      pitchAge(c.detune); pitchAge(m.detune);
      const d = f * index; mg.gain.setValueAtTime(d, t); mg.gain.setTargetAtTime(d * .08, t, idxDecay); m.connect(mg).connect(c.frequency);
      cg.gain.value = level; c.connect(cg).connect(st); srcs.push(c, m); nodes.push(c, m, mg, cg); return cg; };
    pair(1, .4 + v01 * 1.4, ring * .2, .45, -r.detune); pair(1, .4 + v01 * 1.4, ring * .2, .45, r.detune);
    const tine = pair(14, .6 + v01 * 2.5 * (.5 + p.bright), .03, 0, 0); tine.gain.setValueAtTime(.25 * v01 * (.4 + p.bright), t); tine.gain.setTargetAtTime(0, t, .25);
  }
  const env = { a: p.atk, d: ring * 3 * (p.dec ?? 1), s: 0, r: p.rel };
  const v = finish(srcs, nodes, adsr(amp.gain, t, env, gate, v01 * .3 * ENGINE_TRIM.pad, 5), amp, undefined, 5);
  return attachLive(v);
}
