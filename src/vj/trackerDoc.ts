// Groovebox → NAD tracker matrix. Pure: pads in, one column per pad and 16 step rows out.
import type { DocPad } from "./bus";
import { groupOf, padWord } from "./codeDoc";

export type TrackCol = { pad: number; title: string; group: string; muted: boolean };
export type TrackDoc = { header: string; cols: TrackCol[]; rows: { step: number; cells: string[] }[]; page: number };
const NOTES = ["C-", "C#", "D-", "D#", "E-", "F-", "F#", "G-", "G#", "A-", "A#", "B-"];
export const trackerNote = (p: DocPad) => groupOf(p) === "drums" ? padWord(p).toUpperCase().padEnd(3, "-") : `${NOTES[((p.note % 12) + 12) % 12]}${Math.floor(p.note / 12) - 1}`;
export const hex = (v: number) => Math.round(Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0)) * 127).toString(16).toUpperCase().padStart(2, "0");
const GROUP: Record<string, string> = { drums: "DRM", bass: "BAS", synth: "SYN", samples: "SMP" };

/** Cell: NOTE VEL FLAG ("BD- 7F?"), tie "--- -- ", rest "··· ·· ". */
export function cell(p: DocPad, i: number) {
  const v = p.steps[i];
  if (v === 1) return `${trackerNote(p)} ${hex(p.vel[i] ?? 1)}${(p.chance[i] ?? 1) < .995 ? "?" : " "}`;
  return v >= 2 ? "|   |  " : "··· ·· ";
}

export function trackerDoc(pads: DocPad[], bpm: number, bank: string, tick: number): TrackDoc {
  const solo = pads.some(p => p.solo), page = Math.max(0, Math.floor(Math.max(0, tick) / 16));
  const cols = pads.map(p => ({ pad: p.index, title: `${GROUP[groupOf(p)]}${String(p.index + 1).padStart(2, "0")}`, group: groupOf(p), muted: p.mute || (solo && !p.solo) }));
  const rows = Array.from({ length: 16 }, (_, r) => {
    const step = page * 16 + r;
    return { step: r, cells: pads.map(p => { const n = Math.max(1, p.steps.length); return cell(p, step % n); }) };
  });
  return { header: `NAD.TRACK // BANK ${bank} // ${Math.round(bpm)} BPM // ${pads.length} CH`, cols, rows, page };
}
