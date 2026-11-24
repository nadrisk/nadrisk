// Progressions for the rune sequencer, resolved in the global KEY/SCL (harmony.ts).
import { degreeToSemi, type ScaleName } from "./arp";
import type { Harmony } from "./harmony";

export const PROGS = { "i-VI-III-VII": [0, 5, 2, 6], "i-iv-v": [0, 3, 4], "i-VII-VI-V": [0, 6, 5, 4], "drone i": [0], "ii-V-I": [1, 4, 0] } as const;
export type ProgName = keyof typeof PROGS;
export const PROG_NAMES = Object.keys(PROGS) as ProgName[];

const scaleOf = (h: Harmony): ScaleName => (h.scale === "off" ? "minor" : h.scale);
/** Chord index playing at a step: the progression is spread evenly over the pattern. */
export type ProgDegrees = readonly number[];
/** Custom progressions: 1-8 chords, each a scale degree 0-6. */
export const MAX_PROG = 8;
export const DEGREE_NAMES = ["I", "II", "III", "IV", "V", "VI", "VII"];
export const chordAt = (prog: ProgName | ProgDegrees, step: number, total: number) => { const p: ProgDegrees = typeof prog === "string" ? PROGS[prog] : prog.length ? prog : [0]; return p[Math.min(p.length - 1, Math.floor((step / total) * p.length))]; };
/** Bass root, semitones above the key root (always the chord root; never below it). */
export const rootSemi = (h: Harmony, deg: number) => ((degreeToSemi(scaleOf(h), deg) % 12) + 12) % 12;
/** Triad tones (semitones above key root) of a scale degree. */
export const chordTones = (h: Harmony, deg: number) => { const s = scaleOf(h); return [0, 2, 4].map(o => degreeToSemi(s, deg + o) - (degreeToSemi(s, deg) - rootSemi(h, deg))).map(x => x % 24); };

/** Absolute MIDI note of a role's root register: bass sits around C1–C2, arp around C4–C5; OCT shifts by octaves. */
export function roleRegister(role: string, key: number, oct = 0): number {
  const base = role === "bass" ? 24 : role === "arp" ? 60 : 48;
  return base + (((key % 12) + 12) % 12) + oct * 12;
}
