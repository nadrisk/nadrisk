import { memo } from "react";
import { Tap, Zone } from "@/pixel/PixelScreen";
import { Panel, ms, pct, type Knob } from "./pixelScreens";
import { noteCents } from "@/audio/pitchFmt";
import type { Slot } from "@/hooks/useGroovebox";
import type { Px } from "@/pixel/draw";
import { IDM_INIT, IDM_LABEL, IDM_MAX_DECAY, IDM_MIN_DECAY, IDM_MODEL_KNOB, IDM_MODELS, IDM_PATCH, IDM_ROUTS, idmParams, type IdmParams } from "@/audio/idm";

const KW = 24, kx = (i: number) => 2 + i * (KW + 1);
const TW = 61, tx = (i: number) => 2 + i * (TW + 2);

/** One hit drawn large: amplitude shape (DEC fall; GRIT stair-steps it, DRV fattens it) plus a pitch strip for P.ENV. */
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
  const my = 42, span = Math.max(3, Math.round(len * .35)), dy = Math.round(Math.max(-1, Math.min(1, d.penv)) * 3);
  p.text("P", X0, 40); p.line(X0 + 5, my - dy, X0 + 5 + span, my); p.line(X0 + 5 + span, my, X1, my, true);
}

// PRC: two modular percussion synths. Engine tabs on top; ROUT page (routing, tune, pitch env, model knob) draws the
// active patch as a module chain; AMP page (decay, grit, drive) draws the hit.
function IdmPanel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const d = idmParams(slot.idm), home = IDM_INIT[d.model], routs = IDM_ROUTS[d.model];
  const D = (q: Partial<IdmParams>) => onChange({ idm: { ...d, ...q } });
  const K = (label: string, short: string, key: "rout" | "tune" | "a" | "penv" | "decay" | "grit" | "drive", min: number, max: number, step: number, fmt: (v: number) => string, log = false): Knob =>
    ({ label: `PRC ${label}`, short, value: d[key], min, max, step, fmt, log, reset: home[key], set: v => D({ [key]: key === "rout" ? Math.round(v) : v }) });
  const sp = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v * 100)}`;
  const knobs = (page: string): Knob[] => page === "ROUT"
    ? [K("routing", "ROUT", "rout", 0, 5, 1, v => routs[Math.round(v)] ?? ""), { ...K("tune", "TUNE", "tune", 20, 12000, .05, noteCents, true), bare: true }, K("pitch env", "P.ENV", "penv", -1, 1, .01, sp), K(IDM_MODEL_KNOB[d.model].toLowerCase(), IDM_MODEL_KNOB[d.model], "a", 0, 1, .01, pct)]
    : [K("decay", "DEC", "decay", IDM_MIN_DECAY, IDM_MAX_DECAY, .001, ms), K("grit", "GRIT", "grit", 0, 1, .01, pct), K("drive", "DRV", "drive", 0, 1, .01, pct)];
  const body = (p: Px, page: string) => {
    IDM_MODELS.forEach((m, i) => { const x = tx(i); p.box(x, 10, TW, 9); if (m === d.model) p.invert(x + 1, 11, TW - 2, 7); p.textC(IDM_LABEL[m], x + TW / 2, 12, m !== d.model); });
    p.box(2, 20, 124, 25);
    if (page === "AMP") { drawHit(p, d); return; }
    // Routing number + name, then the module chain with arrows; last block loops back when the patch has feedback.
    p.text(`R${d.rout + 1}/6 ${routs[d.rout]}`, 5, 23);
    for (let i = 0; i < 6; i++) { const x = 92 + i * 5; if (i === d.rout) p.rect(x, 23, 4, 5); else p.box(x, 23, 4, 5); }
    const chain = IDM_PATCH[d.model][d.rout], n = chain.length, bw = Math.floor((118 - (n - 1) * 5) / n);
    chain.forEach((lab, i) => { const x = 5 + i * (bw + 5); p.box(x, 31, bw, 11); p.textC(lab, x + bw / 2, 34);
      if (i < n - 1) { const ax = x + bw; p.line(ax, 36, ax + 4, 36); p.dot(ax + 3, 35); p.dot(ax + 3, 37); } });
    if (/FB|XFB|DLY/.test(chain.join())) { const x1 = 5 + (n - 1) * (bw + 5) + bw / 2 | 0, x0 = 5 + bw / 2 | 0; p.line(x1, 42, x1, 43); p.line(x0, 43, x1, 43); p.line(x0, 42, x0, 43); }
  };
  const extra = (page: string) => <>
    {IDM_MODELS.map((m, i) => <Tap key={m} x={tx(i)} y={10} w={TW} h={9} label={`PRC engine ${IDM_LABEL[m]}`} pressed={m === d.model} onClick={() => m !== d.model && onChange({ idm: { model: m, ...IDM_INIT[m] } })} />)}
    {page === "ROUT" && <Tap x={2} y={20} w={124} h={25} label={`PRC next routing (${routs[d.rout]})`} onClick={() => D({ rout: (d.rout + 1) % 6 })} />}
    {page === "AMP" && <Zone x={2} y={20} w={124} h={25} horizontal label="PRC decay drag" value={d.decay} min={IDM_MIN_DECAY} max={IDM_MAX_DECAY} step={.001} reset={home.decay} onChange={decay => D({ decay })} />}
  </>;
  return <Panel name={slot.name || "PRC"} pages={["ROUT", "AMP"]} label="PRC drum" knobs={knobs} body={body} extra={extra} deps={[slot.name, d]} />;
}
export default memo(IdmPanel);
