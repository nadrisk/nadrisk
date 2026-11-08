import { memo } from "react";
import { Tap } from "@/pixel/PixelScreen";
import { Panel, ms, pct, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";
import type { Px } from "@/pixel/draw";
import { PAD_PRESETS } from "@/audio/padPresets";
import { padFromPreset, padParams, padPreset, type PadParams } from "@/audio/pad";
import { useNoteKnob } from "@/components/harmonyKnob";

const sg = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v)}`;
const CAT = (n: string) => /E-PNO|RHODES| EP$/.test(n) ? "EPNO" : /PNO|MKS|JAZZ/.test(n) ? "PNO" : /VOX|CHOIR/.test(n) ? "VOX" : /STR|SOLINA|SAW/.test(n) ? "STRG" : /BELL|CELESTE|FM/.test(n) ? "BELL" : /STAB/.test(n) ? "STAB" : "ATMS";

const PAGES = ["PRST", "ENV"] as const;
const N = PAD_PRESETS.length;
/** Wrapping DEC/INC step through the preset bank. */
export const stepPreset = (i: number, dir: number) => ((i + dir) % N + N) % N;
const DEC = { x: 2, y: 20, w: 12, h: 11 }, INC = { x: 114, y: 20, w: 12, h: 11 };

/** PAD: 90s atmospheric pads. Pick a preset, shape it with four macros, play it from the XY pad. */
function PadPanel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const d = padParams(slot.pad), home = padFromPreset(d.preset);
  const noteK = useNoteKnob(slot, onChange);
  const D = (q: Partial<PadParams>) => onChange({ pad: { ...d, ...q } });
  const load = (i: number) => {
    const r = padPreset(i);
    onChange({ name: r.name.slice(0, 10), pad: padFromPreset(i) });
  };
  const K = (label: string, short: string, key: Exclude<keyof PadParams, "preset" | "oct" | "coct"> | "oct" | "coct", min: number, max: number, step: number, fmt: (v: number) => string, log = false): Knob =>
    ({ label: `PAD ${label}`, short, value: d[key] ?? 0, min, max, step, fmt, log, reset: home[key], set: v => D({ [key]: v }) });
  const knobs = (page: string): Knob[] => page === "PRST" ? [noteK, K("octave", "OCT", "oct", -3, 3, 1, sg), K("bright", "BRT", "bright", 0, 1, .01, pct), K("age", "AGE", "age", 0, 1, .01, pct)]
    : [K("attack", "ATK", "atk", .002, 6, .001, ms, true), K("release", "REL", "rel", .05, 8, .01, ms, true)];
  const body = (p: Px, page: string) => {
    const r = padPreset(d.preset);
    if (page === "PRST") {
      // JV-1080 LCD: bank/number/category, big patch name between DEC/INC, tone boxes.
      p.text(`PR-A:${String(d.preset + 1).padStart(3, "0")}`, 3, 12); const cat = `(${CAT(r.name)})`; p.text(cat, 125 - cat.length * 4, 12);
      p.box(DEC.x, DEC.y, DEC.w, DEC.h); p.text("<", DEC.x + 5, DEC.y + 3); p.box(INC.x, INC.y, INC.w, INC.h); p.text(">", INC.x + 5, INC.y + 3);
      p.rect(16, 20, 96, 11); p.text(r.name, 64 - r.name.length * 2, 23, false);
      p.text("TONE", 3, 36); for (let i = 0; i < 4; i++) { const x = 22 + i * 9; if (i < r.layers.length) p.rect(x, 35, 7, 7); else p.box(x, 35, 7, 7); }
      const oc = `OCT ${sg(d.oct ?? 0)}${d.age > 0 ? " SP12" : ""}`; p.text(oc, 125 - oc.length * 4, 36);
      return;
    }
    const tot = d.atk + 1 + d.rel, sx = (s: number) => 4 + Math.round(s / tot * 118), top = 20, bot = 44, sy = bot - Math.round(r.s * (bot - top));
    p.line(4, bot, sx(d.atk), top); p.line(sx(d.atk), top, sx(d.atk + .3), sy); p.line(sx(d.atk + .3), sy, sx(d.atk + 1), sy); p.line(sx(d.atk + 1), sy, 122, bot);
    const lab = `A ${ms(d.atk)} R ${ms(d.rel)}`; p.text(lab, 3, 12);
  };
  const extra = (page: string) => page === "PRST" ? <>
    <Tap x={DEC.x} y={DEC.y} w={DEC.w} h={DEC.h} label="PAD previous preset" onClick={() => load(stepPreset(d.preset, -1))} />
    <Tap x={INC.x} y={INC.y} w={INC.w} h={INC.h} label="PAD next preset" onClick={() => load(stepPreset(d.preset, 1))} /></> : null;
  return <Panel name={slot.name || "PAD"} pages={PAGES} label="PAD" knobs={knobs} body={body} extra={extra} deps={[slot.name, d]} />;
}
export default memo(PadPanel);
