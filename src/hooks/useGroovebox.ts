import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { createFx, fxEco, loadWorklets, setFxEco, setFxBpm, makeFx, modValue, FX_DEFS, type FxType, type FxNode, type FxUnit, type FxLevels } from "@/audio/effects";
import { defaultHarmony, harmonyOn, keyChord, phraseSemi, type Harmony } from "@/audio/harmony";
import { defaultArp, degreeToSemi, midiOf, stepSeconds, RATES, type ArpParams, type RateName , phraseOrder, SCALES, scaleChordOffsets, shapeInScale} from "@/audio/arp";
import { cacheFile, getSampleBlob, cacheId } from "@/audio/sampleStore";
import { stretchBuffer, defaultSample, peaksOf, playDrum, playSampler, playGrains, playSynth, type DrumParams, type SamplerParams, type SynthParams, defaultPoly, playPoly, play808, default808, playSiren, defaultSiren, type SirenParams, type Bass808Params, type PolyParams, type Voice } from "@/audio/voices";

import { playBreak, prepareBreak } from "@/audio/breaks";
import { configureEq, makeEqNodes } from "@/audio/eqResponse";
import { CHORDS, arpIndex, chordNotes, defaultChord, defaultMod, scaledEnv, type ChordParams, type ModLane } from "@/audio/musical";
import { createPerformance, defaultPerformance, type PerformanceParams } from "@/audio/performance";

// Ask the browser for its smallest audio buffer so taps reach the speaker as fast as the device allows.
if (typeof window !== "undefined" && !(Tone.getContext() as unknown as { __nad?: boolean }).__nad) {
  const c = new Tone.Context({ latencyHint: "interactive", lookAhead: 0.1 }); (c as unknown as { __nad: boolean }).__nad = true; Tone.setContext(c);
}
export type EngineKind = "drum" | "synth" | "sampler" | "poly" | "808" | "siren";
/** Channel-rack EQ in dB (frequencies in Hz). */
export type ChannelEQ = { low: number; lowFreq: number; mid: number; midFreq: number; q: number; high: number; highFreq: number };
export const defaultEQ = (): ChannelEQ => ({ low: 0, lowFreq: 100, mid: 0, midFreq: 1000, q: .7, high: 0, highFreq: 9000 });
export const STEPS = 16;
export type Slot = { name: string; engine: EngineKind; note: number; level: number; pan: number; mute: boolean; solo: boolean; drum: DrumParams; synth: SynthParams; sampler: SamplerParams; fx: FxUnit[]; arp: ArpParams; choke: number; chord: ChordParams; poly: PolyParams; mods: ModLane[]; bass: Bass808Params; eq: ChannelEQ; siren?: SirenParams };
export type MasterMeter = { m: number; s: number; i: number; sub: number; subPeak: number };
type Engine = { ctx: BaseAudioContext; master: GainNode; analyser: Tone.Analyser; performance: ReturnType<typeof createPerformance>; outs: { gain: GainNode; eq: BiquadFilterNode[]; filter: BiquadFilterNode; tap: GainNode; pan: StereoPannerNode; meter: AnalyserNode; chain: FxNode[]; sig: string }[]; loop: number; lfos: OscillatorNode[]; mono: (Voice | null)[]; ring: { stop: (t: number) => void; release: (t: number, r: number) => void; until: number }[][] };

const drum = (o: Partial<DrumParams>): DrumParams => ({ kind: "kick", pitch: 48, pitchEnv: 36, pitchDecay: 0.06, transient: 0.4, drive: 0.2, env: { a: 0.001, d: 0.35, s: 0, r: 0.1 }, noise: 0.02, fm: 0, fmRatio: 1.5, ring: 0, ringFreq: 800, filter: "lowpass", cutoff: 6000, res: 1, filterEnv: 0, filterDecay: 0.1, ...o });
const synth = (o: Partial<SynthParams>): SynthParams => ({
  osc1: { wave: "sawtooth", gain: 0.8, coarse: 0, fine: 0 }, osc2: { wave: "sine", gain: 0, coarse: 0, fine: 0, mode: "mix", fmAmount: 1 },
  partials: [1, 0.6, 0.5, 0.3, 0.3, 0.15, 0.2, 0.08, 0.1, 0, 0.05, 0, 0, 0, 0, 0], noise: 0,
  env: { a: 0.005, d: 0.25, s: 0.3, r: 0.15 }, pitchEnvShape: { a: .001, d: .05, s: 0, r: .02 }, filterEnvShape: { a: .001, d: .2, s: 0, r: .02 }, filter: "lowpass", cutoff: 900, res: 4, filterEnv: 2, filterDecay: 0.2, wet: 1,
  pitchEnv: 0, pitchDecay: 0.05, lfo: { wave: "sine", rate: 4, depth: 0, target: "cutoff" }, ...o });
/** Nearest power-of-two beat count for a loop at this tempo (2..64), used when WARP has no explicit length. */
export const guessBeats = (dur: number, bpm: number) => 2 ** Math.max(1, Math.min(6, Math.round(Math.log2(Math.max(1, dur * bpm / 60)))));
const sampler = (o: Partial<SamplerParams> = {}): SamplerParams => ({ start: 0, loop: false, pitch: 0, env: { a: 0.002, d: 0.3, s: 1, r: 0.1 }, sampleName: "built-in tone", ...o });

