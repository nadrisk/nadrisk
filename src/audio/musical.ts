import type { ADSR } from "./voices";
import type { RateName } from "./arp";
export const CHORDS = { major: [0, 4, 7], minor: [0, 3, 7], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], dom7: [0, 4, 7, 10], maj9: [0, 4, 7, 11, 14], min9: [0, 3, 7, 10, 14], "house m9": [0, 7, 10, 15, 26] } as const;
export type ChordPlay = "block" | "strum" | "arp";
export type ChordArp = "up" | "down" | "updown" | "random";
export type ChordParams = { on: boolean; type: keyof typeof CHORDS; inversion: number; spread: boolean; play?: ChordPlay; arp?: ChordArp; rate?: RateName; strum?: number; fit?: "scale" | "fixed" };
export const defaultChord = (): ChordParams => ({ on: false, type: "min7", inversion: 0, spread: false, play: "block", arp: "up", rate: "1/16", strum: 30 });
export function chordNotes(p: ChordParams): number[] { if (!p.on) return [0]; const notes: number[] = [...CHORDS[p.type]]; for (let i = 0; i < Math.min(p.inversion, notes.length - 1); i++) { const first = notes.shift(); if (first !== undefined) notes.push(first + 12); } return notes.map((n, i) => n + (p.spread && i % 2 ? 12 : 0)).sort((a, b) => a - b); }
/** Which chord note an arpeggio plays on its k-th step. */
export function arpIndex(mode: ChordArp, k: number, n: number) {
  if (n <= 1) return 0;
  if (mode === "down") return n - 1 - (k % n);
  if (mode === "updown") { const c = 2 * n - 2, x = k % c; return x < n ? x : c - x; }
  if (mode === "random") return Math.floor(Math.random() * n);
  return k % n;
}
export type ModLane = { on: boolean; target: string; steps: number; values: number[] };
export const defaultMod = (): ModLane => ({ on: false, target: "cutoff", steps: 16, values: Array(16).fill(.5) });
export const scaledEnv = (e: ADSR, factor: number): ADSR => ({ a: Math.max(.001, e.a * factor), d: Math.max(.001, e.d * factor), s: e.s, r: Math.max(.005, e.r * factor) });
