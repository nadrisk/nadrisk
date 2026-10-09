import { useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";

export type VoiceKind = "kick" | "snare" | "hat" | "clap" | "tom" | "bass" | "lead" | "fm";
export const VOICE_KINDS: VoiceKind[] = ["kick", "snare", "hat", "clap", "tom", "bass", "lead", "fm"];
export const NOTES = ["C1", "E1", "G1", "C2", "D2", "E2", "G2", "A2", "C3", "D3", "E3", "G3", "A3", "C4", "E4", "G4"];
export const STEPS = 16;

export type Slot = { name: string; kind: VoiceKind; note: string; level: number; decay: number; tone: number; mute: boolean };
type Voice = { synth: Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth | Tone.MonoSynth | Tone.Synth | Tone.FMSynth; filter: Tone.Filter; gain: Tone.Gain };
type Engine = { voices: Voice[]; master: Tone.Gain; analyser: Tone.Analyser; loop: number };

const preset: [VoiceKind, string, string][] = [
  ["kick", "C1", "KICK"], ["snare", "C3", "SNARE"], ["hat", "C4", "HAT CL"], ["clap", "C3", "CLAP"],
  ["tom", "G1", "TOM LO"], ["tom", "D2", "TOM HI"], ["hat", "G4", "HAT OP"], ["fm", "C3", "FM BELL"],
  ["bass", "C2", "BASS A"], ["bass", "G1", "BASS B"], ["lead", "C3", "LEAD"], ["lead", "G3", "LEAD 2"],
  ["fm", "E3", "FM GLASS"], ["snare", "E3", "RIM"], ["clap", "C3", "NOISE"], ["fm", "A2", "FM DRONE"],
];
const defaultSlots = (): Slot[] => preset.map(([kind, note, name]) => ({ name, kind, note, level: 70, decay: kind === "hat" ? 0.08 : kind === "lead" || kind === "fm" ? 0.4 : 0.3, tone: 6000, mute: false }));
const emptyPattern = () => Array.from({ length: 16 }, () => Array<boolean>(STEPS).fill(false));
const defaultPattern = () => {
  const p = emptyPattern();
  [0, 4, 8, 12].forEach(s => (p[0][s] = true));
  [4, 12].forEach(s => (p[1][s] = true));
  [0, 2, 4, 6, 8, 10, 12, 14].forEach(s => (p[2][s] = true));
  [3, 7, 11].forEach(s => (p[8][s] = true));
  p[6][14] = true; p[7][10] = true;
  return p;
};

function makeSynth(kind: VoiceKind): Voice["synth"] {
  switch (kind) {
    case "kick": return new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 6 });
    case "tom": return new Tone.MembraneSynth({ pitchDecay: 0.08, octaves: 3 });
    case "snare": return new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.2, sustain: 0 } });
    case "clap": return new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.005, decay: 0.15, sustain: 0 } });
    case "hat": return new Tone.MetalSynth({ harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 });
    case "bass": return new Tone.MonoSynth({ oscillator: { type: "sawtooth" }, envelope: { attack: 0.005, decay: 0.3, sustain: 0.2, release: 0.2 } });
    case "lead": return new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.4 } });
    case "fm": return new Tone.FMSynth({ harmonicity: 3, modulationIndex: 10, envelope: { attack: 0.005, decay: 0.4, sustain: 0, release: 0.5 } });
  }
}

