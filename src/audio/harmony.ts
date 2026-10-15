// Global key + scale for the pads. Pad NOTE knobs snap to the scale, phrases walk the scale from the
// pad's note, and chords take the quality (maj/min/dim) of their degree, so pads build progressions.
import { NOTE_NAMES, SCALES, degreeOf, degreeToSemi, noteName, scaleChordOffsets, type ScaleName } from "./arp";

export type Harmony = { key: number; scale: ScaleName | "off" };
export const defaultHarmony = (): Harmony => ({ key: 0, scale: "off" });
export const HARMONY_SCALES: (ScaleName | "off")[] = ["off", "major", "minor", "dorian", "phrygian", "lydian", "mixolydian", "harm min", "pent maj", "pent min"];
export const harmonyOn = (h: Harmony): h is Harmony & { scale: ScaleName } => h.scale !== "off" && h.scale !== "chromatic";

/** Nearest in-scale MIDI note (ties go up). */
export function snapNote(h: Harmony, n: number) {
  if (!harmonyOn(h)) return Math.round(n);
  const r = Math.round(n);
  for (let d = 0; d < 12; d++) { if (degreeOf(h.scale, r + d - h.key) !== null) return r + d; if (degreeOf(h.scale, r - d - h.key) !== null) return r - d; }
  return r;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
/** Degree label for a note in the key: upper case major, lower case minor, ° diminished. */
export function degreeLabel(h: Harmony, n: number) {
  if (!harmonyOn(h)) return "";
  const d = degreeOf(h.scale, n - h.key); if (d === null) return "";
  const len = SCALES[h.scale].length, idx = ((d % len) + len) % len, r = ROMAN[idx] ?? String(idx + 1);
  const t = scaleChordOffsets(h.scale, n - h.key, 3);
  if (!t || len < 7) return r;
  return t[1] === 4 ? r : t[2] === 6 ? `${r.toLowerCase()}°` : r.toLowerCase();
}
export const noteLabel = (h: Harmony, n: number) => { const d = degreeLabel(h, n); return d ? `${d} ${noteName(n)}` : noteName(n); };

/** Semitones above the pad note for a phrase degree: with a key set the phrase walks the key's scale from the pad note. */
export function phraseSemi(h: Harmony, padNote: number, phraseScale: ScaleName, deg: number) {
  if (!harmonyOn(h)) return degreeToSemi(phraseScale, deg);
  const rel = snapNote(h, padNote) - h.key, d0 = degreeOf(h.scale, rel) ?? 0;
  return degreeToSemi(h.scale, d0 + deg) - (padNote - h.key);
}

/** In-key chord for a pad note (stacked thirds of the key's scale), or null when no key is set. */
export function keyChord(h: Harmony, midi: number, size: number) {
  if (!harmonyOn(h)) return null;
  return scaleChordOffsets(h.scale, snapNote(h, midi) - h.key, size);
}
export const keyName = (h: Harmony) => `${NOTE_NAMES[h.key]} ${h.scale === "off" ? "OFF" : h.scale.toUpperCase()}`;

/** Step pitch modulation: 0..1 maps to -12..+12 semitones around the pad note, snapped to the key like the NOTE knob. */
export function modPitchNote(h: Harmony, padNote: number, value: number, range = 12) {
  // Two-octave lanes come from keyboard step recording and keep the exact played note.
  if (range === 24) return padNote + Math.round((Math.min(1, Math.max(0, value)) - .5) * 48);
  const n = padNote + Math.round((Math.min(1, Math.max(0, value)) - .5) * 24);
  return Math.min(padNote + 12, Math.max(padNote - 12, snapNote(h, n)));
}
