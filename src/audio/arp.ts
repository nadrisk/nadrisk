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
export type ArpParams = { on: boolean; root: number; scale: ScaleName; octave: number; steps: number; sync: boolean; rate: RateName; freeMs: number; cells: ArpStep[]; glide?: number; mode?: "run" | "step"; loop?: PhraseLoop; /** Play direction through the phrase steps. */ dir?: PhraseDir; /** SPRD: RAND step size 0..1. */ spread?: number; trance?: TranceParams & { on?: boolean }; eucl?: EuclParams; /** CHRD: phrase notes snap to the pad chord tones. */ chordSync?: boolean };
/** Legacy loop (ignored on playback, kept so old sets type-check). */
export type PhraseLoop = { where: "first" | "last"; len: number; times: number };

export const PHRASE_DIRS = ["fwd", "rev", "pp", "rnd"] as const;
export type PhraseDir = typeof PHRASE_DIRS[number];
/** Play order of cell indexes for the phrase direction; shared by the scheduler and the editor. */
export function phraseOrder(a: Pick<ArpParams, "steps" | "dir">, rnd: () => number = Math.random): number[] {
  const n = Math.max(1, a.steps), all = Array.from({ length: n }, (_, i) => i);
  switch (a.dir) {
    case "rev": return all.reverse();
    case "pp": return n < 3 ? all : [...all, ...all.slice(1, -1).reverse()];
    case "rnd": { for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; } return all; }
    default: return all;
  }
}

/** CHRD walk: n-th walked note through the chord tones, climbing an octave each full round (two octaves, then wraps). */
export function chordWalk(tones: readonly number[], n: number): number {
  if (!tones.length) return 0;
  const t = [...tones].sort((x, y) => x - y), len = t.length, k = ((n % (len * 2)) + len * 2) % (len * 2);
  return t[k % len] + 12 * Math.floor(k / len);
}
/** Chord-walk steps above "a" for each trance INTV (OCT, 5TH, M7, M3). */
export const intvWalkSteps = (spread: number, len: number) => [len, 2, 3, 1][Math.max(0, Math.min(3, Math.round(spread)))];

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

/** Rolls a new in-key phrase. SPRD (a.spread 0..1) sets the largest move between notes, from one scale step to two octaves.
 *  A note never repeats more than twice in a row and the phrase uses at least 3 different notes. */
/** 303/STING-style RAND: a syncopated rhythm skeleton with rests, root/octave gravity on strong steps, weighted
 *  5th/m3/m7 colour notes, call-and-response halves, discrete octave-up jumps, and accents/slides tied to the line. */
