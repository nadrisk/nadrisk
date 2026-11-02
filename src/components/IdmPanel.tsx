import { memo } from "react";
import { Tap, Zone } from "@/pixel/PixelScreen";
import { Panel, hz, ms, pct, st, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";
import { IDM_INIT, IDM_KNOBS, IDM_LABEL, IDM_MODELS, idmParams, type IdmParams } from "@/audio/idm";

// IDM: experimental drum synth. Model keys on top, MODL page (tune + 3 model knobs), ENV page (decay, bend, grit, drive).
function IdmPanel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const d = idmParams(slot.idm), home = IDM_INIT[d.model], names = IDM_KNOBS[d.model];
  const D = (q: Partial<IdmParams>) => onChange({ idm: { ...d, ...q } });
  const K = (label: string, short: string, key: Exclude<keyof IdmParams, "model" | "preset">, min: number, max: number, step: number, fmt: (v: number) => string, log = false): Knob =>
    ({ label: `IDM ${label}`, short, value: d[key], min, max, step, fmt, log, reset: home[key], set: v => D({ [key]: v }) });
  const knobs = (page: string): Knob[] => page === "MODL"
    ? [K(names[0].toLowerCase(), names[0], "tune", 20, 12000, 1, hz, true), K(names[1].toLowerCase(), names[1], "a", 0, 1, .01, pct), K(names[2].toLowerCase(), names[2], "b", 0, 1, .01, pct), K(names[3].toLowerCase(), names[3], "c", 0, 1, .01, pct)]
    : [K("decay", "DEC", "decay", .01, 3, .005, ms), K("bend", "BEND", "bend", -48, 48, 1, st), K("grit", "GRIT", "grit", 0, 1, .01, pct), K("drive", "DRV", "drive", 0, 1, .01, pct)];
  const body = (p: import("@/pixel/draw").Px, page: string) => {
    IDM_MODELS.forEach((m, i) => { const x = 2 + i * 31; p.box(x, 10, 29, 9); if (m === d.model) p.invert(x + 1, 11, 27, 7); p.textC(IDM_LABEL[m], x + 15, 12, m !== d.model); });
    p.box(2, 20, 124, 25);
    if (page === "MODL") {
      // Model sketch: the partials / modes / impulse / chopped bursts this model makes.
      if (d.model === "metl") [1, 1.483, 2.17].forEach((r, k) => { const x = 6 + Math.round(Math.min(1, Math.log2(d.tune * r / 20) / 10) * 110); for (let j = 0; j < 3; j++) { const sx = x + Math.round((j - 1) * (2 + d.b * 6)); const h = Math.round(16 * (j === 1 ? 1 : d.a)); p.rect(sx, 43 - h, 2, h); } if (k === 0) p.line(4, 42, 4 + Math.round(d.c * 120), 42); });
      else if (d.model === "ping") [1, 1.594, 2.136, 2.653].forEach((r, k) => { const x = 10 + Math.round((r - 1) * 60), h = Math.round(20 * (1 - d.c) ** k); p.rect(x, 43 - h, 2 + Math.round((1 - d.a) * 3), h); });
      else if (d.model === "clik") { const w = 2 + Math.round(d.a * 40); for (let i = 0; i < w; i++) { const h = Math.round(20 * (1 - i / w)); p.rect(6 + i, 43 - h, 1, h); } p.text(d.b > .05 ? "CRSH" : "PURE", 70, 26); }
      else { const n = 4 + Math.round(d.a * 24), gw = Math.max(1, Math.floor(118 / n / 2)); for (let i = 0; i < n; i++) { const h = Math.round(8 + 12 * ((i * 37) % 7) / 7 * (1 - i / n)); p.rect(5 + Math.round(i * 118 / n), 43 - h, gw, h); } }
    } else {
      const w = Math.max(3, Math.round(d.decay / 3 * 110)); let prev = 22;
      for (let i = 0; i <= 118; i++) { const y = i < w ? 22 + Math.round(20 * (i / w) ** .5) : 43; if (i) p.line(4 + i, prev, 5 + i, y); prev = y; }
      if (d.bend) { const y0 = d.bend > 0 ? 23 : 41; p.line(4, y0, 30, 32); }
      p.text(`DEC ${ms(d.decay)}`, 70, 23);
    }
  };
  const extra = (page: string) => <>
    {IDM_MODELS.map((m, i) => <Tap key={m} x={2 + i * 31} y={10} w={29} h={9} label={`IDM model ${IDM_LABEL[m]}`} pressed={m === d.model} onClick={() => m !== d.model && onChange({ idm: { model: m, ...IDM_INIT[m] } })} />)}
    {page === "ENV" && <Zone x={2} y={20} w={124} h={25} horizontal label="IDM decay drag" value={d.decay} min={.01} max={3} step={.005} reset={home.decay} onChange={decay => D({ decay })} />}
  </>;
  return <Panel name={slot.name || "IDM"} pages={["MODL", "ENV"]} label="IDM drum" knobs={knobs} body={body} extra={extra} deps={[slot.name, d]} />;
}
export default memo(IdmPanel);