const base = (name: string, engine: EngineKind, note = 48, extra: Partial<Slot> = {}): Slot => ({ name, engine, note, level: 75, pan: 0, mute: false, solo: false, drum: drum({}), synth: synth({}), sampler: sampler(), fx: [], arp: defaultArp(), choke: 0, chord: defaultChord(), poly: defaultPoly(), mods: [defaultMod(), defaultMod(), defaultMod(), defaultMod()], bass: default808(), eq: defaultEQ(), siren: defaultSiren(), ...extra });
// Default kit: modern IDM palette — clicky drums, FM metal, glitch chops, rubbery bass, glassy chords and textures.
const defaultSlots = (): Slot[] => [
  base("KICK", "drum", 48, { fx: [makeFx("drumbus", { trans: -.2, smash: .45, clip: .4 })], drum: drum({ pitch: 52, pitchEnv: 40, pitchDecay: .025, transient: .8, drive: .3, env: { a: .001, d: .26, s: 0, r: .06 }, noise: .01 }) }),
  base("SNR GRN", "drum", 48, { fx: [makeFx("bitcrush", { bits: 7, reduce: 6, mix: .6 }), makeFx("reverb", { mix: .18, size: 1.2, damp: 7000 })], drum: drum({ kind: "snare", pitch: 230, pitchEnv: 18, pitchDecay: .02, noise: .7, fm: 2, fmRatio: 3.3, drive: .4, env: { a: .001, d: .16, s: 0, r: .05 }, cutoff: 9000 }) }),
  base("HAT FM", "drum", 48, { level: 50, choke: 1, drum: drum({ kind: "hat", pitch: 520, pitchEnv: 5, pitchDecay: .01, noise: .25, fm: 5, fmRatio: 1.41, ring: .7, ringFreq: 3100, filter: "highpass", cutoff: 8000, env: { a: .001, d: .035, s: 0, r: .02 } }) }),
  base("CLICK", "drum", 48, { level: 55, fx: [makeFx("delay", { time: .09, feedback: .3, mix: .2, tone: 6000 })], drum: drum({ kind: "hat", pitch: 1800, pitchEnv: 24, pitchDecay: .004, noise: .05, fm: 8, fmRatio: 2.7, filter: "bandpass", cutoff: 5000, res: 3, env: { a: .001, d: .012, s: 0, r: .01 } }) }),
  base("GLITCH", "sampler", 48, { level: 65, fx: [makeFx("bitcrush", { bits: 8, reduce: 3, mix: .5 }), makeFx("delay", { time: .1875, feedback: .35, mix: .25 })], sampler: sampler({ sampleName: "glitch-chop", sampleId: "lib:glitch-chop", slices: 8, env: { a: .001, d: .2, s: 1, r: .03 } }) }),
  base("PERC MTL", "drum", 48, { level: 55, fx: [makeFx("metal", { time: .004, feedback: .85, tone: 7000, mix: .45 })], drum: drum({ kind: "snare", pitch: 820, pitchEnv: 8, pitchDecay: .008, noise: .2, fm: 3, fmRatio: 4.1, env: { a: .001, d: .05, s: 0, r: .03 }, cutoff: 10000 }) }),
  base("HAT OP", "drum", 48, { level: 45, choke: 1, drum: drum({ kind: "hat", pitch: 480, pitchEnv: 4, pitchDecay: .01, noise: .3, fm: 4, fmRatio: 1.48, ring: .6, ringFreq: 2600, filter: "highpass", cutoff: 7000, env: { a: .001, d: .32, s: 0, r: .12 } }) }),
  base("808", "808", 29, { level: 70, bass: { ...default808(), decay: 1.1, tube: .45, harmonics: .5, click: .4, pitchEnv: 18 } }),
  base("BASS RBR", "synth", 36, { fx: [makeFx("acid", { drive: 6, mix: .45 })], synth: synth({ osc1: { wave: "sine", gain: .9, coarse: 0, fine: 0 }, osc2: { wave: "sine", gain: 1, coarse: 7, fine: 0, mode: "fm", fmAmount: 2.2 }, cutoff: 1400, res: 6, filterEnv: 2.5, filterEnvShape: { a: .001, d: .12, s: .1, r: .05 }, env: { a: .002, d: .2, s: .4, r: .08 }, pitchEnv: 5, pitchEnvShape: { a: .001, d: .03, s: 0, r: .02 } }) }),
  base("PAD ADD", "synth", 55, { level: 55, fx: [makeFx("chorus", { depth: .6, mix: .5 }), makeFx("reverb", { size: 5, mix: .45, damp: 5000 })], synth: synth({ osc1: { wave: "additive", gain: .7, coarse: 0, fine: -8 }, osc2: { wave: "additive", gain: .6, coarse: 12, fine: 9, mode: "mix", fmAmount: 1 }, partials2: [1, 0, .4, 0, .3, 0, .2, 0, .15, 0, .1, 0, .05, 0, 0, 0], cutoff: 2600, res: 1.5, filterEnv: .8, env: { a: .6, d: 1, s: .7, r: 1.8 }, lfo: { wave: "sine", rate: .3, depth: .3, target: "cutoff" } }) }),
  base("GLASS", "poly", 60, { level: 50, fx: [makeFx("delay", { time: .28, feedback: .45, mix: .3, tone: 5000 }), makeFx("reverb", { size: 3.5, mix: .35 })], chord: { ...defaultChord(), on: true, type: "min9", spread: true }, poly: { ...defaultPoly(), cutoff: 4200, res: 2, detune: 6, sub: .1, pulse: .5, chorus: .6, env: { a: .005, d: .6, s: .25, r: 1.2 } } }),
  base("VOX TEX", "sampler", 48, { level: 50, fx: [makeFx("spectral", { freq: 1600, res: 8, mix: .7 }), makeFx("reverb", { size: 6, mix: .5 })], sampler: sampler({ sampleName: "vox-ah", sampleId: "lib:vox-ah", loop: true, start: .1, loopEnd: .6, loopXfade: .05, env: { a: .25, d: .5, s: .8, r: 1.2 } }) }),
  base("NOISE", "drum", 48, { level: 35, fx: [makeFx("phaser", { mix: .5 })], drum: drum({ kind: "snare", pitch: 200, pitchEnv: 0, noise: 1, filter: "bandpass", cutoff: 2500, res: 8, filterEnv: 3, filterDecay: .5, env: { a: .05, d: .6, s: 0, r: .3 } }) }),
  base("BLIP", "synth", 72, { level: 45, fx: [makeFx("delay", { time: .375, feedback: .55, mix: .4, tone: 4000 })], synth: synth({ osc1: { wave: "square", gain: .5, coarse: 0, fine: 0 }, osc2: { wave: "sine", gain: .8, coarse: 19, fine: 0, mode: "fm", fmAmount: 1.2 }, cutoff: 3500, res: 3, env: { a: .001, d: .08, s: 0, r: .05 } }) }),
  base("TOM FM", "drum", 48, { level: 55, fx: [makeFx("reverb", { size: 1.5, mix: .2 })], drum: drum({ pitch: 130, pitchEnv: 20, pitchDecay: .05, fm: 1.5, fmRatio: 1.7, env: { a: .001, d: .22, s: 0, r: .08 } }) }),
  base("DRONE", "synth", 43, { level: 40, fx: [makeFx("phaser"), makeFx("reverb", { size: 7, mix: .5 })], synth: synth({ osc1: { wave: "triangle", gain: .8, coarse: 0, fine: 0 }, osc2: { wave: "sine", gain: 1, coarse: 7, fine: 0, mode: "fm", fmAmount: 3 }, env: { a: 1.2, d: 1, s: .8, r: 2.5 }, lfo: { wave: "triangle", rate: .2, depth: .5, target: "cutoff" } }) }),
];
const blankSlots = (): Slot[] => Array.from({ length: 16 }, () => base("", "drum", 48));
/** Step cell: 0 off, 1 hit (new attack), 2 tie (sustains the previous hit). 3 = legacy glide, played as a tie. */
export type StepVal = 0 | 1 | 2 | 3;
/** Which column a row plays on a tick. With a loop crop, the offset slides the loop window across the row. */
export const stepAt = (tick: number, full: number, loop: number, offset: number) => {
  if (loop && loop < full) { const start = ((offset % full) + full) % full; return (start + (tick % loop)) % full; }
  return (((tick - offset) % full) + full) % full;
};
export type Bank = { pattern: StepVal[][]; lengths: number[]; vel: number[][]; chance: number[][]; ratchet?: number[][] };
/** Ratchet counts a step can be split into (rolls within one 1/16). */
export const ROLLS = [1, 2, 3, 4, 6, 8];
const ones = () => Array.from({ length: 16 }, () => Array<number>(STEPS).fill(1));
const makeBank = (pattern: StepVal[][]): Bank => ({ pattern, lengths: Array(16).fill(STEPS), vel: ones(), chance: ones(), ratchet: ones() });
const NBANKS = 4;
const padMods = (m: ModLane[] | undefined): ModLane[] => Array.from({ length: NBANKS }, (_, i) => m?.[i] ?? defaultMod());
const fixBank = (b: Partial<Bank> & { pattern: StepVal[][] }): Bank => ({ pattern: b.pattern.map(r => r.map(v => (v === 3 ? 2 : v) as StepVal)), lengths: b.lengths ?? Array(16).fill(STEPS), vel: b.vel ?? ones(), chance: b.chance ?? ones(), ratchet: b.ratchet ?? ones() });
/** Engines whose pad taps sustain until the finger lifts. */
export const MAX_SAMPLE_SEC = 30;
const isWavMp3 = (f: File) => /\.(wav|wave|mp3)$/i.test(f.name) || /^audio\/(wav|wave|x-wav|vnd\.wave|mpeg|mp3)$/i.test(f.type);
const heldEngine = (s: Slot) => s.engine === "synth" || s.engine === "poly" || s.engine === "siren" || s.engine === "sampler";
/** Sets before v2: the sampler's PTCH becomes its NOTE (C4 = no shift) and phrase pads take their phrase root as NOTE. */
const migrateSlot = (x: Slot): Slot => {
  let note = x.note; const sm = x.sampler;
  if (x.engine === "sampler") note = 60 + Math.round(sm.pitch ?? 0);
  else if (x.arp?.on && x.engine !== "drum" && x.engine !== "siren") note = midiOf(x.arp, 0);
  return { ...x, note, sampler: { ...sm, pitch: 0, sampleKey: sm.sampleKey ?? 0, fine: sm.fine ?? 0 } };
};
/** The release time an engine's tail uses, so live edits and retriggers can re-time ringing voices. */
const relOf = (s: Slot) => s.engine === "sampler" ? s.sampler.env.r : s.engine === "poly" ? s.poly.env.r : s.engine === "drum" ? s.drum.env.r : s.engine === "808" ? s.bass.decay : s.engine === "siren" ? s.siren?.release ?? .4 : s.synth.env.r;
const reversed = new WeakMap<AudioBuffer, AudioBuffer>();
function reverseOf(ctx: BaseAudioContext, b: AudioBuffer) {
  let r = reversed.get(b); if (r) return r;
  r = ctx.createBuffer(b.numberOfChannels, b.length, b.sampleRate);
  for (let c = 0; c < b.numberOfChannels; c++) { const src = b.getChannelData(c), dst = r.getChannelData(c); for (let k = 0, n = src.length; k < n; k++) dst[k] = src[n - 1 - k]; }
  reversed.set(b, r); return r;
}
export type RepeatParams = { on: boolean; latch: boolean; rate: RateName; roll?: boolean };
const emptyPattern = () => Array.from({ length: 16 }, () => Array<StepVal>(STEPS).fill(0));
/** Broken, off-grid IDM groove: displaced kicks, ghost snares, ratcheted hats and glitch fills. */
const R = (row: string) => Array.from(row).map(c => (c === "x" || c === "o" || c === "r" ? 1 : c === "-" ? 2 : 0)) as StepVal[];
const DEFAULT_ROWS = [
  "x..x...x..x...x.", "....x..o....x.o.", "rx.x.xr.x.xrx.x.", "..x.....x..x...x",
  ".x....x...x..x..", "...o.x.....o..x.", "......x.......x.", "x.......x.x.....",
  "..x-.x...x-..x..", "x---------------", "....x-.......x--", "........x-------",
  "..........x.....", ".....x.........x", "...x......x.....", "x---------------",
];
const defaultPattern = () => DEFAULT_ROWS.map(R);
const defaultBank = (): Bank => {
  const b = makeBank(defaultPattern());
  DEFAULT_ROWS.forEach((row, i) => Array.from(row).forEach((c, k) => { if (c === "o") { b.vel[i][k] = .45; b.chance[i][k] = .6; } if (c === "r") b.ratchet![i][k] = k % 4 === 0 ? 3 : 2; }));
  b.chance[3] = b.chance[3].map(() => .75); b.chance[4] = b.chance[4].map(() => .7); b.vel[2] = b.vel[2].map((v, k) => (k % 2 ? .6 : v));
  return b;
};