const ACID_RHYTHMS = [
  "x.xx.x.xx.x.xx.x", "x..x..x.x..x..x.", "xx.x.xx.xx.x.x.x", "x.x.xx.x.xx.x.xx",
  "x..xx.x.x..xx.xx", ".xx.x.xx.xx.x.x.", "x.xxx..xx.x.x..x", "x..x.xx..x.x.xx.",
];
export function randomizeArp(a: ArpParams, rnd: () => number = Math.random): ArpParams {
  const span = degreeCount(a.scale), n = SCALES[a.scale].length, oct = Math.min(n, span - 1);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length) % xs.length];
  const wpick = (ws: [number, number][]) => { let t = rnd() * ws.reduce((s, w) => s + w[1], 0); for (const [v, w] of ws) if ((t -= w) <= 0) return v; return ws[0][0]; };
  const d = (semi: number) => Math.min(span - 1, nearestDegree(a.scale, semi));
  const root = 0, fifth = d(7), m3 = d(3), m7 = d(10), second = d(2), fourth = d(5);
  const colour: [number, number][] = [[root, 3], [fifth, 3], [m3, 2.5], [m7, 2], [fourth, 1], [second, .8]];
  const strong: [number, number][] = [[root, 5], [fifth, 1.5], [m3, 1]];
  const rhythm = pick(ACID_RHYTHMS), len = a.cells.length;
  // Call: an 8-step motif. Response: same rhythm, varied pitches, resolving toward the root.
  const motif: ArpStep[] = Array.from({ length: 8 }, (_, i) => {
    const on = rhythm[i] === "x" || i === 0;
    const base = i % 4 === 0 ? wpick(strong) : wpick(colour);
    const up = i % 2 === 1 && rnd() < .28 && base + oct < span;
    return { on, deg: up ? base + oct : base, vel: .55 + rnd() * .2, gate: .35, slide: false };
  });
  const cells: ArpStep[] = Array.from({ length: len }, (_, i) => {
    const m = motif[i % 8], half = Math.floor(i / 8) % 2, pos = i % 16;
    const c: ArpStep = { ...m, on: rhythm[pos] === "x" || pos === 0 };
    if (half === 1) {
      if (rnd() < .35) c.deg = pos % 4 === 0 ? wpick(strong) : wpick(colour);
      else if (rnd() < .25 && c.deg + oct < span && c.deg < oct) c.deg += oct;
      if (pos >= 14 && rnd() < .6) c.deg = rnd() < .5 ? root : Math.min(oct, span - 1);
    }
    return c;
  });
  // Accents on syncopated hits and big leaps; slides join consecutive notes, mostly on leaps, with legato gates.
  for (let i = 0; i < len; i++) {
    const c = cells[i]; if (!c.on) continue;
    const next = cells[(i + 1) % len], leap = next.on && Math.abs(next.deg - c.deg) >= Math.max(2, n - 2);
    if ((i % 2 === 1 && rnd() < .45) || rnd() < .15) c.vel = .85 + rnd() * .15;
    if (i < len - 1 && next.on && rnd() < (leap ? .5 : .14)) { c.slide = true; c.gate = 1; c.vel = Math.max(c.vel, .85); }
    else c.gate = rnd() < .2 ? .75 : .35;
  }
  // Guarantee at least 3 distinct pitches among the played steps.
  const played = cells.slice(0, a.steps).map((c, i) => c.on ? i : -1).filter(i => i >= 0);
  const used = new Set(played.map(i => cells[i].deg));
  for (let j = played.length - 1; used.size < Math.min(3, played.length) && j > 0; j--) {
    const c = cells[played[j]], base = cells[played[j - 1]].deg;
    for (let d = 1; d < span; d++) { const cand = [base + d, base - d].find(x => x >= 0 && x < span && !used.has(x)); if (cand !== undefined) { used.add(cand); c.deg = cand; break; } }
  }
  return { ...a, cells };
}

/** Exact scale degree whose pitch is `semi` above the root, or null when `semi` is off-scale. */
export function degreeOf(scale: ScaleName, semi: number): number | null {
  const n = SCALES[scale].length, oct = Math.floor(semi / 12), idx = SCALES[scale].indexOf((((semi % 12) + 12) % 12) as never);
  return idx < 0 ? null : oct * n + idx;
}
/** In-key stacked-thirds chord offsets (relative to `semi`), or null when the scale can't define one
 *  (chromatic scale or an off-scale pitch) so the caller keeps the chord's fixed shape instead. */
export function scaleChordOffsets(scale: ScaleName, semi: number, size: number): number[] | null {
  if (scale === "chromatic") return null;
  const d = degreeOf(scale, semi); if (d === null) return null;
  const base = degreeToSemi(scale, d);
  return Array.from({ length: size }, (_, k) => degreeToSemi(scale, d + k * 2) - base);
}
/** True when every interval of `shape`, built on `semi`, lands on a note of the scale. */
export const shapeInScale = (scale: ScaleName, semi: number, shape: readonly number[]) => shape.every(o => degreeOf(scale, semi + o) !== null);

/** TRANCE generator settings stored with the phrase; writing cells keeps the scheduler unchanged.
 *  `spread` is the upper-note interval index (INTV_NAMES). */
