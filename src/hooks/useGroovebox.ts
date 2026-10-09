import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { createFx, fxEco, loadWorklets, setFxEco, makeFx, type FxNode, type FxUnit } from "@/audio/effects";
import { defaultArp, degreeToSemi, midiOf, stepSeconds, type ArpParams } from "@/audio/arp";
import { defaultSample, peaksOf, playDrum, playSampler, playSynth, type DrumParams, type SamplerParams, type SynthParams, type Voice } from "@/audio/voices";

// Ask the browser for its smallest audio buffer so taps reach the speaker as fast as the device allows.
if (typeof window !== "undefined" && !(Tone.getContext() as unknown as { __nad?: boolean }).__nad) {
  const c = new Tone.Context({ latencyHint: "interactive", lookAhead: 0.03 }); (c as unknown as { __nad: boolean }).__nad = true; Tone.setContext(c);
}
export type EngineKind = "drum" | "synth" | "sampler";
export const STEPS = 16;
export type Slot = { name: string; engine: EngineKind; note: number; level: number; pan: number; mute: boolean; drum: DrumParams; synth: SynthParams; sampler: SamplerParams; fx: FxUnit[]; arp: ArpParams };
type Engine = { ctx: BaseAudioContext; master: GainNode; analyser: Tone.Analyser; outs: { gain: GainNode; pan: StereoPannerNode; chain: FxNode[]; sig: string }[]; loop: number; mono: (Voice | null)[] };

const drum = (o: Partial<DrumParams>): DrumParams => ({ kind: "kick", pitch: 50, pitchEnv: 36, pitchDecay: 0.06, env: { a: 0.001, d: 0.35, s: 0, r: 0.1 }, noise: 0.02, fm: 0, fmRatio: 1.5, ring: 0, ringFreq: 800, filter: "lowpass", cutoff: 6000, res: 1, filterEnv: 0, filterDecay: 0.1, ...o });
const synth = (o: Partial<SynthParams>): SynthParams => ({
  osc1: { wave: "sawtooth", gain: 0.8, coarse: 0, fine: 0 }, osc2: { wave: "sine", gain: 0, coarse: 12, fine: 7, mode: "mix", fmAmount: 1 },
  partials: [1, 0.5, 0.3, 0.2, 0.1, 0.05, 0, 0, 0.6, 0.3, 0.15, 0.08, 0, 0, 0, 0], noise: 0,
  env: { a: 0.005, d: 0.25, s: 0.3, r: 0.15 }, filter: "lowpass", cutoff: 900, res: 4, filterEnv: 2, filterDecay: 0.2, wet: 1,
  pitchEnv: 0, pitchDecay: 0.05, lfo: { wave: "sine", rate: 4, depth: 0, target: "cutoff" }, ...o });
const sampler = (o: Partial<SamplerParams> = {}): SamplerParams => ({ start: 0, loop: false, pitch: 0, env: { a: 0.002, d: 0.3, s: 1, r: 0.1 }, sampleName: "built-in tone", ...o });

const base = (name: string, engine: EngineKind, note = 48, extra: Partial<Slot> = {}): Slot => ({ name, engine, note, level: 75, pan: 0, mute: false, drum: drum({}), synth: synth({}), sampler: sampler(), fx: [], arp: defaultArp(), ...extra });
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
function syncChain(e: Engine, i: number, s: Slot) {
  const out = e.outs[i], live = s.fx.filter(f => f.on), sig = (fxEco() ? "e:" : "") + live.map(f => f.id).join(",");
  if (sig !== out.sig) {
    out.gain.disconnect(); out.chain.forEach(f => f.dispose());
    out.chain = live.map(f => createFx(e.ctx, f.type, f.params));
    [out.gain, ...out.chain.map(f => f.input)].forEach((n, k) => n === out.gain ? n.connect(out.chain[0]?.input ?? out.pan) : out.chain[k - 1].output.connect(out.chain[k]?.input ?? out.pan));
    out.sig = sig;
  } else live.forEach((f, k) => out.chain[k].update(f.params));
}

