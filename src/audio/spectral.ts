import * as Tone from "tone";
import { adsr, at, filterEnvAdsr, finish, link, noiseBuffer, type SynthParams, type Voice } from "./voices";

/** SPEC mode: the synth's 16 bars are spectral bands carved from a rich saw+noise source. */
export type SpecParams = { bands: number[]; gate: number; tight: number; blur: number; shift: number; bite: number };
export const N_BANDS = 16;
export const defaultSpec = (): SpecParams => ({ bands: Array.from({ length: N_BANDS }, (_, i) => Math.max(0, 1 - i / 14) ** .7), gate: 0, tight: .6, blur: .2, shift: 0, bite: .3 });
export const specParams = (s?: Partial<SpecParams>): SpecParams => { const d = defaultSpec(); return { ...d, ...s, bands: Array.from({ length: N_BANDS }, (_, i) => s?.bands?.[i] ?? d.bands[i]) }; };
/** Band centre as a multiple of the note's fundamental: bands span ~7 octaves, moved by SHIFT (±2 oct). */
export const bandRatio = (k: number, shift: number) => 2 ** (k * 7 / (N_BANDS - 1) + shift * 2);
/** 16-step gate patterns per band (bit = on): lows hold, mids/highs chop in interlocking colour-bass rhythms. */
const GATE = [0xffff, 0xffff, 0xeeee, 0xdddd, 0xaaaa, 0x5555, 0xcccc, 0x3333, 0x9999, 0x6666, 0xa5a5, 0x5a5a, 0x8888, 0x4444, 0x2222, 0x1111];
export const gateOn = (k: number, step: number) => ((GATE[k] >> (15 - (step & 15))) & 1) === 1;

export function playSpec(ctx: BaseAudioContext, dest: AudioNode, p: SynthParams, midi: number, t: number, gate: number, vel = 1): Voice {
  const sp = specParams(p.spec), nodes: AudioNode[] = [], srcs: AudioScheduledSourceNode[] = [];
  const base = 440 * 2 ** ((midi - 69) / 12), nyq = ctx.sampleRate * .45;
  const amp = ctx.createGain(); amp.gain.value = 0; link(amp, dest);
  const filt = ctx.createBiquadFilter(); filt.type = p.filter; filt.Q.value = p.res; filterEnvAdsr(filt.frequency, t, p.filterEnvShape, gate, p.cutoff, Math.max(0, p.filterEnv));
  const wet = ctx.createGain(), dry = ctx.createGain(), sum = ctx.createGain(); wet.gain.value = p.wet; dry.gain.value = 1 - p.wet;
  sum.connect(filt).connect(wet).connect(amp); sum.connect(dry).connect(amp);
  // Source: two detuned saws (detune widens with BLUR) plus noise for the blurred haze.
  const src = ctx.createGain(); const det = 6 + sp.blur * 22;
  [-det, det].forEach(d => { const o = at(ctx.createOscillator(), t); o.type = "sawtooth"; o.frequency.value = base; o.detune.value = d + p.osc1.fine; o.connect(src); srcs.push(o); nodes.push(o); });
  const nz = at(ctx.createBufferSource(), t); nz.buffer = noiseBuffer(ctx); nz.loop = true; const ng = ctx.createGain(); ng.gain.value = .15 + sp.blur * 1.6; nz.connect(ng).connect(src); srcs.push(nz); nodes.push(nz, ng);
  // TIGHT: short per-band plucks (highs faster) vs slow watery swells; BLUR widens bands and slows attacks.
  const q = 26 - sp.blur * 22, tight = sp.tight, bpm = Tone.getTransport().bpm.value, six = 60 / bpm / 4;
  const steps = sp.gate > 0 ? Math.min(64, Math.ceil(gate / six) + 1) : 0, step0 = Math.round(t / six);
  for (let k = 0; k < N_BANDS; k++) { const lv = sp.bands[k]; if (lv < .01) continue;
    const f = base * bandRatio(k, sp.shift); if (f > nyq || f < 20) continue;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q;
    const g = ctx.createGain(), peak = lv * Math.sqrt(q) * .35, A = .002 + (1 - tight) * (.04 + sp.blur * .5) + k * .004 * (1 - tight);
    const D = tight > 0 ? (.05 + (1 - tight) * 2.5) / (1 + k * .08 * tight) : 4, S = peak * (1 - tight * .85);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + A); g.gain.setTargetAtTime(S, t + A, D / 3);
    src.connect(bp).connect(g); nodes.push(bp, g);
    if (steps) { // GATE: band chopped on the 16th grid, blended in by GATE amount.
      const ch = ctx.createGain(); g.connect(ch).connect(sum); nodes.push(ch);
      for (let s = 0; s < steps; s++) { const tt = t + s * six, on = gateOn(k, step0 + s) ? 1 : 1 - sp.gate; ch.gain.setTargetAtTime(on, tt, .003); }
    } else g.connect(sum);
  }
  // BITE: a short bright noise click on each hit.
  if (sp.bite > .01) { const b = at(ctx.createBufferSource(), t); b.buffer = noiseBuffer(ctx); const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2500; const bg = ctx.createGain();
    bg.gain.setValueAtTime(sp.bite * .9, t); bg.gain.setTargetAtTime(0, t, .006); b.connect(hp).connect(bg).connect(sum); srcs.push(b); nodes.push(b, hp, bg); }
  nodes.push(src, sum, filt, wet, dry, amp);
  const end = adsr(amp.gain, t, p.env, gate, vel * .5);
  return finish(srcs, nodes, end, amp);
}
