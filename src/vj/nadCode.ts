// NAD patch text for the CODE overlay: one line per pad, `$01 kick.ukg |> x . . . x . . .  cut 0.42 rev .30`.
import type { DocPad } from "./bus";
import { noteName } from "./raster";

export type CodeLine = { text: string; pad?: number; muted?: boolean; hi?: number };

const FX_SHORT: [RegExp, string][] = [[/rev|room|verb/i, "rev"], [/del|dly|tape|echo/i, "eco"], [/crush|bit/i, "bit"], [/dist|drive|sat|clip/i, "drv"], [/hack|glitch/i, "hak"], [/chor|flang|phas/i, "phs"]];
const ENG: Record<string, string> = { drum: "drm", idm: "prc", synth: "syn", "808": "bas", sampler: "smp", pad: "pad" };
const two = (v: number) => v.toFixed(2).replace(/^0/, "");
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 6) || "x";

/** Cell glyph per step: x hit, X loud hit, ? chance hit, = tie, . rest. */
export function stepGlyph(p: DocPad, i: number) {
  const v = p.steps[i] ?? 0;
  if (v >= 2) return "=";
  if (v !== 1) return ".";
  if ((p.chance[i] ?? 1) < .995) return "?";
  return (p.vel[i] ?? 1) > .85 ? "X" : "x";
}

export function codeLines(pads: DocPad[], step: number, bank: string, bpm: number, running = true): CodeLine[] {
  const solo = pads.some(p => p.solo);
  const out: CodeLine[] = [{ text: `nad.rack[${bank}] @ ${Math.round(bpm)}bpm ${running ? ">>" : "||"}` }];
  if (!pads.length) { out.push({ text: "$-- idle |> . . . . . . . . . . . . . . . ." }); return out; }
  for (const p of pads) {
    const len = Math.max(1, p.len || p.steps.length || 16), cur = ((step % len) + len) % len, page = Math.floor(cur / 16) * 16;
    const cells = Array.from({ length: 16 }, (_, i) => page + i < len ? stepGlyph(p, page + i) : " ");
    const who = p.engine === "drum" || p.engine === "idm" ? `${p.kind === "tone" ? ENG[p.engine] ?? "pad" : p.kind}.${slug(p.name)}` : `${ENG[p.engine] ?? slug(p.engine)}.${noteName(p.note).toLowerCase()}`;
    const head = `$${String(p.index + 1).padStart(2, "0")} ${who.padEnd(12).slice(0, 12)} |> `;
    const tail: string[] = [];
    if (Number.isFinite(p.cut) && (p.cut as number) < 16000) tail.push(`cut ${two(Math.min(1, Math.log2(Math.max(40, p.cut!) / 40) / 9))}`);
    for (const f of p.fx) { const s = FX_SHORT.find(([r]) => r.test(f.type)); if (s && f.mix > .02 && !tail.some(t => t.startsWith(s[1]))) tail.push(`${s[1]} ${two(Math.min(1, f.mix))}`); }
    out.push({ text: head + cells.join(" ") + (tail.length ? "  " + tail.slice(0, 2).join(" ") : ""), pad: p.index, muted: p.mute || (solo && !p.solo), hi: running ? head.length + (cur - page) * 2 : undefined });
  }
  return out;
}
