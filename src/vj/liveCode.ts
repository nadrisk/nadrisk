// Live-code text layer: every pad that plays becomes a Strudel-style line whose mini-notation is built from the steps it actually hit.
import type { VjKind, VjPad } from "./bus";
import { noteName } from "./raster";

const DRUM: Partial<Record<VjKind, string>> = { kick: "bd", snare: "sd", hat: "hh", open: "oh", perc: "cp" };
const STALE = 8, COMMENT = 8, DROP = 16, TYPE_RATE = 60;

type Track = { pad: VjPad; kind: VjKind; tok: (string | null)[]; at: number[]; last: number; vel: number; flash: number; text: string; typed: number };
export type CodeLine = { text: string; typed: number; flash: number; span: [number, number] | null; comment: boolean };

export function token(kind: VjKind, pad?: VjPad) {
  const d = DRUM[kind]; if (d) return d;
  const n = pad?.notes?.[0]; return Number.isFinite(n) ? noteName(n as number).toLowerCase().replace("#", "s") : "c3";
}

/** Build line text plus the char span of each step token so the playhead can highlight it. */
export function lineText(t: Pick<Track, "pad" | "kind" | "tok" | "vel">, comment = false) {
  const head = `${comment ? "// " : ""}p${t.pad.index + 1}: `;
  const drum = !!DRUM[t.kind], open = drum ? 's("' : 'note("';
  let s = head + open; const spans: ([number, number] | null)[] = Array(16).fill(null);
  for (let g = 0; g < 4; g++) {
    const grp = t.tok.slice(g * 4, g * 4 + 4);
    if (g) s += " ";
    if (grp.every(x => !x)) { const a = s.length; s += "-"; for (let k = 0; k < 4; k++) spans[g * 4 + k] = [a, a + 1]; continue; }
    s += "[";
    grp.forEach((x, k) => { if (k) s += " "; const a = s.length; s += x ?? "-"; spans[g * 4 + k] = [a, s.length]; });
    s += "]";
  }
  s += '")';
  const eng = (t.pad.engine || "").toLowerCase();
  if (!drum) s += `.s("${eng || "syn"}")`;
  s += `.gain(${t.vel.toFixed(2)})`;
  return { text: s, spans };
}

export class LiveCode {
  tracks = new Map<number, Track>();

  hit(kind: VjKind, vel: number, pad: VjPad | undefined, step: number, beat: number) {
    if (!pad) return;
    let t = this.tracks.get(pad.index);
    if (!t) { t = { pad, kind, tok: Array(16).fill(null), at: Array(16).fill(-1e9), last: beat, vel, flash: 0, text: "", typed: 0 }; this.tracks.set(pad.index, t); }
    const i = ((Math.floor(step) % 16) + 16) % 16;
    t.pad = pad; t.kind = kind; t.tok[i] = token(kind, pad); t.at[i] = beat; t.last = beat; t.flash = 1;
    t.vel = Math.round((t.vel * .7 + vel * .3) * 20) / 20;
  }

  /** Advance typing / decay and return the lines to draw, sorted by pad. */
  lines(beat: number, step: number, dt: number): CodeLine[] {
    const out: CodeLine[] = [];
    for (const [k, t] of [...this.tracks].sort((a, b) => a[0] - b[0])) {
      const idle = beat - t.last;
      if (idle > DROP) { this.tracks.delete(k); continue; }
      t.tok = t.tok.map((x, i) => x && beat - t.at[i] > STALE ? null : x);
      const comment = idle > COMMENT;
      const { text, spans } = lineText(t, comment);
      if (text !== t.text) { let d = 0; while (d < text.length && text[d] === t.text[d]) d++; t.typed = Math.min(t.typed, d); t.text = text; }
      t.typed = Math.min(text.length, t.typed + dt * TYPE_RATE);
      t.flash = Math.max(0, t.flash - dt * 6);
      const i = ((Math.floor(step) % 16) + 16) % 16;
      out.push({ text, typed: Math.floor(t.typed), flash: t.flash, span: comment ? null : spans[i], comment });
    }
    return out;
  }
}
