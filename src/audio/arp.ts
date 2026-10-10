// Per-pad phrase sequencer data. Step pitch is stored as a scale degree, so every note stays in key
// and changing the scale re-maps the phrase instead of producing wrong notes.
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  "pent maj": [0, 2, 4, 7, 9],
  "pent min": [0, 3, 5, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  "harm min": [0, 2, 3, 5, 7, 8, 11],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
} as const;
export type ScaleName = keyof typeof SCALES;
export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const RATES = { "1/8": 0.5, "1/8T": 1 / 3, "1/16": 0.25, "1/16T": 1 / 6, "1/32": 0.125, "1/32T": 1 / 12, "1/64": 0.0625 } as const;
export type RateName = keyof typeof RATES;

/** slide: glide into this note from the previous one (acid portamento) instead of re-attacking. */
export type ArpStep = { on: boolean; deg: number; vel: number; gate: number; slide?: boolean };
export type ArpParams = { on: boolean; root: number; scale: ScaleName; octave: number; steps: number; sync: boolean; rate: RateName; freeMs: number; cells: ArpStep[]; glide?: number; mode?: "run" | "step"; loop?: PhraseLoop };
/** Repeat the first or last `len` steps `times` times before moving on (times 1 = off). */
export type PhraseLoop = { where: "first" | "last"; len: number; times: number };

/** Play order of cell indexes with the loop expanded; shared by the scheduler and the editor. */
export function phraseOrder(a: Pick<ArpParams, "steps" | "loop">): number[] {
  const n = Math.max(1, a.steps), all = Array.from({ length: n }, (_, i) => i), l = a.loop;
  if (!l || l.times <= 1) return all;
  const len = Math.max(1, Math.min(n, l.len)), seg = l.where === "first" ? all.slice(0, len) : all.slice(n - len);
  const rep = Array.from({ length: l.times }, () => seg).flat();
  return l.where === "first" ? [...rep, ...all.slice(len)] : [...all.slice(0, n - len), ...rep];
}

/** Degree span offered in the step pitch picker: two octaves of the scale plus the top root. */
export const degreeCount = (scale: ScaleName) => SCALES[scale].length * 2 + 1;
/** Semitones above the root for a scale degree (wraps into higher octaves). */
export function degreeToSemi(scale: ScaleName, deg: number) {
  const sc = SCALES[scale], n = sc.length;
  return Math.floor(deg / n) * 12 + sc[((deg % n) + n) % n];
}
export const midiOf = (a: ArpParams, deg: number) => (a.octave + 1) * 12 + a.root + degreeToSemi(a.scale, deg);
export const noteName = (midi: number) => `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
export function stepSeconds(a: ArpParams, bpm: number) { return a.sync ? (60 / bpm) * RATES[a.rate] : a.freeMs / 1000; }

export const defaultArp = (o: Partial<ArpParams> = {}): ArpParams => ({
  on: false, root: 9, scale: "minor", octave: 3, steps: 8, sync: true, rate: "1/16", freeMs: 150, glide: 80,
  cells: Array.from({ length: 16 }, (_, i) => ({ on: [0, 2, 3, 5, 6].includes(i % 8), deg: [0, 0, 2, 4, 4, 3, 7, 4][i % 8], vel: i % 4 === 0 ? 1 : 0.75, gate: 0.5 })),
  ...o,
});

/** Rolls a new in-key phrase: keeps root/scale/octave/steps, favours small melodic moves and downbeats. */
export function randomizeArp(a: ArpParams): ArpParams {
  const span = degreeCount(a.scale), n = SCALES[a.scale].length;
  let deg = Math.floor(Math.random() * n);
  const cells = a.cells.map((_, i) => {
    const on = i === 0 || Math.random() < (i % 4 === 0 ? 0.9 : 0.62);
    if (Math.random() < 0.25) deg = [0, n, 4 % n][Math.floor(Math.random() * 3)];
    else deg = Math.max(0, Math.min(span - 1, deg + Math.floor(Math.random() * 5) - 2));
    return { on, deg, vel: i % 4 === 0 ? 0.85 + Math.random() * 0.15 : 0.45 + Math.random() * 0.4, gate: [0.25, 0.5, 0.5, 0.75, 1][Math.floor(Math.random() * 5)], slide: i > 0 && Math.random() < 0.15 };
  });
  return { ...a, cells };
}
