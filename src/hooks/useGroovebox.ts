import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { createFx, fxEco, loadWorklets, setFxEco, setFxBpm, makeFx, FX_DEFS, type FxType, type FxNode, type FxUnit } from "@/audio/effects";
import { defaultArp, degreeToSemi, midiOf, stepSeconds, type ArpParams } from "@/audio/arp";
import { cacheFile, getSampleBlob, cacheId } from "@/audio/sampleStore";
import { defaultSample, peaksOf, playDrum, playSampler, playSynth, type DrumParams, type SamplerParams, type SynthParams, defaultPoly, playPoly, type PolyParams, type Voice } from "@/audio/voices";

import { chordNotes, defaultChord, defaultMod, scaledEnv, type ChordParams, type ModLane } from "@/audio/musical";
import { createPerformance, defaultPerformance, type PerformanceParams } from "@/audio/performance";

// Ask the browser for its smallest audio buffer so taps reach the speaker as fast as the device allows.
if (typeof window !== "undefined" && !(Tone.getContext() as unknown as { __nad?: boolean }).__nad) {
  const c = new Tone.Context({ latencyHint: "interactive", lookAhead: 0.03 }); (c as unknown as { __nad: boolean }).__nad = true; Tone.setContext(c);
}
export type EngineKind = "drum" | "synth" | "sampler" | "poly";
export const STEPS = 16;
export type Slot = { name: string; engine: EngineKind; note: number; level: number; pan: number; mute: boolean; solo: boolean; drum: DrumParams; synth: SynthParams; sampler: SamplerParams; fx: FxUnit[]; arp: ArpParams; choke: number; chord: ChordParams; poly: PolyParams; mods: ModLane[] };
type Engine = { ctx: BaseAudioContext; master: GainNode; analyser: Tone.Analyser; performance: ReturnType<typeof createPerformance>; outs: { gain: GainNode; filter: BiquadFilterNode; tap: GainNode; pan: StereoPannerNode; chain: FxNode[]; sig: string }[]; loop: number; mono: (Voice | null)[] };

const drum = (o: Partial<DrumParams>): DrumParams => ({ kind: "kick", pitch: 50, pitchEnv: 36, pitchDecay: 0.06, env: { a: 0.001, d: 0.35, s: 0, r: 0.1 }, noise: 0.02, fm: 0, fmRatio: 1.5, ring: 0, ringFreq: 800, filter: "lowpass", cutoff: 6000, res: 1, filterEnv: 0, filterDecay: 0.1, ...o });
const synth = (o: Partial<SynthParams>): SynthParams => ({
  osc1: { wave: "sawtooth", gain: 0.8, coarse: 0, fine: 0 }, osc2: { wave: "sine", gain: 0, coarse: 12, fine: 7, mode: "mix", fmAmount: 1 },
  partials: [1, 0.5, 0.3, 0.2, 0.1, 0.05, 0, 0, 0.6, 0.3, 0.15, 0.08, 0, 0, 0, 0], noise: 0,
  env: { a: 0.005, d: 0.25, s: 0.3, r: 0.15 }, filter: "lowpass", cutoff: 900, res: 4, filterEnv: 2, filterDecay: 0.2, wet: 1,
  pitchEnv: 0, pitchDecay: 0.05, lfo: { wave: "sine", rate: 4, depth: 0, target: "cutoff" }, ...o });
const sampler = (o: Partial<SamplerParams> = {}): SamplerParams => ({ start: 0, loop: false, pitch: 0, env: { a: 0.002, d: 0.3, s: 1, r: 0.1 }, sampleName: "built-in tone", ...o });

