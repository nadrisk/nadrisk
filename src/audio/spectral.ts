import { adsr, at, filterEnvAdsr, finish, lfoDests, link, noiseBuffer, type SynthParams, type Voice } from "./voices";

/** SPEC mode: the synth's 16 bars are spectral bands carved from a rich saw+noise source. */
export type SpecParams = { bands: number[]; gate: number; tight: number; blur: number; shift: number; bite: number };
export const N_BANDS = 16;
export const defaultSpec = (): SpecParams => ({ bands: Array.from({ length: N_BANDS }, (_, i) => Math.max(0, 1 - i / 14) ** .7), gate: 0, tight: .6, blur: .2, shift: 0, bite: .3 });
export const specParams = (s?: Partial<SpecParams>): SpecParams => { const d = defaultSpec(); return { ...d, ...s, bands: Array.from({ length: N_BANDS }, (_, i) => s?.bands?.[i] ?? d.bands[i]) }; };
/** Band centre as a multiple of the note's fundamental: bands span ~7 octaves, moved by SHIFT (±2 oct). */
export const bandRatio = (k: number, shift: number) => 2 ** (k * 7 / (N_BANDS - 1) + shift * 2);
/** GATE: pooled FFT spectral gates (nad-specsynth, peak-relative threshold) so notes never build processors that run forever. */
const gatePools = new WeakMap<BaseAudioContext, { n: AudioWorkletNode; busy: number }[]>();
function takeGate(ctx: BaseAudioContext, until: number): AudioWorkletNode | null {
  const pool = gatePools.get(ctx) ?? []; gatePools.set(ctx, pool);
  let e = pool.find(x => x.busy <= ctx.currentTime);
  if (!e) { if (pool.length >= 12) return null;
    try { e = { n: new AudioWorkletNode(ctx, "nad-specsynth", { outputChannelCount: [2] }), busy: 0 }; } catch { return null; } pool.push(e); }
  e.n.disconnect(); e.busy = until + .3; return e.n;
}

