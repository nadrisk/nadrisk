import { memo } from "react";
import { Tap } from "@/pixel/PixelScreen";
import { Panel, ms, pct, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";
import type { Px } from "@/pixel/draw";
import { PAD_PRESETS } from "@/audio/padPresets";
import { padFromPreset, padParams, padPreset, type PadParams } from "@/audio/pad";
import { FX_DEFS } from "@/audio/effects";
import { CHORDS } from "@/audio/musical";
import { useNoteKnob } from "@/components/harmonyKnob";

const CT = Object.keys(CHORDS) as (keyof typeof CHORDS)[];
const sg = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v)}`;
const CAT = (n: string) => /VOX|CHOIR/.test(n) ? "VOX" : /STR|SOLINA|SAW/.test(n) ? "STRG" : /BELL|CELESTE|FM/.test(n) ? "BELL" : /STAB/.test(n) ? "STAB" : "ATMS";

const PAGES = ["PRST", "MCRO", "NOTE", "CHRD", "ENV"] as const;
const cell = (i: number) => ({ x: 2 + (i % 2) * 63, y: 20 + Math.floor(i / 2) * 7, w: 61, h: 7 });

/** PAD: 90s atmospheric pads. Pick a preset, shape it with four macros, play it from the XY pad. */
function PadPanel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const d = padParams(slot.pad), home = padFromPreset(d.preset);
  const noteK = useNoteKnob(slot, onChange), ch = slot.chord, C = (q: Partial<typeof ch>) => onChange({ chord: { ...ch, ...q } });
  const D = (q: Partial<PadParams>) => onChange({ pad: { ...d, ...q } });
  const load = (i: number) => {
    const r = padPreset(i), fx = slot.fx.map(f => f.type === "reverb" ? { ...f, on: true, params: { ...f.params, size: r.verb.size, mix: r.verb.mix, damp: r.verb.damp } } : f);
    if (!fx.some(f => f.type === "reverb")) fx.push({ id: Date.now() % 1e9 + Math.floor(Math.random() * 1000), type: "reverb", on: true, params: { ...Object.fromEntries(Object.entries(FX_DEFS.reverb.params).map(([k, v]) => [k, v[0]])), size: r.verb.size, mix: r.verb.mix, damp: r.verb.damp } });
    onChange({ name: r.name.slice(0, 10), pad: padFromPreset(i), fx });
  };
  const K = (label: string, short: string, key: Exclude<keyof PadParams, "preset" | "oct" | "coct"> | "oct" | "coct", min: number, max: number, step: number, fmt: (v: number) => string, log = false): Knob =>
    ({ label: `PAD ${label}`, short, value: d[key] ?? 0, min, max, step, fmt, log, reset: home[key], set: v => D({ [key]: v }) });
  const knobs = (page: string): Knob[] => page === "PRST" ? []
    : page === "NOTE" ? [noteK, K("octave", "OCT", "oct", -3, 3, 1, sg)]
    : page === "CHRD" ? [{ label: "PAD chord on", short: "CHRD", value: ch.on ? 1 : 0, min: 0, max: 1, step: 1, reset: 0, fmt: v => v ? "ON" : "OFF", set: v => C({ on: v >= .5 }) },
      { label: "PAD chord type", short: "VOI", value: Math.max(0, CT.indexOf(ch.type)), min: 0, max: CT.length - 1, step: 1, reset: 3, fmt: v => CT[Math.round(v)].toUpperCase(), set: v => C({ type: CT[Math.round(v)] }) },
      { label: "PAD chord inversion", short: "INV", value: ch.inversion, min: 0, max: 4, step: 1, reset: 0, fmt: v => `${Math.round(v)}`, set: v => C({ inversion: Math.round(v) }) },
      K("chord octave", "C-OCT", "coct", -2, 2, 1, sg)]
    : page === "MCRO" ? [K("bright", "BRT", "bright", 0, 1, .01, pct), K("motion", "MOTN", "motion", 0, 1, .01, pct), K("space", "SPCE", "space", 0, 1, .01, pct), K("age", "AGE", "age", 0, 1, .01, pct)]
    : [K("attack", "ATK", "atk", .002, 6, .001, ms, true), K("release", "REL", "rel", .05, 8, .01, ms, true)];
  const body = (p: Px, page: string) => {
    const r = padPreset(d.preset), num = `P:${String(d.preset + 1).padStart(2, "0")}`;
    // ROMpler LCD header: inverse ROM badge, patch number, category.
    p.rect(2, 11, 124, 8); p.text("ROM:90", 4, 13, false); p.text(num, 34, 13, false); p.text(r.name, 56, 13, false);
    if (page === "PRST") { PAD_PRESETS.forEach((q, i) => { const c = cell(i), on = i === d.preset; if (on) p.rect(c.x, c.y, c.w, c.h); else p.box(c.x, c.y, c.w, c.h); p.text(`${String(i + 1).padStart(2, "0")} ${q.name.slice(0, 11)}`, c.x + 2, c.y + 1, !on); }); return; }
    // Architecture strip: TONE layers, TVF, TVA, SP-12 badge lit when AGE > 0.
    const badge = (t: string, x: number, on: boolean) => { const w = t.length * 4 + 3; if (on) { p.rect(x, 21, w, 7); p.text(t, x + 2, 22, false); } else { p.box(x, 21, w, 7); p.text(t, x + 2, 22); } return x + w + 2; };
    let bx = badge(CAT(r.name), 2, true); bx = badge("TONE", bx, true); bx = badge("TVF", bx, d.bright > 0 || d.motion > 0); bx = badge("TVA", bx, true); badge("SP12", bx, d.age > 0);
    const lay = r.layers.slice(0, 2).map((l, i) => `O${i + 1}:${l.table.toUpperCase()}${sg(l.oct)}`).join(" ");
    p.text(lay, 4, 30);
    if (page === "NOTE" || page === "CHRD") {
      const chord = ch.on ? `${ch.type.toUpperCase()} I${ch.inversion} C${sg(d.coct ?? 0)}` : "CHORD OFF";
      p.text(`OCT ${sg(d.oct ?? 0)}`, 4, 38); p.text(chord, 124 - chord.length * 4, 38); return;
    }
    if (page === "MCRO") {
      // Slow cloud: wave height = BRIGHT, wobble = MOTION, spread = SPACE, broken dots = AGE.
      const amp = 1 + d.bright * 4, w = 1 + d.motion * 3, spread = 1 + Math.round(d.space * 3);
      for (let l = 0; l < spread; l++) for (let x = 4; x < 124; x++) { const y = Math.round(40 + Math.sin(x / (9 + l * 3) + l) * amp * (1 - l * .18) + Math.sin(x / 3) * w * .4);
        if (d.age > .05 && ((x * 7 + l * 13) % 11) / 11 < d.age * .5) continue; p.dot(x, Math.max(37, Math.min(45, y))); }
      return;
    }
    const tot = d.atk + 1 + d.rel, sx = (s: number) => 4 + Math.round(s / tot * 118), top = 37, bot = 45, sus = padPreset(d.preset).s;
    const sy = bot - Math.round(sus * (bot - top));
    p.line(4, bot, sx(d.atk), top); p.line(sx(d.atk), top, sx(d.atk + .3), sy); p.line(sx(d.atk + .3), sy, sx(d.atk + 1), sy); p.line(sx(d.atk + 1), sy, 122, bot);
    const lab = `A ${ms(d.atk)} R ${ms(d.rel)}`; p.text(lab, 124 - lab.length * 4, 30);
  };
  const extra = (page: string) => page === "PRST" ? <>{PAD_PRESETS.map((r, i) => { const c = cell(i); return <Tap key={r.name} x={c.x} y={c.y} w={c.w} h={c.h} label={`PAD preset ${r.name}`} pressed={i === d.preset} onClick={() => load(i)} />; })}</> : null;
  return <Panel name={slot.name || "PAD"} pages={PAGES} label="PAD" knobs={knobs} body={body} extra={extra} deps={[slot.name, d]} />;
}
export default memo(PadPanel);
