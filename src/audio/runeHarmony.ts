// Progressions for the rune sequencer, resolved in the global KEY/SCL (harmony.ts).
import { degreeToSemi, type ScaleName } from "./arp";
import type { Harmony } from "./harmony";

export const PROGS = { "i-VI-III-VII": [0, 5, 2, 6], "i-iv-v": [0, 3, 4], "i-VII-VI-V": [0, 6, 5, 4], "drone i": [0], "ii-V-I": [1, 4, 0] } as const;
export type ProgName = keyof typeof PROGS;
export const PROG_NAMES = Object.keys(PROGS) as ProgName[];

const scaleOf = (h: Harmony): ScaleName => (h.scale === "off" ? "minor" : h.scale);
/** Chord index playing at a step: the progression is spread evenly over the pattern. */
export const chordAt = (prog: ProgName, step: number, total: number) => { const p = PROGS[prog]; return p[Math.min(p.length - 1, Math.floor((step / total) * p.length))]; };
/** Bass root, semitones above the key root (always the chord root; never below it). */
export const rootSemi = (h: Harmony, deg: number) => ((degreeToSemi(scaleOf(h), deg) % 12) + 12) % 12;
/** Triad tones (semitones above key root) of a scale degree. */
export const chordTones = (h: Harmony, deg: number) => { const s = scaleOf(h); return [0, 2, 4].map(o => degreeToSemi(s, deg + o) - (degreeToSemi(s, deg) - rootSemi(h, deg))).map(x => x % 24); };
