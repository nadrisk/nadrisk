import type { ADSR } from "./voices";
import { degreeOf, degreeToSemi, type RateName, type ScaleName } from "./arp";
export const CHORDS = { major: [0, 4, 7], minor: [0, 3, 7], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], dom7: [0, 4, 7, 10], maj9: [0, 4, 7, 11, 14], min9: [0, 3, 7, 10, 14], "house m9": [0, 7, 10, 15, 26] } as const;
export type ChordPlay = "block" | "strum" | "arp";
export type ChordArp = "up" | "up2" | "down" | "down2" | "updown1" | "updown" | "order" | "random";
/** Crave-style arp modes in tap order; "updown" (legacy) is U/D2 without repeated ends. */
export const CHORD_ARPS: ChordArp[] = ["up", "up2", "down", "down2", "updown1", "updown", "order", "random"];
export const ARP_LABEL: Record<ChordArp, string> = { up: "UP1", up2: "UP2", down: "DN1", down2: "DN2", updown1: "U/D1", updown: "U/D2", order: "ORDR", random: "RND" };
export const CHORD_CORES = ["power", "major", "minor", "sus2", "sus4", "dim", "aug"] as const;
export const CHORD_EXTS = ["off", "6", "7", "9", "11"] as const;
export type ChordCore = typeof CHORD_CORES[number];
export type ChordExt = typeof CHORD_EXTS[number];
export type ChordParams = { on: boolean; type: keyof typeof CHORDS; core?: ChordCore; ext?: ChordExt; inversion: number; spread: boolean; play?: ChordPlay; arp?: ChordArp; rate?: RateName; strum?: number; fit?: "scale" | "fixed"; /** FOLD mode; legacy sets saved it as lead. */ fold?: boolean; lead?: boolean };
export const defaultChord = (): ChordParams => ({ on: false, type: "min7", inversion: 0, spread: false, play: "block", arp: "up", rate: "1/16", strum: 30 });
/** Old voicings stay exact until either new dial is edited. */
export function chordSelection(p: ChordParams): { core: ChordCore; ext: ChordExt } {
  const saved = p.ext as string | undefined, ext = saved === "maj7" ? "7" : saved === "maj9" ? "9" : p.ext;
  return { core: p.core ?? (p.type.startsWith("min") || p.type === "house m9" ? "minor" : "major"),
    ext: ext ?? (p.type === "major" || p.type === "minor" ? "off" : p.type.endsWith("9") ? "9" : "7") };
}
const CORE_NOTES: Record<ChordCore, number[]> = { power: [0, 7], major: [0, 4, 7], minor: [0, 3, 7], sus2: [0, 2, 7], sus4: [0, 5, 7], dim: [0, 3, 6], aug: [0, 4, 8] };
const EXT_NOTES: Record<ChordExt, number[]> = { off: [], "7": [10], "9": [10, 14], "6": [9], "11": [10, 14, 17] };
/** Uninverted shape; scale degrees keep power/suspended cores and extensions independent. */
export function chordShape(p: ChordParams, scale?: ScaleName, root = 0): number[] {
  if (!p.on) return [0];
  const legacy = p.core === undefined && p.ext === undefined;
  const { core, ext } = chordSelection(p);
  const degree = scale ? degreeOf(scale, root) : null;
  if (scale && degree !== null) {
    const ds = legacy ? Array.from({ length: CHORDS[p.type].length }, (_, i) => i * 2)
      : [...(core === "power" ? [0, 4] : core === "sus2" ? [0, 1, 4] : core === "sus4" ? [0, 3, 4] : [0, 2, 4]),
        ...(ext === "off" ? [] : ext === "6" ? [5] : ext === "7" ? [6] : ext === "11" ? [6, 8, 10] : [6, 8])];
    return ds.map(d => degreeToSemi(scale, degree + d) - root);
  }
  return legacy ? [...CHORDS[p.type]] : [...CORE_NOTES[core], ...EXT_NOTES[ext]].sort((a, b) => a - b);
}
export function chordNotes(p: ChordParams, scale?: ScaleName, root = 0): number[] {
  if (!p.on) return [0];
  const notes = chordShape(p, scale, root);
  for (let i = 0; i < Math.min(p.inversion, notes.length - 1); i++) { const first = notes.shift(); if (first !== undefined) notes.push(first + 12); }
  return notes.map((n, i) => n + (p.spread && i % 2 ? 12 : 0)).sort((a, b) => a - b);
}
/** Which chord note an arpeggio plays on its k-th step. */
export function arpIndex(mode: ChordArp, k: number, n: number) {
  if (n <= 1) return 0;
  if (mode === "down") return n - 1 - (k % n);
  if (mode === "updown") { const c = 2 * n - 2, x = k % c; return x < n ? x : c - x; }
  if (mode === "updown1") { const c = 2 * n, x = k % c; return x < n ? x : c - 1 - x; }
  if (mode === "random") return Math.floor(Math.random() * n);
  return k % n;
}
/** Note an arp plays on its k-th step; UP2/DN2 run the chord over two octaves, ORDR keeps chord-shape order. */
export function arpNote(mode: ChordArp, k: number, notes: readonly number[], shape?: readonly number[]): number {
  if (mode === "up2" || mode === "down2") { const two = [...notes, ...notes.map(x => x + 12)], n = two.length; return two[mode === "up2" ? k % n : n - 1 - (k % n)]; }
  if (mode === "order") { const o = shape && shape.length === notes.length ? shape : notes; return o[k % o.length]; }
  return notes[arpIndex(mode, k, notes.length)];
}
export type ModLane = { on: boolean; target: string; targets?: string[]; steps: number; values: number[]; /** Pitch lanes: 24 = two octaves, exact notes (keyboard step recording). */ range?: number };
export const defaultMod = (): ModLane => ({ on: false, target: "cutoff", steps: 16, values: Array(64).fill(.5) });
/** Each lane stores A–D consecutively; copy all destination lanes without sharing step arrays. */
export function copyBankMods(mods: ModLane[], source: number, destination: number, banks = 4): ModLane[] {
  return mods.map((lane, index) => {
    if (index % banks !== destination) return lane;
    const from = mods[Math.floor(index / banks) * banks + source] ?? defaultMod();
    return { ...from, values: [...from.values], ...(from.targets ? { targets: [...from.targets] } : {}) };
  });
}
export const scaledEnv = (e: ADSR, factor: number): ADSR => ({ a: Math.max(.001, e.a * factor), d: Math.max(.001, e.d * factor), s: e.s, r: Math.max(.005, e.r * factor) });