/** Audio connections follow the slot's fx order: gain -> enabled units in order -> pan. */
const defaultFxParams = (type: FxType) => Object.fromEntries(Object.entries(FX_DEFS[type].params).map(([k, r]) => [k, r[0]]));
const TAIL_FX = new Set<string>(["delay", "reverb", "reverseDelay", "metal"]);
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
  const syncedFx = useRef<(Slot["fx"] | undefined)[]>(Array(16).fill(undefined));
  const buffers = useRef<(AudioBuffer | null)[]>(Array(16).fill(null));
  const fallback = useRef<AudioBuffer | null>(null);
  const [slots, setSlots] = useState<Slot[]>(() => defaultSlots().map(migrateSlot));
  // Two independent pattern banks (A/B) for live performance; switching waits for the next bar while playing.
  const [banks, setBanks] = useState<Bank[]>(() => [defaultBank(), makeBank(emptyPattern()), makeBank(emptyPattern()), makeBank(emptyPattern())]);
  const [bank, setBank] = useState(0);
  const [queued, setQueued] = useState<number | null>(null);
  const banksRef = useRef(banks); banksRef.current = banks;
  const bankRef = useRef(bank);
  const queuedRef = useRef<number | null>(null);
  const pattern = banks[bank].pattern, lengths = banks[bank].lengths, vel = banks[bank].vel, chance = banks[bank].chance;
  // Undo/redo: snapshots of every bank plus each slot's mod lanes; edits within 400 ms (drags) coalesce into one step.
  type Snap = { banks: Bank[]; mods: ModLane[][] };
  const undoRef = useRef<Snap[]>([]), redoRef = useRef<Snap[]>([]), lastSnap = useRef(0);
  const [hist, setHist] = useState(0);
  const slotsForSnap = useRef<Slot[]>([]);
  const snap = useCallback(() => { const now = window.performance.now(); if (now - lastSnap.current > 400) { undoRef.current.push({ banks: banksRef.current, mods: slotsForSnap.current.map(x => x.mods) }); if (undoRef.current.length > 32) undoRef.current.shift(); redoRef.current = []; setHist(h => h + 1); } lastSnap.current = now; }, []);
  const editBank = useCallback((f: (b: Bank) => Bank) => { snap(); setBanks(bs => bs.map((b, i) => (i === bankRef.current ? f(b) : b))); }, [snap]);
  const setPattern = useCallback((v: StepVal[][] | ((p: StepVal[][]) => StepVal[][])) => editBank(b => ({ ...b, pattern: typeof v === "function" ? v(b.pattern) : v })), [editBank]);
  const setLengths = useCallback((v: number[] | ((l: number[]) => number[])) => editBank(b => ({ ...b, lengths: typeof v === "function" ? v(b.lengths) : v })), [editBank]);
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const resetTick = useRef<() => void>(() => {});
  const [step, setStep] = useState(-1);
  const [bpm, setBpm] = useState(124);
  const [tune, setTune] = useState(0);
  const tuneRef = useRef(0); tuneRef.current = tune;
  const [harmony, setHarmonyState] = useState<Harmony>(defaultHarmony);
  const harmonyRef = useRef(harmony); harmonyRef.current = harmony;
  // Changing KEY moves every pitched pad by the same interval, so a pad progression stays a progression.
  const setHarmony = useCallback((h: Harmony) => {
    const d0 = h.key - harmonyRef.current.key, d = d0 > 6 ? d0 - 12 : d0 < -5 ? d0 + 12 : d0;
    if (d && harmonyOn(h)) setSlots(ss => ss.map(x => (x.engine === "drum" || x.engine === "siren" ? x : { ...x, note: x.note + d })));
    setHarmonyState(h);
  }, []);
  const [volume, setVolume] = useState(60);
  const [performance, setPerformance] = useState<PerformanceParams>(defaultPerformance);
  const performanceRef = useRef(performance); performanceRef.current = performance;
  const padRefs = useRef<(HTMLButtonElement | null)[]>(Array(16).fill(null));
  const [peaks, setPeaks] = useState<(number[] | null)[]>(() => Array(16).fill(null));
  const [error, setError] = useState("");
  const [eco, setEco] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [meter, setMeter] = useState<MasterMeter>({ m: -Infinity, s: -Infinity, i: -Infinity, sub: -Infinity, subPeak: -Infinity });
  const meterPeak = useRef(-Infinity);
  const slotsRef = useRef(slots); slotsRef.current = slots; slotsForSnap.current = slots;
  const bpmRef = useRef(bpm); bpmRef.current = bpm;
  const selectedRef = useRef(selected); selectedRef.current = selected;
  // Pad repeat (momentary or latched) with a per-pad velocity set by finger height on the pad.
  const [repeat, setRepeatState] = useState<RepeatParams>({ on: false, latch: false, rate: "1/16" });
  const repeatRef = useRef(repeat); repeatRef.current = repeat;
  const padVel = useRef<number[]>(Array(16).fill(1));
  // Live recording: hits are quantized to the nearest 16th and written into the active pattern.
  const [rec, setRec] = useState(false);
  const recRef = useRef(rec); recRef.current = rec;
  const lastTick = useRef<{ tick: number; time: number } | null>(null);
  const skip = useRef(new Set<string>());

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
  const flash = (i: number) => { const el = padRefs.current[i]; if (!el) return; el.classList.add("hit"); clearTimeout((el as unknown as { _t?: number })._t); (el as unknown as { _t?: number })._t = window.setTimeout(() => el.classList.remove("hit"), 90); };

  const booked = useRef<{ at: number; stop: (t: number) => void }[][]>(Array.from({ length: 16 }, () => []));
  /** Silences notes booked to start after `now` (they never become audible) and releases the sounding voice. */
  const cancelBooked = useCallback((i: number) => {
    const e = engine.current; if (!e) return; const now = e.ctx.currentTime;
    booked.current[i].forEach(b => { if (b.at > now) b.stop(b.at); }); booked.current[i] = [];
    e.mono[i]?.stop(now); e.ring[i].forEach(r => r.stop(now)); e.ring[i] = [];
  }, []);
  /** Plays one note on a slot. `semi` is relative pitch (from the phrase sequencer), `gateSec` overrides the note length, `noteIdx` plays one chord note (arpeggio step). */
  const trigger = useCallback((i: number, time?: number, vel0 = 1, semi = 0, gateSec?: number, noteIdx?: number) => {
    // Fader-like loudness curve: low velocities fade smoothly to true silence.
    const vel = Math.max(0, Math.min(1, vel0)) ** 2; if (vel <= 0) return;
    const e = engine.current, s = slotsRef.current[i];
    if (!e || !s || s.mute || (!s.solo && slotsRef.current.some(x => x.solo))) return;
    // Pad hits start a hair ahead of "now": on iPhone a voice booked for exactly currentTime can land in the past and be skipped.
    const t0 = time ?? e.ctx.currentTime + 0.005, dest = e.outs[i].gain, gate0 = gateSec ?? 60 / bpmRef.current / 4;
    const factor = 2 ** (performanceRef.current.time * 2);
    e.outs[i].chain.forEach(f => { f.setPitch?.(semi, t0); f.trigger?.(t0); });
    let notes = (s.engine === "poly" || s.engine === "sampler") ? chordNotes(s.chord) : [0];
    // Chords on a phrase pad: SCALE fit stacks thirds from the scale so progressions stay in key; FIXED moves the shape unchanged.
    const kc = notes.length > 1 ? keyChord(harmonyRef.current, s.note + semi, CHORDS[s.chord.type].length) : null;
    if (kc) {
      // Global key: chords take the quality of their degree (I maj, ii min, vii° dim…); the chosen type sets the size.
      let ns = [...kc];
      for (let k = 0; k < Math.min(s.chord.inversion, ns.length - 1); k++) { const f = ns.shift(); if (f !== undefined) ns.push(f + 12); }
      notes = ns.map((x, k) => x + (s.chord.spread && k % 2 ? 12 : 0)).sort((x, y) => x - y);
    } else if (notes.length > 1 && s.arp.on && (s.chord.fit ?? "scale") === "scale") {
      // Off-scale pitches (pitch mod, chromatic scale) keep the fixed shape so the chord root never jumps to another note.
      // The selected chord is kept (with its voicing) when it already fits the scale; otherwise in-key thirds replace it.
      const fit = shapeInScale(s.arp.scale, semi, CHORDS[s.chord.type]) ? null : scaleChordOffsets(s.arp.scale, semi, CHORDS[s.chord.type].length);
      if (fit) { let ns = fit;
      for (let k = 0; k < Math.min(s.chord.inversion, ns.length - 1); k++) { const f = ns.shift(); if (f !== undefined) ns.push(f + 12); }
      ns = ns.map((x, k) => x + (s.chord.spread && k % 2 ? 12 : 0)).sort((x, y) => x - y); notes = ns; }
    }
    const pm = performanceRef.current.chordMode ?? "pad", mode = notes.length > 1 ? (pm === "pad" ? s.chord.play ?? "block" : pm) : "block";
    const pitch = s.note + semi + (s.engine === "drum" ? 0 : tuneRef.current);
    // Sampler: NOTE relative to the sample's own key (S-KEY), plus FINE cents; C4 with S-KEY C plays the file as recorded.
    const sp = s.note + (s.engine === "drum" ? 0 : tuneRef.current) - 60 - (s.sampler.sampleKey ?? 0) + Math.max(-50, Math.min(50, s.sampler.fine ?? 0)) / 100;
    const raw = buffers.current[i] ?? fallbackBuf(), buf = s.sampler.reverse ? reverseOf(e.ctx, raw) : raw;
    // Breakbeats: WARP fits the loop to the tempo without changing pitch; SLICES plays one slice per note
    // (each semitone away from the pad's root moves one slice), so phrases and pads can re-sequence a break.
    const samplerRun = (sm: SamplerParams, dur: number, semi: number, offset: number, factor: number): SamplerParams => {
      const base = { ...sm, env: scaledEnv(sm.env, factor), pitch: sp + semi + offset };
      const n = Math.round(sm.slices ?? 0);
      if (n > 1) { const k = ((Math.round(semi) % n) + n) % n; Object.assign(base, { start: k / n, endFrac: (k + 1) / n, loop: false, pitch: sp + offset }); }
      return base;
    };
    const run = (t: number, gate: number, idx?: number) => {
      // Retriggers let the previous voice ring out per its release (like the 808); choke groups cut
      // every ringing voice in the same group immediately, and never touch other groups.
      if (s.choke) slotsRef.current.forEach((other, j) => { if (j !== i && other.choke === s.choke) { e.ring[j].forEach(r => r.stop(t)); e.ring[j] = []; e.mono[j]?.stop(t); e.mono[j] = null; } });
      // 808 is mono: a new hit cuts the old tail so its envelope always restarts at full level.
      if (s.engine === "808") { e.ring[i].forEach(r => r.stop(t)); e.ring[i] = []; }
      const ns = idx === undefined ? notes : [notes[arpIndex(s.chord.arp ?? "up", idx, notes.length)]];
      const strum = mode === "strum" && idx === undefined ? (s.chord.strum ?? 30) / 1000 : 0, at = (k: number) => t + k * strum, gk = (k: number) => Math.max(.02, gate - k * strum);
      const voices = ns.map((offset, k) => s.engine === "808" ? play808(e.ctx, dest, { ...s.bass, decay: s.bass.decay * factor, pitchEnv: s.bass.pitchEnv * factor, pitchDecay: s.bass.pitchDecay * factor }, pitch, t, gate, vel)
        : s.engine === "drum" ? playDrum(e.ctx, dest, { ...s.drum, env: scaledEnv(s.drum.env, factor), pitchEnv: s.drum.pitchEnv * factor, pitchDecay: s.drum.pitchDecay * factor, filterDecay: s.drum.filterDecay * factor, pitch: s.drum.pitch * 2 ** (semi / 12) }, t, vel)
        : s.engine === "sampler" ? (s.sampler.warp && !s.sampler.grain ? playBreak(e.ctx, dest, { ...s.sampler, env: scaledEnv(s.sampler.env, factor), pitch: sp + semi + offset }, buf, at(k), gk(k), bpmRef.current, vel / Math.sqrt(ns.length)) : (s.sampler.grain ? playGrains : playSampler)(e.ctx, dest, samplerRun(s.sampler, raw.duration, semi, offset, factor), buf, at(k), gk(k), vel / Math.sqrt(ns.length)))
        : s.engine === "poly" ? null
        : s.engine === "siren" ? playSiren(e.ctx, dest, { ...defaultSiren(), ...s.siren, release: (s.siren?.release ?? .4) * factor, sweepTime: (s.siren?.sweepTime ?? 1.5) * factor }, pitch, t, gate, vel, e.lfos[i])
        : playSynth(e.ctx, dest, { ...s.synth, env: scaledEnv(s.synth.env, factor), pitchEnv: s.synth.pitchEnv * factor, pitchDecay: s.synth.pitchDecay * factor, filterDecay: s.synth.filterDecay * factor }, pitch, t, gate, vel, e.lfos[i]));
      if (s.engine === "poly") { const pp = { ...s.poly, env: scaledEnv(s.poly.env, factor) }; if (strum) ns.forEach((n, k) => voices.push(playPoly(e.ctx, dest, pp, [pitch + n], at(k), gk(k), vel / Math.sqrt(ns.length)))); else voices.push(playPoly(e.ctx, dest, pp, ns.map(n => pitch + n), t, gate, vel)); }
      const rel = (st: number, r: number) => voices.forEach(v => v?.release?.(st, r));
      e.mono[i] = { stop: st => voices.forEach(v => v?.stop(st)), release: rel, glide: (to, gt, tm) => voices.forEach(v => v?.glide?.(to - semi, gt, tm)), update: q => voices.forEach(v => v?.update?.(q)) };
      // Ring list: every live voice per pad, pruned when silent and capped at 6 so rapid rolls never overload the audio thread.
      // Earlier tails fade with the pad's current release, so a shortened release is heard on the very next hit.
      const now0 = e.ctx.currentTime, rl = (e.ring[i] = e.ring[i].filter(r => r.until > now0)), curR = relOf(s);
      // Poly chords are heavy (many oscillators each), so their old tails fade quickly and fewer may ring, keeping every new hit audible.
      const isPoly = s.engine === "poly", cap = isPoly ? 3 : 6;
      if (idx === undefined || idx === 0) rl.forEach(r => r.release(t, isPoly ? Math.min(curR, .25) : curR));
      rl.push({ stop: e.mono[i]!.stop, release: rel, until: Math.max(now0, t) + gate + 8 });
      if (rl.length > cap) rl.splice(0, rl.length - cap).forEach(r => r.stop(t));
      // Every booked voice is remembered until it has started, so a release can cancel notes scheduled ahead.
      const now = e.ctx.currentTime, list = booked.current[i].filter(b => b.at > now); if (t > now) list.push({ at: t, stop: e.mono[i]!.stop }); booked.current[i] = list;
    };
    if (mode === "arp" && noteIdx === undefined) {
      if (gate0 > 30) return; // held pads arpeggiate through the hold scheduler instead
      const rs = 60 / bpmRef.current * RATES[s.chord.rate ?? "1/16"];
      for (let k = 0; k * rs < gate0 - .001 && k < 64; k++) run(t0 + k * rs, Math.min(rs * .9, gate0 - k * rs), k);
      return;
    }
    try { run(t0, gate0, noteIdx); }
    catch (err) { console.warn("pad voice failed", err); }
  }, []);

  /** One phrase-sequencer step. Slide steps glide the running note; the note before a slide is held through it. */
  const phraseStep = useCallback((i: number, a: ArpParams, k: number, t: number, sd: number, end: number, velMul: number, first: boolean, semiAdd = 0) => {
    const c = a.cells[k % a.steps]; if (!c.on) return false;
    const semi = phraseSemi(harmonyRef.current, slotsRef.current[i].note, a.scale, c.deg) + semiAdd, prev = a.cells[(k - 1 + a.steps) % a.steps], mono = engine.current?.mono[i];
    if (c.slide && !first && prev.on && mono?.glide) { mono.glide(semi, t, (a.glide ?? 80) / 1000); return true; }
    let n = 1; while (n < a.steps && a.cells[(k + n) % a.steps].on && a.cells[(k + n) % a.steps].slide) n++;
    const g = n > 1 ? sd * (n - 1 + a.cells[(k + n - 1) % a.steps].gate) : sd * c.gate;
    trigger(i, t, c.vel * velMul, semi, Math.min(g, end - t)); return true;
  }, [trigger]);

  // STEP mode: each hit advances one place through the (loop-expanded) phrase and wraps around.
  const cursor = useRef<number[]>(Array(16).fill(0));
  const stepHit = useCallback((i: number, t: number | undefined, velMul: number, gate?: number, semiAdd = 0) => {
    const a = slotsRef.current[i].arp, order = phraseOrder(a), k = order[cursor.current[i] % order.length];
    cursor.current[i] = (cursor.current[i] + 1) % order.length;
    const c = a.cells[k]; if (!c?.on) return false;
    trigger(i, t, c.vel * velMul, phraseSemi(harmonyRef.current, slotsRef.current[i].note, a.scale, c.deg) + semiAdd, gate); return true;
  }, [trigger]);

  const recordHit = useCallback((i: number, at: number, v: number) => {
    const lt = lastTick.current; if (!recRef.current || !lt || Tone.getTransport().state !== "started") return;
    const six = 60 / bpmRef.current / 4, q = lt.tick + Math.round((at - lt.time) / six), qq = ((q % 55440) + 55440) % 55440;
    const b = banksRef.current[bankRef.current], pf = performanceRef.current, col = stepAt(qq, b.lengths[i], pf.loop, pf.offset ?? 0);
    if (q > lt.tick) skip.current.add(`${i}:${qq}`); // already heard live: don't play it again this pass
    setBanks(bs => bs.map((bk, j) => (j !== bankRef.current ? bk : { ...bk, pattern: bk.pattern.map((r, ri) => (ri === i ? r.map((x, ci) => (ci === col ? 1 : x)) : r)), vel: bk.vel.map((r, ri) => (ri === i ? r.map((x, ci) => (ci === col ? Math.round(v * 100) / 100 : x)) : r)) })));
  }, []);

  // Pad holds: phrases, held chord arpeggios and pad repeat are booked ahead on the audio clock.
  type Hold = { next: number; idx: number; count: number; kind: "phrase" | "chord" | "repeat" };
  const holds = useRef(new Map<number, Hold>());
  const timer = useRef<boolean>(false); // subscribed to the audio clock tick
  const pressed = useRef(new Set<number>());
  const pump = useCallback(() => {
    const e = engine.current; if (!e) return;
    const horizon = e.ctx.currentTime + 0.15, bpmNow = bpmRef.current;
    holds.current.forEach((h, i) => {
      const s = slotsRef.current[i], a = s.arp;
      const rb = 60 / bpmNow * RATES[repeatRef.current.rate];
      // Roll: the repeat accelerates while held, down to a quarter of the chosen rate.
      const dur = h.kind === "repeat" ? (repeatRef.current.roll ? Math.max(rb / 4, rb * .93 ** h.count) : rb) : h.kind === "chord" ? 60 / bpmNow * RATES[s.chord.rate ?? "1/16"] : stepSeconds(a, bpmNow);
      while (h.next < horizon) {
        let fired = true;
        if (h.kind === "repeat") { const v = padVel.current[i], g = Math.min(dur * .95, 60 / bpmNow / 4); if (a.on && a.mode === "step") fired = stepHit(i, h.next, v, g); else trigger(i, h.next, v, 0, g); recordHit(i, h.next, v); }
        else if (h.kind === "chord") trigger(i, h.next, 1, 0, dur * .9, h.idx);
        else { const ord = phraseOrder(a); fired = phraseStep(i, a, ord[h.idx % ord.length], h.next, dur, Infinity, 1, h.count === 0); }
        if (fired) { const ft = h.next; Tone.getDraw().schedule(() => flash(i), ft); }
        h.next += dur; h.idx = h.kind === "phrase" ? (h.idx + 1) % phraseOrder(a).length : h.idx + 1; h.count++;
      }
    });
  }, [trigger, phraseStep, recordHit, stepHit]);
  // The hold pump runs from Tone's worker-driven clock tick, which background tabs throttle far less than page timers.
  const idle = () => { if (!holds.current.size && timer.current) { Tone.getContext().off("tick", tickPump); timer.current = false; } };
  const pumpRef = useRef(() => {}); pumpRef.current = pump;
  const tickPump = useRef(() => pumpRef.current()).current;
  const startHold = useCallback((i: number, kind: Hold["kind"]) => {
    const e = engine.current; if (!e || holds.current.has(i) || !pressed.current.has(i)) return;
    holds.current.set(i, { next: e.ctx.currentTime, idx: 0, count: 0, kind }); pump();
    if (!timer.current) { Tone.getContext().on("tick", tickPump); timer.current = true; }
  }, [pump]);
  const stopHold = useCallback((i: number) => { if (!holds.current.delete(i)) return; cancelBooked(i); idle(); }, [cancelBooked]);
  const release = useCallback((i: number) => {
    pressed.current.delete(i);
    const h = holds.current.get(i);
    if (h?.kind === "repeat" && repeatRef.current.latch) return;
    if (!h) { const slot = slotsRef.current[i], e = engine.current; if (e && heldEngine(slot)) e.mono[i]?.release?.(e.ctx.currentTime, relOf(slot)); return; }
    stopHold(i);
  }, [stopHold]);
  const isChordArp = (s: Slot) => { const pm = performanceRef.current.chordMode ?? "pad"; return s.chord.on && (s.engine === "poly" || s.engine === "sampler") && (pm === "pad" ? s.chord.play === "arp" : pm === "arp"); };
  const play = useCallback((i: number) => {
    const slot = slotsRef.current[i], e = engine.current;
    if (repeatRef.current.on) { if (repeatRef.current.latch && holds.current.get(i)?.kind === "repeat") { stopHold(i); return; } stopHold(i); startHold(i, "repeat"); return; }
    if (e) recordHit(i, e.ctx.currentTime, 1);
    if (slot.arp.on && slot.arp.mode === "step") { const lg = heldEngine(slot) ? 60 : undefined; if (stepHit(i, undefined, 1, lg)) flash(i); }
    else if (slot.arp.on) startHold(i, "phrase");
    else if (isChordArp(slot)) startHold(i, "chord");
    else { trigger(i, undefined, 1, 0, heldEngine(slot) ? 60 : undefined); flash(i); }
  }, [startHold, stopHold, trigger, recordHit, stepHit]);
  const setRepeat = useCallback((r: RepeatParams) => { if (!r.on || !r.latch) [...holds.current].forEach(([i, h]) => { if (h.kind === "repeat" && (!r.on || !pressed.current.has(i))) stopHold(i); }); setRepeatState(r); }, [stopHold]);
  const setPadVel = useCallback((i: number, v: number) => { padVel.current[i] = v; }, []);
  // Audio interruptions (phone call, Siri, locked screen, OS suspends): silence booked notes and pause the
  // transport in place, then resume on the next return/tap so playback continues without a burst of late notes.
  const interrupted = useRef(false);
  useEffect(() => {
    const raw = ctxOf() as AudioContext;
    const onState = () => {
      if (!engine.current) return;
      const st = raw.state as string, t = Tone.getTransport();
      if (st !== "running" && st !== "closed") {
        if (t.state === "started") { interrupted.current = true; t.pause(); }
        for (let k = 0; k < 16; k++) cancelBooked(k); holds.current.clear(); pressed.current.clear(); idle();
        setError("AUDIO INTERRUPTED · TAP TO RESUME");
      } else if (st === "running") {
        // Deferred so a STOP tap that caused the resume (pointerdown precedes click) cancels the restart first.
        if (interrupted.current) window.setTimeout(() => { if (interrupted.current && t.state === "paused") { interrupted.current = false; t.start(); } }, 120);
        setError(e => (e.startsWith("AUDIO INTERRUPTED") ? "" : e));
      }
    };
    const tryResume = () => { if (engine.current && raw.state !== "running" && raw.state !== "closed") raw.resume().catch(() => { /* needs a user gesture; the next tap retries */ }); };
    const onVis = () => { if (document.visibilityState === "visible") tryResume(); };
    raw.addEventListener("statechange", onState); document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pointerdown", tryResume, true); window.addEventListener("keydown", tryResume, true);
    return () => { raw.removeEventListener("statechange", onState); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("pointerdown", tryResume, true); window.removeEventListener("keydown", tryResume, true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelBooked]);

  const ensure = useCallback(async () => {
    await Tone.start(); await loadWorklets();
    if (engine.current) return engine.current;
    const ctx = ctxOf();
    const master = ctx.createGain(); master.gain.value = volume / 100 * 0.8; const perf = createPerformance(ctx, ctx.destination); master.connect(perf.input); perf.update(performanceRef.current, bpmRef.current);
    perf.meter.port.onmessage = (ev: MessageEvent<{ m: number; s: number; i: number; sub: number; peak: number }>) => { const v = ev.data; meterPeak.current = Math.max(v.peak, meterPeak.current - .6); setMeter({ m: v.m, s: v.s, i: v.i, sub: v.sub, subPeak: meterPeak.current }); };
    const analyser = new Tone.Analyser("waveform", 1024); Tone.connect(perf.output, analyser);
    const outs = slotsRef.current.map(s => { const eq = makeEqNodes(ctx); configureEq(eq, defaultEQ(), (pr, v) => { pr.value = v; }); const gain = ctx.createGain(), filter = ctx.createBiquadFilter(), tap = ctx.createGain(), pan = ctx.createStereoPanner(); filter.frequency.value = 20000; filter.Q.value = .707; gain.gain.value = s.level / 100; eq.reduce<AudioNode>((a, b) => (a.connect(b), b), gain).connect(filter); gain.connect(tap); pan.pan.value = s.pan; pan.connect(master); const meter = ctx.createAnalyser(); meter.fftSize = 512; meter.smoothingTimeConstant = 0; pan.connect(meter); return { gain, eq, filter, tap, pan, meter, chain: [] as FxNode[], sig: "?" }; });
    let cur = 0; resetTick.current = () => { cur = 0; };
    const loop = Tone.getTransport().scheduleRepeat(time => {
      const tick = cur; cur = (cur + 1) % 55440; // divisible by every length 1-16
      const sixteenth = 60 / bpmRef.current / 4;
      if (queuedRef.current != null && tick % 16 === 0) { const nb = queuedRef.current; bankRef.current = nb; queuedRef.current = null; Tone.getDraw().schedule(() => { setBank(nb); setQueued(null); }, time); }
      const cb = banksRef.current[bankRef.current];
      const pf = performanceRef.current;
      lastTick.current = { tick, time };
      cb.pattern.forEach((row, i) => {
        // Offset rotates each row; with a loop crop it slides the cropped window across the row.
        const full = cb.lengths[i], len = pf.loop ? Math.min(full, pf.loop) : full, st = stepAt(tick, full, pf.loop, pf.offset ?? 0);
        const eng = engine.current, slot = slotsRef.current[i], lane = slot.mods?.[bankRef.current], v = row[st];
        // Mod row: each active step sets its parameter to the drawn fill (0-100%) on the audio clock.
        let semiAt = 0;
        if (eng && lane?.on && v !== 0) {
          const value = lane.values[st] ?? .5;
          if (lane.target === "cutoff") eng.outs[i].filter.frequency.setTargetAtTime(40 * 500 ** value, time, .005);
          else if (lane.target === "pitch") semiAt = Math.round((value - .5) * 24);
          else { const [id, param] = lane.target.split(":"); const enabled = slot.fx.filter(f => f.on); const idx = enabled.findIndex(f => String(f.id) === id);
            if (idx >= 0) { const u = enabled[idx]; eng.outs[i].chain[idx]?.update({ ...defaultFxParams(u.type), ...u.params, ...(param === "time" ? { sync: 0 } : {}), [param]: modValue(u.type, param, value) }, time); } }
        } else if (eng && (!lane?.on || lane.target !== "cutoff")) eng.outs[i].filter.frequency.setTargetAtTime(20000, time, .005);
        if (v !== 1) return;
        if (skip.current.delete(`${i}:${tick}`)) return;
        if (Math.random() >= (cb.chance?.[i]?.[st] ?? 1)) return;
        const velo = cb.vel?.[i]?.[st] ?? 1;
        let ties = 0; while (ties + 1 < len && row[stepAt(tick + ties + 1, full, pf.loop, pf.offset ?? 0)] >= 2 && (pf.loop ? (tick % len) + ties + 1 < len : st + ties + 1 < full)) ties++;
        const dur = (1 + ties) * sixteenth, a = slotsRef.current[i].arp;
        const rn = Math.round(cb.ratchet?.[i]?.[st] ?? 1);
        if (!a.on && rn > 1) { const sub = sixteenth / rn; for (let k = 0; k < rn; k++) { const tt = time + k * sub; trigger(i, tt, velo * (1 - k * .04), semiAt, sub * .9); Tone.getDraw().schedule(() => flash(i), tt); } return; }
        if (!a.on) { trigger(i, time, velo, semiAt, dur * 0.98); Tone.getDraw().schedule(() => flash(i), time); return; }
        if (a.mode === "step") { if (stepHit(i, time, velo, dur * .98, semiAt)) Tone.getDraw().schedule(() => flash(i), time); return; }
        // Phrase pad: play its phrase from the start for exactly as long as the hit (plus ties) lasts.
        const sd = stepSeconds(a, bpmRef.current), end = time + dur - 0.002, ord = phraseOrder(a);
        for (let k = 0, t = time; t < end; k++, t += sd) { if (phraseStep(i, a, ord[k % ord.length], t, sd, end, velo, k === 0, semiAt)) { const ft = t; Tone.getDraw().schedule(() => flash(i), ft); } }
      });
      Tone.getDraw().schedule(() => setStep(tick), time);
    }, "16n");
    { const r = ctx as unknown as { baseLatency?: number; outputLatency?: number }; setLatency(Math.round(((r.baseLatency ?? 0) + (r.outputLatency ?? 0)) * 1000)); }
    const lfos = slotsRef.current.map(() => { const o = ctx.createOscillator(); o.start(); return o; });
    engine.current = { ctx, master, performance: perf, analyser, outs, loop, lfos, mono: Array(16).fill(null), ring: Array.from({ length: 16 }, () => []) };
    const ready = engine.current; slotsRef.current.forEach((s, i) => syncChain(ready, i, s));
    syncedFx.current = slotsRef.current.map(s => s.fx);
    return engine.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, phraseStep, stepHit]);

  useEffect(() => {
    const e = engine.current; if (!e) return;
    slots.forEach((s, i) => { e.outs[i].gain.gain.setTargetAtTime((s.mute || (slots.some(x => x.solo) && !s.solo) ? 0 : s.level / 100), e.ctx.currentTime, 0.02); e.outs[i].pan.pan.setTargetAtTime(s.pan, e.ctx.currentTime, 0.02); { const o = e.lfos[i], sir = s.engine === "siren", w = (sir ? s.siren?.lfoWave : s.synth.lfo.wave) ?? "sine", r = (sir ? s.siren?.rate : s.synth.lfo.rate) ?? 1; if (o.type !== w && w !== ("additive" as string)) o.type = w as OscillatorType; o.frequency.setTargetAtTime(r, e.ctx.currentTime, .02); }
      configureEq(e.outs[i].eq, { ...defaultEQ(), ...s.eq }, (pr, v) => pr.setTargetAtTime(v, e.ctx.currentTime, .02));
      if (syncedFx.current[i] !== s.fx) { syncChain(e, i, s); syncedFx.current[i] = s.fx; }
    });
  }, [slots]);
  useEffect(() => { const e = engine.current; e?.master.gain.setTargetAtTime(volume / 100 * 0.8, e.ctx.currentTime, 0.02); }, [volume]);
  useEffect(() => { engine.current?.performance.update(performance, bpm); }, [performance, bpm]);
  useEffect(() => { Tone.getTransport().bpm.value = bpm; setFxBpm(bpm); const e = engine.current; if (e) slotsRef.current.forEach((s, i) => syncChain(e, i, s)); }, [bpm]);
  // Shorter scheduler look-ahead = tighter sequencer response; eco keeps a safer buffer for weak CPUs.
  useEffect(() => {
    setFxEco(eco); Tone.getContext().lookAhead = 0.1;
    const e = engine.current; if (e) slotsRef.current.forEach((s, i) => syncChain(e, i, s));
  }, [eco]);
  useEffect(() => () => {
    const e = engine.current, t = Tone.getTransport();
    t.stop(); if (e) { t.clear(e.loop); e.outs.forEach(o => { o.chain.forEach(f => f.dispose()); o.gain.disconnect(); o.eq.forEach(b => b.disconnect()); o.filter.disconnect(); o.tap.disconnect(); o.pan.disconnect(); o.meter.disconnect(); }); e.mono.forEach(v => v?.stop(e.ctx.currentTime)); e.ring.forEach(rl => rl.forEach(r => r.stop(e.ctx.currentTime))); e.lfos.forEach(o => { try { o.stop(); } catch { /* stopped */ } o.disconnect(); }); e.performance.dispose(); e.master.disconnect(); e.analyser.dispose(); }
    holds.current.clear(); if (timer.current) { Tone.getContext().off("tick", tickPump); timer.current = false; }
    engine.current = null;
  }, []);

  const lastStop = useRef(0);
  /** Ableton-style double-STOP: rebuild every tail-carrying FX chain (fresh nodes = empty delay lines and reverb) after a short fade. */
  const killTails = useCallback(() => {
    const e = engine.current; if (!e) return; e.performance.flush?.();
    e.outs.forEach((o, i) => { if (!o.chain.some((_, k) => TAIL_FX.has(slotsRef.current[i].fx.filter(f => f.on)[k]?.type))) return;
      o.chain.forEach(f => { const v = f.output.gain; v.cancelScheduledValues(e.ctx.currentTime); v.setTargetAtTime(0, e.ctx.currentTime, .006); });
      setTimeout(() => { o.sig = ""; syncChain(e, i, slotsRef.current[i]); }, 35); });
  }, []);
  const togglePlay = useCallback(async () => {
    try {
      if (playing) interrupted.current = false; // STOP during an interruption must not be undone by the resume
      await ensure(); const t = Tone.getTransport();
      setPaused(false);
      const nowMs = window.performance.now(), dbl = nowMs - lastStop.current < 400; lastStop.current = nowMs;
      if (!playing) { if (dbl) { killTails(); lastStop.current = 0; return; } }
      if (playing) { t.stop(); skip.current.clear(); lastTick.current = null; for (let k = 0; k < 16; k++) cancelBooked(k); setStep(-1); if (queuedRef.current != null) { bankRef.current = queuedRef.current; setBank(queuedRef.current); queuedRef.current = null; setQueued(null); } setPlaying(false); } else { if (t.state !== "stopped") t.stop(); engine.current?.performance.meter.port.postMessage("reset"); meterPeak.current = -Infinity; cursor.current.fill(0); resetTick.current(); t.position = 0; t.start("+0.05"); setPlaying(true); }
      setError("");
    } catch { setError("Audio unavailable. Try another browser."); }
  }, [ensure, playing]);
  const togglePause = useCallback(async () => {
    try {
      await ensure(); const t = Tone.getTransport();
      if (playing) { interrupted.current = false; t.pause(); skip.current.clear(); lastTick.current = null; for (let k = 0; k < 16; k++) cancelBooked(k); setPlaying(false); setPaused(true); }
      else if (paused) { t.start("+0.05"); setPlaying(true); setPaused(false); }
    } catch { setError("Audio unavailable. Try another browser."); }
  }, [ensure, playing, paused, cancelBooked]);
  // Live waveform of one pad (post-pan tap), for the pixel oscilloscope screens.
  const getSlotWave = useCallback((i: number, out: Float32Array<ArrayBuffer>) => { const o = engine.current?.outs[i]; if (!o) return false; o.meter.getFloatTimeDomainData(out); return true; }, []);
  // Spectrum analysers are made on first use (one per pad, silent tap after pan) so idle pads cost nothing.
  const specs = useRef(new Map<number, AnalyserNode>());
  const getSlotSpectrum = useCallback((i: number, out: Float32Array<ArrayBuffer>) => { const e = engine.current, o = e?.outs[i]; if (!e || !o) return 0;
    let an = specs.current.get(i); if (!an || an.context !== e.ctx) { an = e.ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = .55; an.minDecibels = -90; an.maxDecibels = -10; o.pan.connect(an); specs.current.set(i, an); }
    an.getFloatFrequencyData(out); return e.ctx.sampleRate; }, []);
  const resetMeter = useCallback(() => { engine.current?.performance.meter.port.postMessage("reset"); meterPeak.current = -Infinity; setMeter({ m: -Infinity, s: -Infinity, i: -Infinity, sub: -Infinity, subPeak: -Infinity }); }, []);
  const getFxLevels = useCallback((slot: number, id: number): FxLevels | null => {
    const e = engine.current, s = slotsRef.current[slot];
    if (!e || !s) return null;
    const index = s.fx.filter(f => f.on).findIndex(f => f.id === id);
    return index < 0 ? null : e.outs[slot].chain[index]?.levels() ?? null;
  }, []);
  // Pre-bake reversed / warped / stretched sample buffers off the pad's critical path (idle time after any
  // sample, setting or tempo change), so the first hit after a change is as immediate as every other one.
  useEffect(() => {
    const e = engine.current; if (!e) return;
    const idle = (window as unknown as { requestIdleCallback?: (f: () => void) => number }).requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 30));
    const id = idle(() => slots.forEach((s, i) => {
      if (s.engine !== "sampler" || s.sampler.grain) return;
      const raw = buffers.current[i]; if (!raw) return;
      const buf = s.sampler.reverse ? reverseOf(e.ctx, raw) : raw, sm = s.sampler;
      if (sm.warp) { void prepareBreak(e.ctx, buf).catch(() => setError("Break playback could not load. Try selecting BRK again.")); return; }
      const amt = sm.stretch ? sm.stretchAmt ?? 1 : 1;
      if (Math.abs(amt - 1) > .01) stretchBuffer(e.ctx, buf, amt, sm.stretchGrain ?? .05);
    }));
    return () => { (window as unknown as { cancelIdleCallback?: (n: number) => void }).cancelIdleCallback?.(id); clearTimeout(id); };
  }, [slots, bpm]);
  /** Post-fader peak level (dBFS) for each mixer channel, read from a silent analyser tap after pan. */
  const meterBuf = useRef(new Float32Array(512));
  const getChannelLevels = useCallback((): number[] | null => {
    const e = engine.current; if (!e) return null; const b = meterBuf.current;
    return e.outs.map(o => { o.meter.getFloatTimeDomainData(b); let pk = 0; for (let k = 0; k < b.length; k++) { const a = Math.abs(b[k]); if (a > pk) pk = a; } return pk > 1e-5 ? 20 * Math.log10(pk) : -Infinity; });
  }, []);
  /** Live master dynamics: true gain reduction (dB) from glue+limiter and post-chain output level. */
  const getMasterDyn = useCallback((): { gr: number; out: number } | null => engine.current?.performance.dyn() ?? null, []);

  const hit = useCallback(async (i: number) => {
    // Fast path: audio already running, so play synchronously with no await.
    pressed.current.add(i);
    const e = engine.current;
    if (e && Tone.getContext().state === "running") { play(i); if (selectedRef.current !== i) { selectedRef.current = i; setSelected(i); } return; }
    setSelected(i);
    try { await ensure(); if (Tone.getContext().state !== "running") return; play(i); } catch { setError("Audio unavailable."); }
  }, [ensure, play]);

  // Stable callbacks so memoized panels (pads, editor, fx, sequencer) skip re-renders while playing.
  const resetCursor = (i: number, patch: Partial<Slot>) => {
    if (patch.arp && patch.arp.mode !== slotsRef.current[i]?.arp.mode) cursor.current[i] = 0;
    // A shorter release re-times tails that are still ringing (a held note keeps sounding until lift).
    const e = engine.current, old = slotsRef.current[i]; if (!e || !old) return;
    const r = relOf({ ...old, ...patch }); if (r >= relOf(old)) return;
    const now = e.ctx.currentTime, held = pressed.current.has(i) ? e.mono[i]?.stop : undefined;
    e.ring[i].forEach(x => { if (x.stop !== held) x.release(now, r); });
  };
  const updateSlot = useCallback((i: number, patch: Partial<Slot>) => { resetCursor(i, patch); const hv = engine.current?.mono[i]; if (hv?.update && (patch.synth || patch.poly)) hv.update((patch.synth ?? patch.poly) as Parameters<NonNullable<Voice["update"]>>[0]); setSlots(s => s.map((x, j) => (j === i ? { ...x, ...patch } : x))); }, []);
  const updateSelected = useCallback((patch: Partial<Slot>) => { resetCursor(selectedRef.current, patch); setSlots(s => s.map((x, j) => (j === selectedRef.current ? { ...x, ...patch } : x))); }, []);
  // Decode a blob into pad i. Every user file is cached in IndexedDB so sets can recall it later.
  const setBuffer = useCallback(async (i: number, blob: Blob, name: string, sampleId?: string) => {
    let buf = await ctxOf().decodeAudioData(await blob.arrayBuffer());
    // Samples are capped at 30 s: longer files keep their first 30 seconds.
    const cut = buf.duration > MAX_SAMPLE_SEC;
    if (cut) { const n = Math.floor(MAX_SAMPLE_SEC * buf.sampleRate), b = ctxOf().createBuffer(buf.numberOfChannels, n, buf.sampleRate); for (let c = 0; c < buf.numberOfChannels; c++) b.copyToChannel(buf.getChannelData(c).subarray(0, n), c); buf = b; }
    buffers.current[i] = buf;
    setPeaks(p => p.map((x, j) => (j === i ? peaksOf(buf) : x)));
    setSlots(s => s.map((x, j) => (j === i ? { ...x, engine: "sampler", sampler: { ...x.sampler, sampleName: name, sampleId } } : x)));
    return cut;
  }, []);
  const loadSample = useCallback(async (i: number, file: File) => {
    try {
      if (!isWavMp3(file)) { setError(`"${file.name}" isn't a WAV or MP3 file.`); return; }
      let id: string | undefined; try { id = await cacheFile(file); } catch { id = undefined; }
      const cut = await setBuffer(i, file, file.name, id);
      setError(!id ? `"${file.name}" plays, but couldn't be saved on this device (storage full or blocked).` : cut ? `"${file.name}" was cut to 30 s (samples are capped at 30 seconds).` : "");
    } catch { setError("Could not read that audio file. Try WAV or MP3."); }
  }, [setBuffer]);
  const loadById = useCallback(async (i: number, id: string, name: string) => {
    try { const b = await getSampleBlob(id); if (!b) throw 0; await setBuffer(i, b, name, id); setError(""); return true; }
    catch { setError(`Sample "${name}" not found on this device.`); return false; }
  }, [setBuffer]);
  const loadSelectedId = useCallback((id: string, name: string) => { void loadById(selectedRef.current, id, name); }, [loadById]);
  // Folder load: cache everything; files whose name contains a pad name go onto that pad.
  const loadFolder = useCallback(async (files: File[]) => {
    const audio = files.filter(isWavMp3);
    let matched = 0, unsaved = 0;
    const names = slotsRef.current.map(x => x.name.toLowerCase().replace(/\s+/g, ""));
    const used = new Set<number>();
    for (const f of audio) {
      let saved = true; try { await cacheFile(f); } catch { saved = false; unsaved++; }
      const fn = f.name.toLowerCase().replace(/[\s_-]+/g, "");
      const i = names.findIndex((n, k) => !used.has(k) && n && fn.includes(n));
      if (i >= 0) { used.add(i); try { await setBuffer(i, f, f.name, saved ? cacheId(f) : undefined); matched++; } catch { /* skip */ } }
    }
    setError(!audio.length ? "No audio files in that folder." : unsaved ? `${unsaved} of ${audio.length} files couldn't be saved on this device (storage full or blocked).` : "");
    return { total: audio.length, matched, saved: audio.length - unsaved };
  }, [setBuffer]);
  const loadSelected = useCallback((file: File) => { void loadSample(selectedRef.current, file); }, [loadSample]);
  // Cycle off -> hit -> tie -> off. A tie needs a hit or tie before it, otherwise it goes straight to off.
  const toggleStep = useCallback((row: number, col: number) => setPattern(p => p.map((r, i) => (i === row ? r.map((v, j) => {
    if (j !== col) return v;
    if (v === 0) return 1; if (v >= 2) return 0; return col > 0 && r[col - 1] !== 0 ? 2 : 0;
  }) : r))), []);
  // Mod rows live on each slot per pattern bank, so A/B can automate differently.
  const editLane = useCallback((row: number, f: (l: ModLane) => ModLane) => { snap(); setSlots(s => s.map((x, j) => (j === row ? { ...x, mods: x.mods.map((l, b) => (b === bankRef.current ? f(l) : l)) } : x))); }, [snap]);
  const setModValue = useCallback((row: number, col: number, v: number) => editLane(row, l => ({ ...l, on: true, values: l.values.map((x, k) => (k === col ? v : x)) })), [editLane]);
  const setModTarget = useCallback((row: number, target: string) => editLane(row, l => ({ ...l, on: target !== "off", target: target === "off" ? l.target : target })), [editLane]);
  const setStepValue = useCallback((kind: "vel" | "chance" | "ratchet", row: number, col: number, v: number) => editBank(b => ({ ...b, [kind]: (b[kind] ?? ones()).map((r, j) => (j === row ? r.map((x, k) => (k === col ? v : x)) : r)) })), [editBank]);
  // Row fader: one value for every lit step in a row (current bank).
  const setRowValue = useCallback((kind: "vel" | "chance" | "ratchet", row: number, v: number) => { const pat = banksRef.current[bankRef.current].pattern[row]; editBank(b => ({ ...b, [kind]: (b[kind] ?? ones()).map((r, j) => (j === row ? r.map((x, k) => (pat[k] ? v : x)) : r)) })); }, [editBank]);
  const setTrackLength = useCallback((row: number, len: number) => setLengths(l => l.map((v, i) => (i === row || performanceRef.current.lenLock ? len : v))), []);
  /** Clears one row of the current pattern: notes plus its velocity, chance and roll values (mod lane kept). */
  const clearRow = useCallback((row: number) => { snap(); editBank(b => ({ ...b, pattern: b.pattern.map((r, i) => i === row ? r.map(() => 0 as StepVal) : r), vel: b.vel.map((r, i) => i === row ? r.map(() => 1) : r), chance: b.chance.map((r, i) => i === row ? r.map(() => 1) : r), ratchet: (b.ratchet ?? ones()).map((r, i) => i === row ? r.map(() => 1) : r) })); }, [editBank, snap]);
  const selectBank = useCallback((b: number) => {
    if (b === bankRef.current) { queuedRef.current = null; setQueued(null); return; }
    if (Tone.getTransport().state === "started") { queuedRef.current = b; setQueued(b); }
    else { bankRef.current = b; setBank(b); }
  }, []);
  const copyBank = useCallback(() => { snap(); setBanks(bs => { const src = bs[bankRef.current], dst = (bankRef.current + 1) % bs.length; return bs.map((b, i) => (i !== dst ? b : { pattern: src.pattern.map(r => [...r]), lengths: [...src.lengths], vel: src.vel.map(r => [...r]), chance: src.chance.map(r => [...r]), ratchet: (src.ratchet ?? ones()).map(r => [...r]) })); }); }, [snap]);
  const setLevel = useCallback((i: number, level: number) => updateSlot(i, { level }), [updateSlot]);
  const toggleMute = useCallback((i: number) => setSlots(s => s.map((x, j) => (j === i ? { ...x, mute: !x.mute } : x))), []);
  const unmuteAll = useCallback(() => setSlots(s => s.some(x => x.mute) ? s.map(x => ({ ...x, mute: false })) : s), []);
  const toggleSolo = useCallback((i: number) => setSlots(s => s.map((x, j) => (j === i ? { ...x, solo: !x.solo } : x))), []);
  const clearSolo = useCallback(() => setSlots(s => s.map(x => ({ ...x, solo: false }))), []);
  // Sets: a full snapshot of sounds, effects, phrases, both patterns, tempo and volume. Loaded audio files aren't stored.
  const getSet = useCallback((name: string): GrooveSet => ({ v: 2, name, savedAt: Date.now(), bpm: bpmRef.current, tune: tuneRef.current, harmony: harmonyRef.current, volume, bank: bankRef.current, banks: banksRef.current, slots: slotsRef.current, performance: { ...performanceRef.current, mode: 0 } }), [volume]);
  const applySet = useCallback((st: GrooveSet) => {
    for (let k = 0; k < 16; k++) cancelBooked(k); holds.current.clear(); idle();
    setPerformance({ ...defaultPerformance(), ...st.performance, mode: 0 });
    const d = defaultSlots(), old = (st.v ?? 1) < 2;
    setSlots(d.map((x, i) => { const o = st.slots?.[i]; if (!o) return x; const oldSynth = o.synth ?? x.synth; const pitchEnvShape = oldSynth.pitchEnvShape ?? { a: .001, d: oldSynth.pitchDecay ?? .05, s: 0, r: .02 }; const filterEnvShape = oldSynth.filterEnvShape ?? { a: .001, d: oldSynth.filterDecay ?? .2, s: 0, r: .02 }; return { ...x, ...o, drum: { ...x.drum, ...o.drum }, synth: { ...x.synth, ...oldSynth, pitchEnvShape, filterEnvShape }, sampler: { ...x.sampler, ...o.sampler }, arp: { ...x.arp, ...o.arp }, chord: { ...x.chord, ...o.chord }, poly: { ...x.poly, ...o.poly }, bass: { ...x.bass, ...o.bass }, siren: { ...defaultSiren(), ...o.siren }, eq: { ...x.eq, ...o.eq }, mods: padMods(o.mods ?? x.mods), fx: o.fx ?? x.fx }; }).map((x, i) => (old || !st.slots?.[i] ? migrateSlot(x) : x)));
    setHarmonyState({ ...defaultHarmony(), ...st.harmony });
    if (st.banks?.length) setBanks(Array.from({ length: NBANKS }, (_, i) => (st.banks![i] ? fixBank(st.banks![i]) : makeBank(emptyPattern()))));
    undoRef.current = []; redoRef.current = []; setHist(h => h + 1);
    bankRef.current = st.bank ?? 0; setBank(bankRef.current); queuedRef.current = null; setQueued(null);
    setBpm(st.bpm ?? 124); setTune(st.tune ?? 0); setVolume(st.volume ?? 60);
    buffers.current = Array(16).fill(null); setPeaks(Array(16).fill(peaksOf(fallbackBuf())));
    // Restore every sample, then report all the missing ones together instead of only the last.
    const jobs = (st.slots ?? []).map((o, i) => (o?.sampler?.sampleId ? loadById(i, o.sampler.sampleId, o.sampler.sampleName).then(ok => (ok ? null : o.sampler.sampleName)) : Promise.resolve(null)));
    void Promise.all(jobs).then(r => { const miss = r.filter((x): x is string => !!x); if (miss.length > 1) setError(`${miss.length} samples not found on this device: ${miss.slice(0, 3).join(", ")}${miss.length > 3 ? "…" : ""}`); });
  }, [loadById]);
  const restore = (from: { current: Snap[] }, to: { current: Snap[] }) => { const sn = from.current.pop(); if (!sn) return; to.current.push({ banks: banksRef.current, mods: slotsRef.current.map(x => x.mods) }); lastSnap.current = 0; setBanks(sn.banks); setSlots(sl => sl.map((x, i) => ({ ...x, mods: sn.mods[i] ?? x.mods }))); setHist(h => h + 1); };
  const undo = () => restore(undoRef, redoRef), redo = () => restore(redoRef, undoRef);
  const canUndo = hist >= 0 && undoRef.current.length > 0, canRedo = hist >= 0 && redoRef.current.length > 0;
  const clearPattern = () => setPattern(emptyPattern());
  // RAND acts on the page in view: NOTE writes hits; VEL/CHNC/ROLL/MOD only reshape existing hits in the current bank.
  const randomizePattern = (view = "note") => {
    if (view === "note") { setPattern(emptyPattern().map((r, i) => r.map(() => (Math.random() < (i < 3 ? 0.3 : 0.1) ? 1 : 0) as StepVal))); return; }
    const pat = banksRef.current[bankRef.current].pattern;
    if (view === "mod") { snap(); setSlots(sl => sl.map((x, r) => { const l = x.mods[bankRef.current]; if (!l?.on) return x; return { ...x, mods: x.mods.map((m, b) => (b === bankRef.current ? { ...m, values: m.values.map((v, c) => (pat[r]?.[c] ? Math.round(Math.random() * 100) / 100 : v)) } : m)) }; })); return; }
    const kind = view === "roll" ? "ratchet" : view === "vel" ? "vel" : "chance";
    const gen = () => kind === "vel" ? Math.round((.35 + Math.random() * .65) * 100) / 100 : kind === "chance" ? (Math.random() < .55 ? 1 : Math.round((.4 + Math.random() * .55) * 100) / 100) : (Math.random() < .25 ? ROLLS[1 + Math.floor(Math.random() * 3)] : 1);
    editBank(b => ({ ...b, [kind]: (b[kind] ?? ones()).map((row, r) => row.map((v, c) => (pat[r]?.[c] === 1 ? gen() : v))) }));
  };
  // The default kit's bundled samples load straight away (decoding works before audio is started).
  const loadKitSamples = useCallback(() => { defaultSlots().forEach((x, i) => { if (x.engine === "sampler" && x.sampler.sampleId) void loadById(i, x.sampler.sampleId, x.sampler.sampleName); }); }, [loadById]);
  useEffect(() => { loadKitSamples(); }, [loadKitSamples]);
  const newBlank = () => { const t = Tone.getTransport(); interrupted.current = false; t.stop(); skip.current.clear(); lastTick.current = null; for (let k = 0; k < 16; k++) cancelBooked(k); setStep(-1); setPlaying(false); setPaused(false); setPerformance(defaultPerformance()); setSlots(blankSlots()); setBanks(Array.from({ length: NBANKS }, () => makeBank(emptyPattern()))); bankRef.current = 0; setBank(0); queuedRef.current = null; setQueued(null); setSelected(0); buffers.current = Array(16).fill(null); setPeaks(Array(16).fill(peaksOf(fallbackBuf()))); };
  const resetAll = () => { setPerformance(defaultPerformance()); setSlots(defaultSlots().map(migrateSlot)); setBanks([defaultBank(), makeBank(emptyPattern()), makeBank(emptyPattern()), makeBank(emptyPattern())]); bankRef.current = 0; setBank(0); queuedRef.current = null; setQueued(null); setBpm(124); setVolume(60); buffers.current = Array(16).fill(null); setPeaks(Array(16).fill(peaksOf(fallbackBuf()))); loadKitSamples(); };

  return { undo, redo, canUndo, canRedo, harmony, setHarmony, engine, ensure, repeat, setRepeat, setPadVel, rec, setRec, vel, chance, ratchet: banks[bank].ratchet ?? ones(), setStepValue, setRowValue, performance, setPerformance, getSet, applySet, bank, queued, selectBank, copyBank, setLevel, toggleMute, unmuteAll, toggleSolo, clearSolo, slots, pattern, lengths, setTrackLength, clearRow, selected, playing, paused, togglePause, newBlank, step, bpm, tune, setTune, volume, padRefs, peaks, error, release, eco, latency, meter, resetMeter, getFxLevels, getMasterDyn, getChannelLevels, getSlotWave, getSlotSpectrum, setEco, setSelected, setBpm, setVolume, togglePlay, hit, updateSlot, updateSelected, loadSample, loadSelected, loadSelectedId, loadFolder, toggleStep, setModValue, setModTarget, clearPattern, randomizePattern, resetAll };
}

export type GrooveSet = { v: 1 | 2; harmony?: Harmony; name: string; savedAt: number; bpm: number; tune?: number; volume: number; bank: number; banks: (Partial<Bank> & { pattern: StepVal[][] })[]; slots: Slot[]; performance?: PerformanceParams };