const base = (name: string, engine: EngineKind, note = 48, extra: Partial<Slot> = {}): Slot => ({ name, engine, note, level: 75, pan: 0, mute: false, solo: false, drum: drum({}), synth: synth({}), sampler: sampler(), fx: [], arp: defaultArp(), choke: 0, chord: defaultChord(), poly: defaultPoly(), mods: [defaultMod(), defaultMod()], ...extra });
const defaultSlots = (): Slot[] => [
  base("KICK", "drum"),
  base("SNARE", "drum", 48, { fx: [makeFx("reverb", { mix: 0.2, size: 1.8 })], drum: drum({ kind: "snare", pitch: 180, pitchEnv: 12, pitchDecay: 0.03, noise: 0.7, env: { a: 0.001, d: 0.2, s: 0, r: 0.08 }, cutoff: 8000 }) }),
  base("HAT CL", "drum", 48, { level: 55, drum: drum({ kind: "hat", pitch: 400, pitchEnv: 0, noise: 0.7, fm: 2, fmRatio: 1.48, ring: 0.5, ringFreq: 1200, filter: "highpass", cutoff: 7000, env: { a: 0.001, d: 0.05, s: 0, r: 0.03 } }) }),
  base("CLAP", "drum", 48, { drum: drum({ kind: "snare", pitch: 900, pitchEnv: 0, noise: 0.95, filter: "bandpass", cutoff: 1500, res: 2, env: { a: 0.002, d: 0.15, s: 0, r: 0.08 } }) }),
  base("TOM LO", "drum", 48, { drum: drum({ pitch: 90, pitchEnv: 12, pitchDecay: 0.1, env: { a: 0.001, d: 0.3, s: 0, r: 0.1 } }) }),
  base("TOM HI", "drum", 48, { drum: drum({ pitch: 150, pitchEnv: 12, pitchDecay: 0.1, env: { a: 0.001, d: 0.25, s: 0, r: 0.1 } }) }),
  base("HAT OP", "drum", 48, { level: 50, drum: drum({ kind: "hat", pitch: 400, pitchEnv: 0, noise: 0.7, fm: 2, fmRatio: 1.48, ring: 0.5, ringFreq: 1200, filter: "highpass", cutoff: 6500, env: { a: 0.001, d: 0.3, s: 0, r: 0.1 } }) }),
  base("RIDE", "drum", 48, { level: 45, drum: drum({ kind: "hat", pitch: 600, pitchEnv: 0, noise: 0.3, fm: 4, fmRatio: 2.3, ring: 0.8, ringFreq: 2200, filter: "highpass", cutoff: 4000, env: { a: 0.001, d: 0.6, s: 0, r: 0.2 } }) }),
  base("BASS A", "synth", 36, { fx: [makeFx("saturation", { drive: 6 })] }),
  base("BASS FM", "synth", 31, { synth: synth({ osc1: { wave: "sine", gain: 0.9, coarse: 0, fine: 0 }, osc2: { wave: "sine", gain: 1, coarse: 12, fine: 0, mode: "fm", fmAmount: 1.5 }, cutoff: 2000, filterEnv: 1 }) }),
  base("LEAD", "synth", 60, { fx: [makeFx("delay"), makeFx("reverb")], synth: synth({ osc1: { wave: "additive", gain: 0.8, coarse: 0, fine: 0 }, osc2: { wave: "triangle", gain: 0.3, coarse: 0, fine: 9, mode: "mix", fmAmount: 1 }, cutoff: 3000, lfo: { wave: "sine", rate: 5, depth: 0.02, target: "pitch" } }) }),
  base("SQUARE", "synth", 67, { synth: synth({ osc1: { wave: "square", gain: 0.6, coarse: 0, fine: -6 }, osc2: { wave: "square", gain: 0.4, coarse: -12, fine: 6, mode: "mix", fmAmount: 1 }, cutoff: 1800, pitchEnv: 12, pitchDecay: 0.04 }) }),
  base("VOX", "sampler"),
  base("CHOP", "sampler", 48, { fx: [makeFx("bitcrush")], sampler: sampler({ pitch: 7, start: 0.2 }) }),
  base("NOISE", "drum", 48, { level: 40, drum: drum({ kind: "snare", pitch: 200, pitchEnv: 0, noise: 1, filter: "bandpass", cutoff: 3000, res: 6, filterEnv: 2, filterDecay: 0.3, env: { a: 0.01, d: 0.4, s: 0, r: 0.2 } }) }),
  base("FM DRONE", "synth", 43, { fx: [makeFx("phaser"), makeFx("chorus")], synth: synth({ osc1: { wave: "triangle", gain: 0.8, coarse: 0, fine: 0 }, osc2: { wave: "sine", gain: 1, coarse: 7, fine: 0, mode: "fm", fmAmount: 3 }, env: { a: 0.3, d: 0.5, s: 0.7, r: 0.8 }, lfo: { wave: "triangle", rate: 0.5, depth: 0.5, target: "cutoff" } }) }),
];
/** Step cell: 0 off, 1 hit (new attack), 2 tie (sustains the previous hit). */
export type StepVal = 0 | 1 | 2;
const emptyPattern = () => Array.from({ length: 16 }, () => Array<StepVal>(STEPS).fill(0));
const defaultPattern = () => {
  const p = emptyPattern();
  [0, 4, 8, 12].forEach(s => (p[0][s] = 1)); [4, 12].forEach(s => (p[1][s] = 1));
  [0, 2, 4, 6, 8, 10, 12, 14].forEach(s => (p[2][s] = 1)); [3, 7, 11].forEach(s => (p[8][s] = 1));
  p[6][14] = 1; p[12][0] = 1;
  return p;
};