export function playSpec(ctx: BaseAudioContext, dest: AudioNode, p: SynthParams, midi: number, t: number, gate: number, vel = 1, freeLfo?: AudioNode): Voice {
  const sp = specParams(p.spec), nodes: AudioNode[] = [], srcs: AudioScheduledSourceNode[] = [];
  const base = 440 * 2 ** ((midi - 69) / 12), nyq = ctx.sampleRate * .45;
  const amp = ctx.createGain(); amp.gain.value = 0; link(amp, dest); const trem = ctx.createGain(); trem.connect(amp);
  const filt = ctx.createBiquadFilter(); filt.type = p.filter; filt.Q.value = p.res; filterEnvAdsr(filt.frequency, t, p.filterEnvShape, gate, p.cutoff, Math.max(0, p.filterEnv));
  const wet = ctx.createGain(), dry = ctx.createGain(), sum = ctx.createGain(); wet.gain.value = p.wet; dry.gain.value = 1 - p.wet;
  const post = ctx.createGain(); post.connect(filt).connect(wet).connect(trem); post.connect(dry).connect(trem);
  // Source: two detuned saws (detune widens with BLUR) plus noise for the blurred haze.
  const src = ctx.createGain(), oscs: OscillatorNode[] = [], bps: BiquadFilterNode[] = []; const det = 6 + sp.blur * 22;
  [-det, det].forEach(d => { const o = at(ctx.createOscillator(), t); o.type = "sawtooth"; o.frequency.value = base; o.detune.value = d + p.osc1.fine; o.connect(src); oscs.push(o); srcs.push(o); nodes.push(o); });
  const nz = at(ctx.createBufferSource(), t); nz.buffer = noiseBuffer(ctx); nz.loop = true; const ng = ctx.createGain(); ng.gain.value = .15 + sp.blur * 1.6; nz.connect(ng).connect(src); srcs.push(nz); nodes.push(nz, ng);
  // TIGHT: short per-band plucks (highs faster) vs slow watery swells; BLUR widens bands and slows attacks.
  // TIGHT = band width: high = thin focused strips, low = wide bands that catch more of the source. BLUR widens a little more.
  const qOf = (s: SpecParams) => 2 * 20 ** s.tight * (1 - s.blur * .5), q = qOf(sp);
  for (let k = 0; k < N_BANDS; k++) { const lv = sp.bands[k]; if (lv < .01) continue;
    const f = base * bandRatio(k, sp.shift); if (f > nyq || f < 20) continue;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q; bps.push(bp);
    const g = ctx.createGain(); g.gain.value = lv * Math.sqrt(q) * .2;
    src.connect(bp).connect(g); nodes.push(bp, g);
    g.connect(sum);
  }
  // BITE: a short bright noise click on each hit.
  if (sp.bite > .01) { const b = at(ctx.createBufferSource(), t); b.buffer = noiseBuffer(ctx); const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2500; const bg = ctx.createGain();
    bg.gain.setValueAtTime(sp.bite * .9, t); bg.gain.setTargetAtTime(0, t, .006); b.connect(hp).connect(bg).connect(sum); srcs.push(b); nodes.push(b, hp, bg); }
  const end = adsr(amp.gain, t, p.env, gate, vel * .5);
  // GATE: true FFT spectral gate — each bin opens/closes against a threshold relative to the loudest partial, so lowered
  // bars thin out, chatter and fragment first; full bars stay solid.
  const sg = sp.gate > .01 ? takeGate(ctx, end) : null, mk = ctx.createGain(); mk.gain.value = 1 + sp.gate * 1.5; nodes.push(mk);
  const setGate = (gv: number, at0: number) => { if (!sg) return; sg.parameters.get("gate")?.setTargetAtTime(gv, at0, .02); sg.parameters.get("release")?.setTargetAtTime(.25 - gv * .2, at0, .02); mk.gain.setTargetAtTime(1 + gv * 1.5, at0, .02); };
  if (sg) { setGate(sp.gate, ctx.currentTime); sum.connect(sg).connect(mk).connect(post); } else sum.connect(post);
  // LFO: the pad's free-running LFO (TRIG = per-note) moves pitch, cutoff, level, and OSC1/OSC2 targets map to band SHIFT/BLUR depth.
  const ld = lfoDests(p.lfo); let unhook: (() => void) | undefined;
  if (ld.pitch || ld.cutoff || ld.amp || ld.osc1 || ld.osc2) { const fade = ctx.createGain();
    if (freeLfo && !p.lfo.retrig) { freeLfo.connect(fade); unhook = () => { try { freeLfo.disconnect(fade); } catch { /* gone */ } }; }
    else { const l = at(ctx.createOscillator(), t); l.type = p.lfo.wave; l.frequency.value = p.lfo.rate; l.connect(fade); srcs.push(l); nodes.push(l); }
    const atk = Math.max(0, p.lfo.attack ?? 0); if (atk > .001) { fade.gain.setValueAtTime(0, t); fade.gain.linearRampToValueAtTime(1, t + atk); } else fade.gain.value = 1;
    const send = (amt: number, ...to: AudioParam[]) => { const g = ctx.createGain(); g.gain.value = amt; fade.connect(g); to.forEach(a => g.connect(a)); nodes.push(g); };
    if (ld.pitch) send(ld.pitch * 1200, ...oscs.map(o => o.detune), ...bps.map(b => b.detune));
    if (ld.cutoff) send(ld.cutoff * 2400, filt.detune);
    if (ld.amp) { trem.gain.value = 1 - ld.amp / 2; send(ld.amp / 2, trem.gain); }
    if (ld.osc1) send(ld.osc1 * 1200, ...bps.map(b => b.detune));
    if (ld.osc2) send(ld.osc2 * .5, ng.gain);
    nodes.push(fade); }
  nodes.push(src, sum, post, filt, wet, dry, trem, amp);
  const v = finish(srcs, nodes, end, amp, () => unhook?.());
  // Held-note tweaks: SHIFT glides the band focus, TIGHT/BLUR the width, GATE the threshold.
  let cur = sp;
  v.update = qq => { if (!qq.spec) return; const n = ctx.currentTime, nx = specParams({ ...cur, ...qq.spec }); cur = nx; let bi = 0;
    for (let k = 0; k < N_BANDS; k++) { if (sp.bands[k] < .01) continue; const b = bps[bi++]; if (!b) break; const f = base * bandRatio(k, nx.shift);
      if (f < nyq && f > 20) b.frequency.setTargetAtTime(f, n, .03); b.Q.setTargetAtTime(qOf(nx), n, .03); }
    setGate(nx.gate, n); };
  return v;
}