export type TranceParams = { pattern: number; density: number; spread: number; gate: number };
export const TRANCE_PATTERNS = ["332", "PUSH", "GALL", "ROLL"] as const;
export const INTV_NAMES = ["OCT", "5TH", "M7", "M3"] as const;
const INTV_SEMI = [12, 7, 10, 3];
export const defaultTrance = (): TranceParams => ({ pattern: 0, density: 1, spread: 0, gate: .5 });
/** Two-note 16th rhythms: a = root, b = upper note, . = rest. Named after the rhythm itself. */
export const TRANCE_RHYTHMS: Record<typeof TRANCE_PATTERNS[number], string> = {
  "332": "ab.ab.abab.ab.ab", // 3+3+2 groups, twice per bar
  PUSH: ".ab.ab.a.ab.ab.b", // off-beat pushes ahead of each beat
  GALL: "abb.abb.abb.abba", // gallop: one low, two high
  ROLL: ".abb.abb.abb.abb", // rolling off-beat with the downbeat left to the kick
};
/** Scale degree nearest to `semi` semitones above the root. */
export function nearestDegree(scale: ScaleName, semi: number) {
  let best = 0, err = 99; for (let d = 0; d <= SCALES[scale].length; d++) { const e = Math.abs(degreeToSemi(scale, d) - semi); if (e < err) { err = e; best = d; } } return best;
}
/** Writes a two-note rhythm into 16 cells. DENS drops weak steps first (never the first a/b of each group). */
export function trancePhrase(scale: ScaleName, t: TranceParams): ArpStep[] {
  const pat = TRANCE_RHYTHMS[TRANCE_PATTERNS[Math.max(0, Math.min(3, Math.round(t.pattern)))]];
  const up = nearestDegree(scale, INTV_SEMI[Math.max(0, Math.min(3, Math.round(t.spread)))] ?? 12);
  const weight = (i: number) => i % 4 === 0 ? 1 : i % 2 === 0 ? .66 : .33;
  return Array.from({ length: 16 }, (_, i) => {
    const ch = pat[i], hit = ch !== ".", lead = hit && (i === 0 || pat[i - 1] === ".");
    const on = hit && (lead || weight(i) > 1 - t.density - .01);
    return { on, deg: ch === "b" ? up : 0, vel: ch === "a" ? 1 : .8, gate: t.gate, slide: false };
  });
}

/** Euclidean rhythm on the phrase: HITS spread evenly over STPS (Bjorklund), rotated by ROT. Notes are kept. */
export type EuclParams = { on: boolean; hits: number; steps: number; rot: number; gate: number };
export const defaultEucl = (): EuclParams => ({ on: false, hits: 5, steps: 8, rot: 0, gate: .5 });
/** True Bjorklund: repeatedly pairs the remainder groups with the leading groups (Euclid's algorithm on sequences), so
 * the hits come out maximally even, e.g. 5/8 = x.xx.xx. (cinquillo). Patterns always start on a hit before rotation. */
export function bjorklund(hits: number, steps: number): boolean[] {
  const n = Math.max(1, Math.min(64, Math.round(steps))), k = Math.max(0, Math.min(n, Math.round(hits)));
  if (k === 0) return Array(n).fill(false);
  let a: boolean[][] = Array.from({ length: k }, () => [true]), b: boolean[][] = Array.from({ length: n - k }, () => [false]);
  while (b.length > 1) {
    const m = Math.min(a.length, b.length), na = Array.from({ length: m }, (_, i) => [...a[i], ...b[i]]);
    const rest = a.length > m ? a.slice(m) : b.slice(m);
    a = na; b = rest;
  }
  return [...a, ...b].flat();
}
export function euclid(hits: number, steps: number, rot = 0): boolean[] {
  const base = bjorklund(hits, Math.min(16, steps)), n = base.length;
  const r = ((Math.round(rot) % n) + n) % n;
  return base.map((_, i) => base[(i - r + n) % n]);
}
export function applyEucl(a: ArpParams, e: EuclParams): ArpParams {
  const on = euclid(e.hits, e.steps, e.rot);
  return { ...a, eucl: e, steps: on.length, cells: a.cells.map((c, i) => i < on.length ? { ...c, on: on[i], gate: e.gate } : c) };
}

/** Snaps `semi` to the nearest chord tone (tones are offsets from the pad root, repeated every octave). */
export function lockToChord(semi: number, tones: readonly number[]): number {
  if (!tones.length) return semi;
  let best = semi, err = 99;
  for (let o = -3; o <= 4; o++) for (const t of tones) { const c = t + o * 12, e = Math.abs(c - semi); if (e < err || (e === err && c < best)) { err = e; best = c; } }
  return best;
}

/** SPRD live: scales a step's degree around the phrase root (0.5 = as written, 0 = all root, 1 = twice as wide). Stored cells never change. */
export const spreadDeg = (deg: number, spread = .5) => Math.max(0, Math.round(deg * Math.max(0, spread) * 2));