/** Audio connections follow the slot's fx order: gain -> enabled units in order -> pan. */
const defaultFxParams = (type: FxType) => Object.fromEntries(Object.entries(FX_DEFS[type].params).map(([k, r]) => [k, r[0]]));
function syncChain(e: Engine, i: number, s: Slot) {
  const out = e.outs[i], live = s.fx.filter(f => f.on), sig = (fxEco() ? "e:" : "") + live.map(f => `${f.id}:${f.type}:${f.params.source ?? 0}`).join(",");
  if (sig !== out.sig) {
    out.filter.disconnect(); out.chain.forEach(f => f.dispose());
    out.chain = live.map(f => createFx(e.ctx, f.type, { ...defaultFxParams(f.type), ...f.params }));
    let node: AudioNode = out.filter;
    out.chain.forEach(f => { node.connect(f.input); node = f.output; }); node.connect(out.pan);
    out.chain.forEach((f, k) => { if (f.keyInput) { const key = f.keyInput, source = e.outs[Math.max(0, Math.min(15, Math.round(live[k].params.source ?? 1) - 1))].tap; source.connect(key); const dispose = f.dispose; f.dispose = () => { try { source.disconnect(key); } catch { /* already detached */ } dispose(); }; } });
    out.sig = sig;
  } else live.forEach((f, k) => out.chain[k].update({ ...Object.fromEntries(Object.entries(defaultFxParams(f.type))), ...f.params }));
}