export function useGroovebox() {
  const engine = useRef<Engine | null>(null);
  const buffers = useRef<(AudioBuffer | null)[]>(Array(16).fill(null));
  const fallback = useRef<AudioBuffer | null>(null);
  const [slots, setSlots] = useState<Slot[]>(defaultSlots);
  const [pattern, setPattern] = useState<StepVal[][]>(defaultPattern);
  const [lengths, setLengths] = useState<number[]>(() => Array(16).fill(STEPS));
  const lengthsRef = useRef(lengths); lengthsRef.current = lengths;
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [bpm, setBpm] = useState(124);
  const [volume, setVolume] = useState(60);
  const padRefs = useRef<(HTMLButtonElement | null)[]>(Array(16).fill(null));
  const [peaks, setPeaks] = useState<(number[] | null)[]>(() => Array(16).fill(null));
  const [error, setError] = useState("");
  const [eco, setEco] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const slotsRef = useRef(slots); slotsRef.current = slots;
  const patternRef = useRef(pattern); patternRef.current = pattern;
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
    if (!e || !s || s.mute) return;
    const t = time ?? e.ctx.currentTime, dest = e.outs[i].gain, gate = gateSec ?? 60 / bpmRef.current / 4;
    // Choke: each slot keeps one voice, like hardware drum machines, so fast rolls never pile up nodes.
    e.mono[i]?.stop(t);
    e.mono[i] = s.engine === "drum" ? playDrum(e.ctx, dest, semi ? { ...s.drum, pitch: s.drum.pitch * 2 ** (semi / 12) } : s.drum, t, vel)
      : s.engine === "sampler" ? playSampler(e.ctx, dest, semi ? { ...s.sampler, pitch: s.sampler.pitch + semi } : s.sampler, buffers.current[i] ?? fallbackBuf(), t, gate, vel)
      : playSynth(e.ctx, dest, s.synth, s.arp.on ? midiOf(s.arp, 0) + semi : s.note + semi, t, gate, vel);
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
    const master = ctx.createGain(); master.gain.value = volume / 100 * 0.8; master.connect(ctx.destination);
    const analyser = new Tone.Analyser("waveform", 1024); Tone.connect(master, analyser);
    const outs = slotsRef.current.map(s => { const gain = ctx.createGain(), pan = ctx.createStereoPanner(); gain.gain.value = s.level / 100; pan.pan.value = s.pan; pan.connect(master); return { gain, pan, chain: [] as FxNode[], sig: "?" }; });
    let cur = 0;
    const loop = Tone.getTransport().scheduleRepeat(time => {
      const tick = cur; cur = (cur + 1) % 55440; // divisible by every length 1-16
      const sixteenth = 60 / bpmRef.current / 4;
      patternRef.current.forEach((row, i) => {
        const len = lengthsRef.current[i], st = tick % len;
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
    engine.current = { ctx, master, analyser, outs, loop, mono: Array(16).fill(null) };
    slotsRef.current.forEach((s, i) => syncChain(engine.current!, i, s));
    return engine.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  useEffect(() => {
    const e = engine.current; if (!e) return;
    slots.forEach((s, i) => { e.outs[i].gain.gain.setTargetAtTime(s.level / 100, e.ctx.currentTime, 0.02); e.outs[i].pan.pan.setTargetAtTime(s.pan, e.ctx.currentTime, 0.02); syncChain(e, i, s); });
  }, [slots, playing]);
  useEffect(() => { const e = engine.current; e?.master.gain.setTargetAtTime(volume / 100 * 0.8, e.ctx.currentTime, 0.02); }, [volume]);
  useEffect(() => { Tone.getTransport().bpm.value = bpm; }, [bpm]);
  // Shorter scheduler look-ahead = tighter sequencer response; eco keeps a safer buffer for weak CPUs.
  useEffect(() => {
    setFxEco(eco); Tone.getContext().lookAhead = eco ? 0.1 : 0.03;
    const e = engine.current; if (e) slotsRef.current.forEach((s, i) => syncChain(e, i, s));
  }, [eco]);
  useEffect(() => () => {
    const e = engine.current, t = Tone.getTransport();
    t.stop(); if (e) { t.clear(e.loop); e.outs.forEach(o => { o.chain.forEach(f => f.dispose()); o.gain.disconnect(); o.pan.disconnect(); }); e.master.disconnect(); e.analyser.dispose(); }
    holds.current.clear(); if (timer.current != null) clearInterval(timer.current);
    engine.current = null;
  }, []);

  const togglePlay = useCallback(async () => {
    try {
      await ensure(); const t = Tone.getTransport();
      if (playing) { t.stop(); setStep(-1); setPlaying(false); } else { t.position = 0; t.start("+0.05"); setPlaying(true); }
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
  const loadSample = useCallback(async (i: number, file: File) => {
    try {
      const buf = await ctxOf().decodeAudioData(await file.arrayBuffer());
      buffers.current[i] = buf;
      setPeaks(p => p.map((x, j) => (j === i ? peaksOf(buf) : x)));
      setSlots(s => s.map((x, j) => (j === i ? { ...x, engine: "sampler", sampler: { ...x.sampler, sampleName: file.name } } : x)));
      setError("");
    } catch { setError("Could not read that audio file. Try WAV or MP3."); }
  }, []);
  const loadSelected = useCallback((file: File) => { void loadSample(selectedRef.current, file); }, [loadSample]);
  // Cycle off -> hit -> tie -> off. A tie needs a hit or tie before it, otherwise it goes straight to off.
  const toggleStep = useCallback((row: number, col: number) => setPattern(p => p.map((r, i) => (i === row ? r.map((v, j) => {
    if (j !== col) return v;
    if (v === 0) return 1; if (v === 1) return col > 0 && r[col - 1] !== 0 ? 2 : 0; return 0;
  }) : r))), []);
  const setTrackLength = useCallback((row: number, len: number) => setLengths(l => l.map((v, i) => (i === row ? len : v))), []);
  const clearPattern = () => setPattern(emptyPattern());
  const randomizePattern = () => setPattern(emptyPattern().map((r, i) => r.map(() => (Math.random() < (i < 3 ? 0.3 : 0.1) ? 1 : 0) as StepVal)));
  const resetAll = () => { setSlots(defaultSlots()); setPattern(defaultPattern()); setLengths(Array(16).fill(STEPS)); setBpm(124); setVolume(60); buffers.current = Array(16).fill(null); setPeaks(Array(16).fill(peaksOf(fallbackBuf()))); };

  return { engine, slots, pattern, lengths, setTrackLength, selected, playing, step, bpm, volume, padRefs, peaks, error, release, eco, latency, setEco, setSelected, setBpm, setVolume, togglePlay, hit, updateSlot, updateSelected, loadSample, loadSelected, toggleStep, clearPattern, randomizePattern, resetAll };
}