export function useGroovebox() {
  const engine = useRef<Engine | null>(null);
  const [slots, setSlots] = useState<Slot[]>(defaultSlots);
  const [pattern, setPattern] = useState<boolean[][]>(defaultPattern);
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [bpm, setBpm] = useState(124);
  const [volume, setVolume] = useState(60);
  const [hits, setHits] = useState<number[]>(() => Array(16).fill(0));
  const [error, setError] = useState("");
  const slotsRef = useRef(slots); slotsRef.current = slots;
  const patternRef = useRef(pattern); patternRef.current = pattern;

  const flash = (i: number) => setHits(h => { const n = [...h]; n[i] = Date.now(); return n; });

  const trigger = useCallback((i: number, time?: number) => {
    const e = engine.current, s = slotsRef.current[i];
    if (!e || !s || s.mute) return;
    const { synth } = e.voices[i];
    const t = time ?? Tone.now();
    const dur = Math.max(0.03, s.decay);
    if (synth instanceof Tone.NoiseSynth) synth.triggerAttackRelease(dur, t);
    else (synth as Tone.Synth).triggerAttackRelease(s.note, dur, t);
  }, []);

  const buildVoice = (s: Slot, master: Tone.Gain): Voice => {
    const gain = new Tone.Gain(s.level / 100).connect(master);
    const filter = new Tone.Filter(s.tone, "lowpass").connect(gain);
    const synth = makeSynth(s.kind).connect(filter);
    (synth as unknown as { envelope: Tone.Envelope }).envelope.decay = s.decay;
    return { synth, filter, gain };
  };

  const ensure = useCallback(async () => {
    await Tone.start();
    if (engine.current) return engine.current;
    const analyser = new Tone.Analyser("waveform", 1024);
    const master = new Tone.Gain(volume / 100 * 0.8).toDestination();
    master.connect(analyser);
    const voices = slotsRef.current.map(s => buildVoice(s, master));
    const transport = Tone.getTransport();
    let cur = 0;
    const loop = transport.scheduleRepeat(time => {
      const st = cur; cur = (cur + 1) % STEPS;
      patternRef.current.forEach((row, i) => { if (row[st]) { trigger(i, time); Tone.getDraw().schedule(() => flash(i), time); } });
      Tone.getDraw().schedule(() => setStep(st), time);
    }, "16n");
    engine.current = { voices, master, analyser, loop };
    return engine.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  // sync parameters to the engine
  useEffect(() => {
    const e = engine.current; if (!e) return;
    slots.forEach((s, i) => {
      let v = e.voices[i];
      const kindChanged = (v as Voice & { kind?: VoiceKind }).kind !== undefined && (v as Voice & { kind?: VoiceKind }).kind !== s.kind;
      if (kindChanged) { v.synth.dispose(); v.filter.dispose(); v.gain.dispose(); v = e.voices[i] = buildVoice(s, e.master); }
      (v as Voice & { kind?: VoiceKind }).kind = s.kind;
      v.gain.gain.rampTo(s.level / 100, 0.05);
      v.filter.frequency.rampTo(s.tone, 0.05);
      (v.synth as unknown as { envelope: Tone.Envelope }).envelope.decay = s.decay;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, playing]);
  useEffect(() => { engine.current?.master.gain.rampTo(volume / 100 * 0.8, 0.05); }, [volume]);
  useEffect(() => { Tone.getTransport().bpm.value = bpm; }, [bpm]);
  useEffect(() => () => {
    const e = engine.current; const t = Tone.getTransport();
    t.stop(); if (e) { t.clear(e.loop); e.voices.forEach(v => { v.synth.dispose(); v.filter.dispose(); v.gain.dispose(); }); e.master.dispose(); e.analyser.dispose(); }
    engine.current = null;
  }, []);

  const togglePlay = useCallback(async () => {
    try {
      await ensure();
      const t = Tone.getTransport();
      if (playing) { t.stop(); setStep(-1); setPlaying(false); }
      else { t.position = 0; t.start("+0.05"); setPlaying(true); }
      setError("");
    } catch { setError("Audio unavailable. Try another browser."); }
  }, [ensure, playing]);

  const hit = useCallback(async (i: number) => {
    setSelected(i);
    try { await ensure(); setPlaying(p => p); trigger(i); flash(i); } catch { setError("Audio unavailable."); }
  }, [ensure, trigger]);

  const updateSlot = (i: number, patch: Partial<Slot>) => setSlots(s => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const toggleStep = (row: number, col: number) => setPattern(p => p.map((r, i) => (i === row ? r.map((v, j) => (j === col ? !v : v)) : r)));
  const clearPattern = () => setPattern(emptyPattern());
  const randomizePattern = () => setPattern(emptyPattern().map((r, i) => r.map(() => Math.random() < (i < 3 ? 0.3 : 0.1))));
  const resetAll = () => { setSlots(defaultSlots()); setPattern(defaultPattern()); setBpm(124); setVolume(60); };

  return { engine, slots, pattern, selected, playing, step, bpm, volume, hits, error, setSelected, setBpm, setVolume, togglePlay, hit, updateSlot, toggleStep, clearPattern, randomizePattern, resetAll };
}
