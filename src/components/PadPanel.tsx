import { memo } from "react";
import { Tap } from "@/pixel/PixelScreen";
import { Panel, ms, pct, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";
import type { Px } from "@/pixel/draw";
import { PAD_PRESETS } from "@/audio/padPresets";
import { padFromPreset, padParams, padPreset, type PadParams } from "@/audio/pad";
import { FX_DEFS } from "@/audio/effects";

const PAGES = ["PRST", "MCRO", "ENV"] as const;
const cell = (i: number) => ({ x: 2 + (i % 2) * 63, y: 11 + Math.floor(i / 2) * 8, w: 61, h: 8 });

/** PAD: 90s atmospheric pads. Pick a preset, shape it with four macros, play it from the XY pad. */
function PadPanel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const d = padParams(slot.pad), home = padFromPreset(d.preset);
  const D = (q: Partial<PadParams>) => onChange({ pad: { ...d, ...q } });
  const load = (i: number) => {
    const r = padPreset(i), fx = slot.fx.map(f => f.type === "reverb" ? { ...f, on: true, params: { ...f.params, size: r.verb.size, mix: r.verb.mix, damp: r.verb.damp } } : f);
    if (!fx.some(f => f.type === "reverb")) fx.push({ id: Date.now() % 1e9 + Math.floor(Math.random() * 1000), type: "reverb", on: true, params: { ...Object.fromEntries(Object.entries(FX_DEFS.reverb.params).map(([k, v]) => [k, v[0]])), size: r.verb.size, mix: r.verb.mix, damp: r.verb.damp } });
    onChange({ name: r.name.slice(0, 10), pad: padFromPreset(i), fx });
  };
  const K = (label: string, short: string, key: Exclude<keyof PadParams, "preset">, min: number, max: number, step: number, fmt: (v: number) => string, log = false): Knob =>
    ({ label: `PAD ${label}`, short, value: d[key], min, max, step, fmt, log, reset: home[key], set: v => D({ [key]: v }) });
  const knobs = (page: string): Knob[] => page === "PRST" ? []
    : page === "MCRO" ? [K("bright", "BRT", "bright", 0, 1, .01, pct), K("motion", "MOTN", "motion", 0, 1, .01, pct), K("space", "SPCE", "space", 0, 1, .01, pct), K("age", "AGE", "age", 0, 1, .01, pct)]
    : [K("attack", "ATK", "atk", .002, 6, .001, ms, true), K("release", "REL", "rel", .05, 8, .01, ms, true)];
  const body = (p: Px, page: string) => {
    if (page === "PRST") { PAD_PRESETS.forEach((r, i) => { const c = cell(i), on = i === d.preset; p.box(c.x, c.y, c.w, c.h); if (on) p.rect(c.x + 1, c.y + 1, c.w - 2, c.h - 2); p.text(r.name.slice(0, 14), c.x + 3, c.y + 2, !on); }); return; }
    p.box(2, 11, 124, 34);
    if (page === "MCRO") {
      // Slow cloud: wave height = BRIGHT, wobble = MOTION, spread = SPACE, broken dots = AGE.
      const amp = 4 + d.bright * 10, w = 1 + d.motion * 3, spread = 1 + Math.round(d.space * 3);
      for (let l = 0; l < spread; l++) for (let x = 4; x < 124; x++) { const y = Math.round(28 + Math.sin(x / (9 + l * 3) + l) * amp * (1 - l * .18) + Math.sin(x / 3) * w * .4);
        if (d.age > .05 && ((x * 7 + l * 13) % 11) / 11 < d.age * .5) continue; p.dot(x, Math.max(12, Math.min(44, y))); }
      p.text(padPreset(d.preset).name, 4, 13); return;
    }
    const tot = d.atk + 1 + d.rel, sx = (s: number) => 4 + Math.round(s / tot * 118), top = 15, bot = 43, sus = padPreset(d.preset).s;
    const sy = bot - Math.round(sus * (bot - top));
    p.line(4, bot, sx(d.atk), top); p.line(sx(d.atk), top, sx(d.atk + .3), sy); p.line(sx(d.atk + .3), sy, sx(d.atk + 1), sy); p.line(sx(d.atk + 1), sy, 122, bot);
    const lab = `A ${ms(d.atk)} R ${ms(d.rel)}`; p.text(lab, 124 - lab.length * 4, 13);
  };
  const extra = (page: string) => page === "PRST" ? <>{PAD_PRESETS.map((r, i) => { const c = cell(i); return <Tap key={r.name} x={c.x} y={c.y} w={c.w} h={c.h} label={`PAD preset ${r.name}`} pressed={i === d.preset} onClick={() => load(i)} />; })}</> : null;
  return <Panel name={slot.name || "PAD"} pages={PAGES} label="PAD" knobs={knobs} body={body} extra={extra} deps={[slot.name, d]} />;
}
export default memo(PadPanel);
