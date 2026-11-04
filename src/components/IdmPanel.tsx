import { memo } from "react";
import { Tap, Zone } from "@/pixel/PixelScreen";
import { Panel, hz, ms, pct, st, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";
import type { Px } from "@/pixel/draw";
import { IDM_INIT, IDM_KNOBS, IDM_LABEL, IDM_MAX_DECAY, IDM_MIN_DECAY, IDM_MODELS, idmParams, type IdmParams } from "@/audio/idm";

const KW = 24, kx = (i: number) => 2 + i * (KW + 1);
const r01 = (i: number) => { const x = Math.sin(i * 91.7 + 13.1) * 43758.5; return x - Math.floor(x); };

/** One hit drawn large: amplitude shape (attack spike, DEC fall; GRIT stair-steps it, DRV fattens it) plus a separate pitch strip for BEND. */
function drawHit(p: Px, d: IdmParams) {
  const X0 = 4, X1 = 124, top = 22, bot = 37, W = X1 - X0;
  const len = Math.max(2, Math.round((d.decay / IDM_MAX_DECAY) * (W - 6))), pw = .35 + (1 - d.drive) * 1.6, lv = d.grit > 0 ? Math.max(2, Math.round(16 - d.grit * 13)) : 0;
  for (let i = 0; i <= W; i++) {
    let a = i === 0 ? 1 : i > len ? 0 : (1 - i / len) ** pw * Math.exp(-3 * i / len) * 1.15;
    a = Math.min(1, a); if (lv) a = Math.round(a * lv) / lv;
    const h = Math.round(a * (bot - top)); if (h > 0) p.rect(X0 + i, bot - h, 1, h);
  }
  p.line(X0, bot + 1, X1, bot + 1);
  // Decay end marker; the value sits top-right where the fallen shape never reaches.
  const ex = Math.min(X1, X0 + len); for (let y = top + 8; y <= bot; y += 2) p.dot(ex, y);
  const lab = `DEC ${ms(d.decay)}`; p.text(lab, X1 - lab.length * 4, top);
  // Pitch strip: flat line = no bend; slope shows where the pitch starts relative to TUNE.
  const my = 42, span = Math.max(3, Math.round(len * .35)), dy = Math.round(Math.max(-1, Math.min(1, d.bend / 48)) * 3);
  p.text("P", X0, 40); p.line(X0 + 5, my - dy, X0 + 5 + span, my); p.line(X0 + 5 + span, my, X1, my, true);
}

// IDM: experimental percussion. Model keys on top, MODL page (tune + 3 model knobs), ENV page (decay, bend, grit, drive).
function IdmPanel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const d = idmParams(slot.idm), home = IDM_INIT[d.model], names = IDM_KNOBS[d.model];
  const D = (q: Partial<IdmParams>) => onChange({ idm: { ...d, ...q } });
  const K = (label: string, short: string, key: Exclude<keyof IdmParams, "model" | "preset">, min: number, max: number, step: number, fmt: (v: number) => string, log = false): Knob =>
    ({ label: `PRC ${label}`, short, value: d[key], min, max, step, fmt, log, reset: home[key], set: v => D({ [key]: v }) });
  const knobs = (page: string): Knob[] => page === "MODL"
    ? [{ ...K(names[0].toLowerCase(), names[0], "tune", 20, 12000, .05, noteCents, true), bare: true }, K(names[1].toLowerCase(), names[1], "a", 0, 1, .01, pct), K(names[2].toLowerCase(), names[2], "b", 0, 1, .01, pct), K(names[3].toLowerCase(), names[3], "c", 0, 1, .01, pct)]
    : [K("decay", "DEC", "decay", IDM_MIN_DECAY, IDM_MAX_DECAY, .001, ms), K("bend", "BEND", "bend", -48, 48, 1, st), K("grit", "GRIT", "grit", 0, 1, .01, pct), K("drive", "DRV", "drive", 0, 1, .01, pct)];
  const body = (p: Px, page: string) => {
    IDM_MODELS.forEach((m, i) => { const x = kx(i); p.box(x, 10, KW, 9); if (m === d.model) p.invert(x + 1, 11, KW - 2, 7); p.textC(IDM_LABEL[m], x + KW / 2, 12, m !== d.model); });
    p.box(2, 20, 124, 25);
    if (page === "ENV") { drawHit(p, d); return; }
    const fx = (f: number) => 4 + Math.round(Math.max(0, Math.min(1, Math.log2(f / 20) / 10)) * 118), B = 43;
    if (d.model === "metl") {
      // Three partial clusters at their real frequencies; FM widens sidebands, RATIO spaces them, BRIT is the high-pass floor.
      [1, 1.483, 2.17].forEach(r => { const x = fx(d.tune * r); for (let j = -2; j <= 2; j++) { const sx = x + Math.round(j * (2 + d.b * 5)), h = Math.round((j ? d.a * (1 - Math.abs(j) * .3) : 1) * 18); if (h > 0) p.rect(sx, B - h, 2, h); } });
      const hx = fx(400 + d.c * 5000); for (let y = 22; y < B; y += 2) p.dot(hx, y);
    } else if (d.model === "zap") {
      // Pitch dive: starts SWP octaves above TUNE and lands in SPD time; FM adds a ripple on the line.
      const y0 = B - 2 - Math.round(d.a * 18), y1 = B - 2, w = 6 + Math.round((1 - d.b) * 100);
      let py = y0; for (let i = 1; i <= 118; i++) { const u = Math.min(1, i / w), y = Math.round(y1 + (y0 - y1) * (1 - u) ** 3 + (u < 1 ? Math.sin(i * 1.7) * d.c * 2.5 : 0)); p.line(3 + i, py, 4 + i, y); py = y; }
    } else if (d.model === "nois") {
      // Noise band: dots dense around TONE, width set by Q; SNAP is the tall spike on the left; CRKL breaks the dots into gaps.
      const cx = fx(d.tune), bw = 4 + Math.round((1 - d.b) * 40);
      for (let x = 4; x < 124; x++) { const k = Math.exp(-(((x - cx) / bw) ** 2)); for (let y = 22; y < B; y++) if (r01(x * 53 + y) < k * .8 * (1 - (y - 22) / 30) + .03 && r01(x * 7 + y * 3) > d.c * .7) p.dot(x, y); }
      const sh = Math.round(d.a * 20); if (sh) p.rect(4, B - sh, 2, sh);
    } else if (d.model === "clik") {
      const w = 2 + Math.round(d.a * 40); for (let i = 0; i < w; i++) { let h = 20 * (1 - i / w); if (d.b > .05) h = Math.round(h / (2 + (1 - d.b) * 6)) * (2 + (1 - d.b) * 6); h = Math.round(h); if (h > 0) p.rect(6 + i, B - h, 1, h); }
      const tx = fx(600 + d.c * 14000); for (let y = 22; y < B; y += 2) p.dot(tx, y);
    } else {
      const n = 4 + Math.round(d.a * 24), gw = Math.max(1, Math.floor(118 / n / 2)), lv = 2 + Math.round((1 - d.b) * 10);
      for (let i = 0; i < n; i++) { const h = Math.round((8 + 12 * r01(i) * (1 - i / n)) * lv / 12) * Math.round(12 / lv); if (h > 0) p.rect(5 + Math.round(i * 118 / n), B - Math.min(20, h), gw, Math.min(20, h)); }
    }
  };
  const extra = (page: string) => <>
    {IDM_MODELS.map((m, i) => <Tap key={m} x={kx(i)} y={10} w={KW} h={9} label={`PRC model ${IDM_LABEL[m]}`} pressed={m === d.model} onClick={() => m !== d.model && onChange({ idm: { model: m, ...IDM_INIT[m] } })} />)}
    {page === "ENV" && <Zone x={2} y={20} w={124} h={25} horizontal label="PRC decay drag" value={d.decay} min={IDM_MIN_DECAY} max={IDM_MAX_DECAY} step={.001} reset={home.decay} onChange={decay => D({ decay })} />}
  </>;
  return <Panel name={slot.name || "PRC"} pages={["MODL", "ENV"]} label="PRC drum" knobs={knobs} body={body} extra={extra} deps={[slot.name, d]} />;
}
export default memo(IdmPanel);