export function useGroovebox() {
  const engine = useRef<Engine | null>(null);
  const buffers = useRef<(AudioBuffer | null)[]>(Array(16).fill(null));
  const fallback = useRef<AudioBuffer | null>(null);
  const [slots, setSlots] = useState<Slot[]>(defaultSlots);
  // Two independent pattern banks (A/B) for live performance; switching waits for the next bar while playing.
  type Bank = { pattern: StepVal[][]; lengths: number[] };
  const [banks, setBanks] = useState<Bank[]>(() => [{ pattern: defaultPattern(), lengths: Array(16).fill(STEPS) }, { pattern: emptyPattern(), lengths: Array(16).fill(STEPS) }]);
  const [bank, setBank] = useState(0);
  const [queued, setQueued] = useState<number | null>(null);
  const banksRef = useRef(banks); banksRef.current = banks;
  const bankRef = useRef(bank);
  const queuedRef = useRef<number | null>(null);
  const pattern = banks[bank].pattern, lengths = banks[bank].lengths;
  const editBank = useCallback((f: (b: Bank) => Bank) => setBanks(bs => bs.map((b, i) => (i === bankRef.current ? f(b) : b))), []);
  const setPattern = useCallback((v: StepVal[][] | ((p: StepVal[][]) => StepVal[][])) => editBank(b => ({ ...b, pattern: typeof v === "function" ? v(b.pattern) : v })), [editBank]);
  const setLengths = useCallback((v: number[] | ((l: number[]) => number[])) => editBank(b => ({ ...b, lengths: typeof v === "function" ? v(b.lengths) : v })), [editBank]);
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [bpm, setBpm] = useState(124);
  const [volume, setVolume] = useState(60);
  const [performance, setPerformance] = useState<PerformanceParams>(defaultPerformance);
  const performanceRef = useRef(performance); performanceRef.current = performance;
  const padRefs = useRef<(HTMLButtonElement | null)[]>(Array(16).fill(null));
  const [peaks, setPeaks] = useState<(number[] | null)[]>(() => Array(16).fill(null));
  const [error, setError] = useState("");
  const [eco, setEco] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const slotsRef = useRef(slots); slotsRef.current = slots;
  const bpmRef = useRef(bpm); bpmRef.current = bpm;
  const selectedRef = useRef(selected); selectedRef.current = selected;

  const ctxOf = () => Tone.getContext().rawContext as unknown as BaseAudioContext;
  const fallbackBuf = () => (fallback.current ??= defaultSample(ctxOf()));
  useEffect(() => { const p = peaksOf(fallbackBuf()); setPeaks(Array(16).fill(p)); }, []);

  // Phones (iOS especially) only allow audio to start on a tap/click "end" event, not on pointer-down.
  useEffect(() => {
    const unlock = () => {
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) nav.audioSession.type = "playback"; // plays even with the iPhone silent switch on
      void Tone.start();
      if (Tone.getContext().state === "running") ["touchend", "click", "keydown"].forEach(ev => window.removeEventListener(ev, unlock, true));
    };
    ["touchend", "click", "keydown"].forEach(ev => window.addEventListener(ev, unlock, true));
    return () => ["touchend", "click", "keydown"].forEach(ev => window.removeEventListener(ev, unlock, true));
  }, []);

  // Pad lights use a compositor animation: no layout reflow and no timers, even on fast rolls of one pad.
  const flash = (i: number) => { padRefs.current[i]?.animate([{ backgroundColor: "hsl(var(--accent) / .45)" }, { backgroundColor: "hsl(var(--muted))" }], { duration: 140, easing: "ease-out" }); };

  /** Plays one note on a slot. `semi` is relative pitch (from the phrase sequencer), `gateSec` overrides the note length. */
  const trigger = useCallback((i: number, time?: number, vel = 1, semi = 0, gateSec?: number) => {
    const e = engine.current, s = slotsRef.current[i];
    if (!e || !s || s.mute || (!s.solo && slotsRef.current.some(x => x.solo))) return;
    const t = time ?? e.ctx.currentTime, dest = e.outs[i].gain, gate = gateSec ?? 60 / bpmRef.current / 4;
    // Chord voices are grouped under one stop handle; drums remain bounded to one hit per pad.
    e.mono[i]?.stop(t);
    if (s.choke) slotsRef.current.forEach((other, j) => { if (j !== i && other.choke === s.choke) { e.mono[j]?.stop(t); e.mono[j] = null; } });
    const factor = 2 ** (performanceRef.current.time * 2);
    const notes = (s.engine === "poly" || s.engine === "sampler") ? chordNotes(s.chord) : [0];
    const pitch = s.arp.on ? midiOf(s.arp, 0) + semi : s.note + semi;
    const voices = notes.map(offset => s.engine === "drum" ? playDrum(e.ctx, dest, { ...s.drum, env: scaledEnv(s.drum.env, factor), pitchDecay: s.drum.pitchDecay * factor, filterDecay: s.drum.filterDecay * factor, pitch: s.drum.pitch * 2 ** (semi / 12) }, t, vel)
      : s.engine === "sampler" ? playSampler(e.ctx, dest, { ...s.sampler, env: scaledEnv(s.sampler.env, factor), pitch: s.sampler.pitch + semi + offset }, buffers.current[i] ?? fallbackBuf(), t, gate, vel / Math.sqrt(notes.length))
      : s.engine === "poly" ? null
      : playSynth(e.ctx, dest, { ...s.synth, env: scaledEnv(s.synth.env, factor), pitchDecay: s.synth.pitchDecay * factor, filterDecay: s.synth.filterDecay * factor }, pitch, t, gate, vel));
    if (s.engine === "poly") voices.push(playPoly(e.ctx, dest, { ...s.poly, env: scaledEnv(s.poly.env, factor) }, notes.map(n => pitch + n), t, gate, vel));
    e.mono[i] = { stop: at => voices.forEach(v => v?.stop(at)) };
  }, []);

  // Pad phrase sequencer: while a pad is held, a look-ahead scheduler books its steps on the audio clock.
  const holds = useRef(new Map<number, { next: number; idx: number }>());
  const timer = useRef<number | null>(null);
  const pressed = useRef(new Set<number>());
  const pump = useCallback(() => {
    const e = engine.current; if (!e) return;
    const horizon = e.ctx.currentTime + 0.08;
    holds.current.forEach((h, i) => {
      const a = slotsRef.current[i].arp, dur = stepSeconds(a, bpmRef.current);
      while (h.next < horizon) {
        const c = a.cells[h.idx % a.steps];
        if (c.on) { trigger(i, h.next, c.vel, degreeToSemi(a.scale, c.deg), dur * c.gate); Tone.getDraw().schedule(() => flash(i), h.next); }
        h.next += dur; h.idx = (h.idx + 1) % a.steps;
      }
    });
  }, [trigger]);
  const startHold = useCallback((i: number) => {
    const e = engine.current; if (!e || holds.current.has(i) || !pressed.current.has(i)) return;
    holds.current.set(i, { next: e.ctx.currentTime, idx: 0 }); pump();
    timer.current ??= window.setInterval(pump, 20);
  }, [pump]);
  const release = useCallback((i: number) => {
    pressed.current.delete(i);
    if (!holds.current.delete(i)) return;
    const e = engine.current; if (e) e.mono[i]?.stop(e.ctx.currentTime);
    if (!holds.current.size && timer.current != null) { clearInterval(timer.current); timer.current = null; }
  }, []);
  const play = useCallback((i: number) => { if (slotsRef.current[i].arp.on) startHold(i); else { trigger(i); flash(i); } }, [startHold, trigger]);


  const ensure = useCallback(async () => {
    await Tone.start(); await loadWorklets();
    if (engine.current) return engine.current;
    const ctx = ctxOf();
    const master = ctx.createGain(); master.gain.value = volume / 100 * 0.8; const perf = createPerformance(ctx, ctx.destination); master.connect(perf.input); perf.update(performanceRef.current, bpmRef.current);
    const analyser = new Tone.Analyser("waveform", 1024); Tone.connect(perf.output, analyser);
    const outs = slotsRef.current.map(s => { const gain = ctx.createGain(), filter = ctx.createBiquadFilter(), tap = ctx.createGain(), pan = ctx.createStereoPanner(); filter.frequency.value = 20000; filter.Q.value = .707; gain.gain.value = s.level / 100; gain.connect(filter); gain.connect(tap); pan.pan.value = s.pan; pan.connect(master); return { gain, filter, tap, pan, chain: [] as FxNode[], sig: "?" }; });
    let cur = 0;
    const loop = Tone.getTransport().scheduleRepeat(time => {
      const tick = cur; cur = (cur + 1) % 55440; // divisible by every length 1-16
      const sixteenth = 60 / bpmRef.current / 4;
      if (queuedRef.current != null && tick % 16 === 0) { const nb = queuedRef.current; bankRef.current = nb; queuedRef.current = null; Tone.getDraw().schedule(() => { setBank(nb); setQueued(null); }, time); }
      const cb = banksRef.current[bankRef.current];
      cb.pattern.forEach((row, i) => {
        const len = cb.lengths[i], st = tick % len;
        const eng = engine.current, slot = slotsRef.current[i], lane = slot.mods?.[bankRef.current];
        if (eng && lane?.on) {
          const value = lane.values[tick % lane.steps] ?? .5;
          if (lane.target === "cutoff") eng.outs[i].filter.frequency.setTargetAtTime(40 * 400 ** value, time, .005);
          else { const [id, param] = lane.target.split(":"); const enabled = slot.fx.filter(f => f.on); const idx = enabled.findIndex(f => String(f.id) === id); if (idx >= 0) eng.outs[i].chain[idx]?.update({ ...defaultFxParams(enabled[idx].type), ...enabled[idx].params, [param]: value }, time); }
        } else if (eng) eng.outs[i].filter.frequency.setTargetAtTime(20000, time, .005);
        if (row[st] !== 1) return;
        let ties = 0; while (st + ties + 1 < len && row[st + ties + 1] === 2) ties++;
        const dur = (1 + ties) * sixteenth, a = slotsRef.current[i].arp;
        if (!a.on) { trigger(i, time, 1, 0, dur * 0.98); Tone.getDraw().schedule(() => flash(i), time); return; }
        // Phrase pad: play its phrase from the start for exactly as long as the hit (plus ties) lasts.
        const sd = stepSeconds(a, bpmRef.current), end = time + dur - 0.002;
        for (let k = 0, t = time; t < end; k++, t += sd) {
          const c = a.cells[k % a.steps]; if (!c.on) continue;
          trigger(i, t, c.vel, degreeToSemi(a.scale, c.deg), Math.min(sd * c.gate, end - t)); const ft = t; Tone.getDraw().schedule(() => flash(i), ft);
        }
      });
      Tone.getDraw().schedule(() => setStep(tick), time);
    }, "16n");
    { const r = ctx as unknown as { baseLatency?: number; outputLatency?: number }; setLatency(Math.round(((r.baseLatency ?? 0) + (r.outputLatency ?? 0)) * 1000)); }
    engine.current = { ctx, master, performance: perf, analyser, outs, loop, mono: Array(16).fill(null) };
    const ready = engine.current; slotsRef.current.forEach((s, i) => syncChain(ready, i, s));
    return engine.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  useEffect(() => {
    const e = engine.current; if (!e) return;
    slots.forEach((s, i) => { e.outs[i].gain.gain.setTargetAtTime((s.mute || (slots.some(x => x.solo) && !s.solo) ? 0 : s.level / 100), e.ctx.currentTime, 0.02); e.outs[i].pan.pan.setTargetAtTime(s.pan, e.ctx.currentTime, 0.02); syncChain(e, i, s); });
  }, [slots, playing]);
  useEffect(() => { const e = engine.current; e?.master.gain.setTargetAtTime(volume / 100 * 0.8, e.ctx.currentTime, 0.02); }, [volume]);
  useEffect(() => { engine.current?.performance.update(performance, bpm); }, [performance, bpm]);
  useEffect(() => { Tone.getTransport().bpm.value = bpm; setFxBpm(bpm); const e = engine.current; if (e) slotsRef.current.forEach((s, i) => syncChain(e, i, s)); }, [bpm]);
  // Shorter scheduler look-ahead = tighter sequencer response; eco keeps a safer buffer for weak CPUs.
  useEffect(() => {
    setFxEco(eco); Tone.getContext().lookAhead = eco ? 0.1 : 0.03;
    const e = engine.current; if (e) slotsRef.current.forEach((s, i) => syncChain(e, i, s));
  }, [eco]);
  useEffect(() => () => {
    const e = engine.current, t = Tone.getTransport();
    t.stop(); if (e) { t.clear(e.loop); e.outs.forEach(o => { o.chain.forEach(f => f.dispose()); o.gain.disconnect(); o.filter.disconnect(); o.tap.disconnect(); o.pan.disconnect(); }); e.mono.forEach(v => v?.stop(e.ctx.currentTime)); e.performance.dispose(); e.master.disconnect(); e.analyser.dispose(); }
    holds.current.clear(); if (timer.current != null) clearInterval(timer.current);
    engine.current = null;
  }, []);

  const togglePlay = useCallback(async () => {
    try {
      await ensure(); const t = Tone.getTransport();
      if (playing) { t.stop(); engine.current?.mono.forEach(v => v?.stop(ctxOf().currentTime)); setStep(-1); if (queuedRef.current != null) { bankRef.current = queuedRef.current; setBank(queuedRef.current); queuedRef.current = null; setQueued(null); } setPlaying(false); } else { t.position = 0; t.start("+0.05"); setPlaying(true); }
      setError("");
    } catch { setError("Audio unavailable. Try another browser."); }
  }, [ensure, playing]);

  const hit = useCallback(async (i: number) => {
    // Fast path: audio already running, so play synchronously with no await.
    pressed.current.add(i);
    const e = engine.current;
    if (e && Tone.getContext().state === "running") { play(i); startTransition(() => setSelected(i)); return; }
    setSelected(i);
    try { await ensure(); if (Tone.getContext().state !== "running") return; play(i); } catch { setError("Audio unavailable."); }
  }, [ensure, play]);

  // Stable callbacks so memoized panels (pads, editor, fx, sequencer) skip re-renders while playing.
  const updateSlot = useCallback((i: number, patch: Partial<Slot>) => setSlots(s => s.map((x, j) => (j === i ? { ...x, ...patch } : x))), []);
  const updateSelected = useCallback((patch: Partial<Slot>) => setSlots(s => s.map((x, j) => (j === selectedRef.current ? { ...x, ...patch } : x))), []);
  // Decode a blob into pad i. Every user file is cached in IndexedDB so sets can recall it later.
  const setBuffer = useCallback(async (i: number, blob: Blob, name: string, sampleId?: string) => {
    const buf = await ctxOf().decodeAudioData(await blob.arrayBuffer());
    buffers.current[i] = buf;
    setPeaks(p => p.map((x, j) => (j === i ? peaksOf(buf) : x)));
    setSlots(s => s.map((x, j) => (j === i ? { ...x, engine: "sampler", sampler: { ...x.sampler, sampleName: name, sampleId } } : x)));
  }, []);
  const loadSample = useCallback(async (i: number, file: File) => {
    try {
      let id: string | undefined; try { id = await cacheFile(file); } catch { id = undefined; }
      await setBuffer(i, file, file.name, id); setError("");
    } catch { setError("Could not read that audio file. Try WAV or MP3."); }
  }, [setBuffer]);
  const loadById = useCallback(async (i: number, id: string, name: string) => {
    try { const b = await getSampleBlob(id); if (!b) throw 0; await setBuffer(i, b, name, id); setError(""); }
    catch { setError(`Sample "${name}" not found on this device.`); }
  }, [setBuffer]);
  const loadSelectedId = useCallback((id: string, name: string) => { void loadById(selectedRef.current, id, name); }, [loadById]);
  // Folder load: cache everything; files whose name contains a pad name go onto that pad.
  const loadFolder = useCallback(async (files: File[]) => {
    const audio = files.filter(f => f.type.startsWith("audio/") || /\.(wav|mp3|ogg|flac|m4a|aiff?)$/i.test(f.name));
    let matched = 0;
    const names = slotsRef.current.map(x => x.name.toLowerCase().replace(/\s+/g, ""));
    const used = new Set<number>();
    for (const f of audio) {
      try { await cacheFile(f); } catch { /* storage full */ }
      const fn = f.name.toLowerCase().replace(/[\s_-]+/g, "");
      const i = names.findIndex((n, k) => !used.has(k) && n && fn.includes(n));
      if (i >= 0) { used.add(i); try { await setBuffer(i, f, f.name, cacheId(f)); matched++; } catch { /* skip */ } }
    }
    setError(audio.length ? "" : "No audio files in that folder.");
    return { total: audio.length, matched };
  }, [setBuffer]);
  const loadSelected = useCallback((file: File) => { void loadSample(selectedRef.current, file); }, [loadSample]);
  // Cycle off -> hit -> tie -> off. A tie needs a hit or tie before it, otherwise it goes straight to off.
  const toggleStep = useCallback((row: number, col: number) => setPattern(p => p.map((r, i) => (i === row ? r.map((v, j) => {
    if (j !== col) return v;
    if (v === 0) return 1; if (v === 1) return col > 0 && r[col - 1] !== 0 ? 2 : 0; return 0;
  }) : r))), []);
  const setTrackLength = useCallback((row: number, len: number) => setLengths(l => l.map((v, i) => (i === row ? len : v))), []);
  const selectBank = useCallback((b: number) => {
    if (b === bankRef.current) { queuedRef.current = null; setQueued(null); return; }
    if (Tone.getTransport().state === "started") { queuedRef.current = b; setQueued(b); }
    else { bankRef.current = b; setBank(b); }
  }, []);
  const copyBank = useCallback(() => setBanks(bs => { const src = bs[bankRef.current]; return bs.map((b, i) => (i === bankRef.current ? b : { pattern: src.pattern.map(r => [...r]), lengths: [...src.lengths] })); }), []);
  const setLevel = useCallback((i: number, level: number) => updateSlot(i, { level }), [updateSlot]);
  const toggleMute = useCallback((i: number) => setSlots(s => s.map((x, j) => (j === i ? { ...x, mute: !x.mute } : x))), []);
  const toggleSolo = useCallback((i: number) => setSlots(s => s.map((x, j) => (j === i ? { ...x, solo: !x.solo } : x))), []);
  const clearSolo = useCallback(() => setSlots(s => s.map(x => ({ ...x, solo: false }))), []);
  // Sets: a full snapshot of sounds, effects, phrases, both patterns, tempo and volume. Loaded audio files aren't stored.
  const getSet = useCallback((name: string): GrooveSet => ({ v: 1, name, savedAt: Date.now(), bpm: bpmRef.current, volume, bank: bankRef.current, banks: banksRef.current, slots: slotsRef.current, performance: { ...performanceRef.current, mode: 0 } }), [volume]);
  const applySet = useCallback((st: GrooveSet) => {
    engine.current?.mono.forEach(v => v?.stop(ctxOf().currentTime)); holds.current.clear();
    setPerformance({ ...defaultPerformance(), ...st.performance, mode: 0 });
    const d = defaultSlots();
    setSlots(d.map((x, i) => { const o = st.slots?.[i]; return o ? { ...x, ...o, drum: { ...x.drum, ...o.drum }, synth: { ...x.synth, ...o.synth }, sampler: { ...x.sampler, ...o.sampler }, arp: { ...x.arp, ...o.arp }, chord: { ...x.chord, ...o.chord }, poly: { ...x.poly, ...o.poly }, mods: o.mods ?? x.mods, fx: o.fx ?? x.fx } : x; }));
    if (st.banks?.length === 2) setBanks(st.banks);
    bankRef.current = st.bank ?? 0; setBank(bankRef.current); queuedRef.current = null; setQueued(null);
    setBpm(st.bpm ?? 124); setVolume(st.volume ?? 60);
    buffers.current = Array(16).fill(null); setPeaks(Array(16).fill(peaksOf(fallbackBuf())));
    st.slots?.forEach((o, i) => { if (o?.sampler?.sampleId) void loadById(i, o.sampler.sampleId, o.sampler.sampleName); });
  }, [loadById]);
  const clearPattern = () => setPattern(emptyPattern());
  const randomizePattern = () => setPattern(emptyPattern().map((r, i) => r.map(() => (Math.random() < (i < 3 ? 0.3 : 0.1) ? 1 : 0) as StepVal)));
  const resetAll = () => { setPerformance(defaultPerformance()); setSlots(defaultSlots()); setBanks([{ pattern: defaultPattern(), lengths: Array(16).fill(STEPS) }, { pattern: emptyPattern(), lengths: Array(16).fill(STEPS) }]); bankRef.current = 0; setBank(0); queuedRef.current = null; setQueued(null); setBpm(124); setVolume(60); buffers.current = Array(16).fill(null); setPeaks(Array(16).fill(peaksOf(fallbackBuf()))); };

  return { engine, performance, setPerformance, getSet, applySet, bank, queued, selectBank, copyBank, setLevel, toggleMute, toggleSolo, clearSolo, slots, pattern, lengths, setTrackLength, selected, playing, step, bpm, volume, padRefs, peaks, error, release, eco, latency, setEco, setSelected, setBpm, setVolume, togglePlay, hit, updateSlot, updateSelected, loadSample, loadSelected, loadSelectedId, loadFolder, toggleStep, clearPattern, randomizePattern, resetAll };
}

export type GrooveSet = { v: 1; name: string; savedAt: number; bpm: number; volume: number; bank: number; banks: { pattern: StepVal[][]; lengths: number[] }[]; slots: Slot[]; performance?: PerformanceParams };
