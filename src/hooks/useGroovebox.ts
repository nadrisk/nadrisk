import { useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { createFx, loadWorklets, makeFx, type FxNode, type FxUnit } from "@/audio/effects";
import { defaultSample, peaksOf, playDrum, playSampler, playSynth, type DrumParams, type SamplerParams, type SynthParams, type Voice } from "@/audio/voices";

export type EngineKind = "drum" | "synth" | "sampler";
export const STEPS = 16;
export type Slot = { name: string; engine: EngineKind; note: number; level: number; pan: number; mute: boolean; drum: DrumParams; synth: SynthParams; sampler: SamplerParams; fx: FxUnit[] };
type Engine = { ctx: BaseAudioContext; master: GainNode; analyser: Tone.Analyser; outs: { gain: GainNode; pan: StereoPannerNode; chain: FxNode[]; sig: string }[]; loop: number; mono: (Voice | null)[] };

const drum = (o: Partial<DrumParams>): DrumParams => ({ kind: "kick", pitch: 50, pitchEnv: 36, pitchDecay: 0.06, env: { a: 0.001, d: 0.35, s: 0, r: 0.1 }, noise: 0.02, fm: 0, fmRatio: 1.5, ring: 0, ringFreq: 800, filter: "lowpass", cutoff: 6000, res: 1, filterEnv: 0, filterDecay: 0.1, ...o });
const synth = (o: Partial<SynthParams>): SynthParams => ({
  osc1: { wave: "sawtooth", gain: 0.8, coarse: 0, fine: 0 }, osc2: { wave: "sine", gain: 0, coarse: 12, fine: 7, mode: "mix", fmAmount: 1 },
  partials: [1, 0.5, 0.3, 0.2, 0.1, 0.05, 0, 0, 0.6, 0.3, 0.15, 0.08, 0, 0, 0, 0], noise: 0,
  env: { a: 0.005, d: 0.25, s: 0.3, r: 0.15 }, filter: "lowpass", cutoff: 900, res: 4, filterEnv: 2, filterDecay: 0.2, wet: 1,
  pitchEnv: 0, pitchDecay: 0.05, lfo: { wave: "sine", rate: 4, depth: 0, target: "cutoff" }, ...o });
const sampler = (o: Partial<SamplerParams> = {}): SamplerParams => ({ start: 0, loop: false, pitch: 0, env: { a: 0.002, d: 0.3, s: 1, r: 0.1 }, sampleName: "built-in tone", ...o });

const base = (name: string, engine: EngineKind, note = 48, extra: Partial<Slot> = {}): Slot => ({ name, engine, note, level: 75, pan: 0, mute: false, drum: drum({}), synth: synth({}), sampler: sampler(), fx: [], ...extra });
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
const emptyPattern = () => Array.from({ length: 16 }, () => Array<boolean>(STEPS).fill(false));
const defaultPattern = () => {
  const p = emptyPattern();
  [0, 4, 8, 12].forEach(s => (p[0][s] = true)); [4, 12].forEach(s => (p[1][s] = true));
  [0, 2, 4, 6, 8, 10, 12, 14].forEach(s => (p[2][s] = true)); [3, 7, 11].forEach(s => (p[8][s] = true));
  p[6][14] = true; p[12][0] = true;
  return p;
};

/** Audio connections follow the slot's fx order: gain -> enabled units in order -> pan. */
function syncChain(e: Engine, i: number, s: Slot) {
  const out = e.outs[i], live = s.fx.filter(f => f.on), sig = live.map(f => f.id).join(",");
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
  const [pattern, setPattern] = useState<boolean[][]>(defaultPattern);
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [bpm, setBpm] = useState(124);
  const [volume, setVolume] = useState(60);
  const [hits, setHits] = useState<number[]>(() => Array(16).fill(0));
  const [peaks, setPeaks] = useState<(number[] | null)[]>(() => Array(16).fill(null));
  const [error, setError] = useState("");
  const slotsRef = useRef(slots); slotsRef.current = slots;
  const patternRef = useRef(pattern); patternRef.current = pattern;
  const bpmRef = useRef(bpm); bpmRef.current = bpm;

  const ctxOf = () => Tone.getContext().rawContext as unknown as BaseAudioContext;
  const fallbackBuf = () => (fallback.current ??= defaultSample(ctxOf()));
  useEffect(() => { const p = peaksOf(fallbackBuf()); setPeaks(Array(16).fill(p)); }, []);

  const flash = (i: number) => setHits(h => { const n = [...h]; n[i] = Date.now(); return n; });

  const trigger = useCallback((i: number, time?: number, vel = 1) => {
    const e = engine.current, s = slotsRef.current[i];
    if (!e || !s || s.mute) return;
    const t = time ?? e.ctx.currentTime + 0.005, dest = e.outs[i].gain, gate = 60 / bpmRef.current / 4;
    if (s.engine === "drum") playDrum(e.ctx, dest, s.drum, t, vel);
    else if (s.engine === "sampler") playSampler(e.ctx, dest, s.sampler, buffers.current[i] ?? fallbackBuf(), t, gate, vel);
    else { e.mono[i]?.stop(t); e.mono[i] = playSynth(e.ctx, dest, s.synth, s.note, t, gate, vel); }
  }, []);

  const ensure = useCallback(async () => {
    await Tone.start(); await loadWorklets();
    if (engine.current) return engine.current;
    const ctx = ctxOf();
    const master = ctx.createGain(); master.gain.value = volume / 100 * 0.8; master.connect(ctx.destination);
    const analyser = new Tone.Analyser("waveform", 1024); Tone.connect(master, analyser);
    const outs = slotsRef.current.map(s => { const gain = ctx.createGain(), pan = ctx.createStereoPanner(); gain.gain.value = s.level / 100; pan.pan.value = s.pan; pan.connect(master); return { gain, pan, chain: [] as FxNode[], sig: "?" }; });
    let cur = 0;
    const loop = Tone.getTransport().scheduleRepeat(time => {
      const st = cur; cur = (cur + 1) % STEPS;
      patternRef.current.forEach((row, i) => { if (row[st]) { trigger(i, time); Tone.getDraw().schedule(() => flash(i), time); } });
      Tone.getDraw().schedule(() => setStep(st), time);
    }, "16n");
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
  useEffect(() => () => {
    const e = engine.current, t = Tone.getTransport();
    t.stop(); if (e) { t.clear(e.loop); e.outs.forEach(o => { o.chain.forEach(f => f.dispose()); o.gain.disconnect(); o.pan.disconnect(); }); e.master.disconnect(); e.analyser.dispose(); }
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
    setSelected(i);
    try { await ensure(); trigger(i); flash(i); } catch { setError("Audio unavailable."); }
  }, [ensure, trigger]);

  const updateSlot = (i: number, patch: Partial<Slot>) => setSlots(s => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const loadSample = async (i: number, file: File) => {
    try {
      const buf = await ctxOf().decodeAudioData(await file.arrayBuffer());
      buffers.current[i] = buf;
      setPeaks(p => p.map((x, j) => (j === i ? peaksOf(buf) : x)));
      setSlots(s => s.map((x, j) => (j === i ? { ...x, engine: "sampler", sampler: { ...x.sampler, sampleName: file.name } } : x)));
      setError("");
    } catch { setError("Could not read that audio file. Try WAV or MP3."); }
  };
  const toggleStep = (row: number, col: number) => setPattern(p => p.map((r, i) => (i === row ? r.map((v, j) => (j === col ? !v : v)) : r)));
  const clearPattern = () => setPattern(emptyPattern());
  const randomizePattern = () => setPattern(emptyPattern().map((r, i) => r.map(() => Math.random() < (i < 3 ? 0.3 : 0.1))));
  const resetAll = () => { setSlots(defaultSlots()); setPattern(defaultPattern()); setBpm(124); setVolume(60); buffers.current = Array(16).fill(null); setPeaks(Array(16).fill(peaksOf(fallbackBuf()))); };

  return { engine, slots, pattern, selected, playing, step, bpm, volume, hits, peaks, error, setSelected, setBpm, setVolume, togglePlay, hit, updateSlot, loadSample, toggleStep, clearPattern, randomizePattern, resetAll };
}
