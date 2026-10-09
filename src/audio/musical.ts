import type { ADSR } from "./voices";
export const CHORDS = { major: [0, 4, 7], minor: [0, 3, 7], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], dom7: [0, 4, 7, 10], maj9: [0, 4, 7, 11, 14], min9: [0, 3, 7, 10, 14], "house m9": [0, 7, 10, 15, 26] } as const;
export type ChordParams = { on: boolean; type: keyof typeof CHORDS; inversion: number; spread: boolean };
export const defaultChord = (): ChordParams => ({ on: false, type: "min7", inversion: 0, spread: false });
export function chordNotes(p: ChordParams): number[] { if (!p.on) return [0]; const notes: number[] = [...CHORDS[p.type]]; for (let i = 0; i < Math.min(p.inversion, notes.length - 1); i++) { const first = notes.shift(); if (first !== undefined) notes.push(first + 12); } return notes.map((n, i) => n + (p.spread && i % 2 ? 12 : 0)); }
export type ModLane = { on: boolean; target: string; steps: number; values: number[] };
export const defaultMod = (): ModLane => ({ on: false, target: "cutoff", steps: 16, values: Array(16).fill(.5) });
export const scaledEnv = (e: ADSR, factor: number): ADSR => ({ a: Math.max(.001, e.a * factor), d: Math.max(.001, e.d * factor), s: e.s, r: Math.max(.005, e.r * factor) });
