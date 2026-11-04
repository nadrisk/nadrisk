import { memo, useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { Tap, XYPad, Zone } from "@/pixel/PixelScreen";
import { Panel } from "./pixelScreens";
import type { Px } from "@/pixel/draw";
import type { Slot } from "@/hooks/useGroovebox";
import { commitXY, xyCorners, xyHome, xyLabels, type XY } from "@/audio/xyMaps";
import { LFO_DEFAULT, LFO_RATES, REC_LENS, SHAPE_NAME, XY_SHAPES, fillPath, motionOn, recAt, shapeAt, xyAt } from "@/audio/xyMotion";
import { LFO_ZONES as LZ, PAD, REC_BAR, REC_ZONES as RZ, XY_ZONES as XZ, type Box } from "./xyLayout";

const { x: X0, y: Y0, w: PW, h: PH } = PAD;
const PAGES = ["XY", "REC", "LFO"] as const;
const stepNow = () => { const t = Tone.getTransport(); return t.state === "started" ? t.ticks / (t.PPQ / 4) : null; };
// XY: explore the instrument's own sound. X = tight..open, Y = dark..bright, centre = saved patch.
// REC captures a hand-drawn path per 1/16 step; LFO moves the dot in a synced shape. Touch always wins.
function XyScreen({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const xy: XY = slot.xy ?? { x: 0, y: 0 }, hold = xy.hold ?? true, h = xyHome(xy);
  const lfo = xy.lfo ?? LFO_DEFAULT, rec = xy.rec;
  const at = (x: number, y: number, hd = hold, held = xy.held) => ({ xy: { ...xy, x, y, hold: hd, held } });
  const set = (p: Partial<XY>) => onChange({ xy: { ...xy, ...p } });
  const trail = useRef<[number, number][]>([]);
  const [armed, setArmed] = useState(false);
  const [recLen, setRecLen] = useState(rec?.len ?? 16);
  const cap = useRef<{ start: number | null; pts: ([number, number] | undefined)[] }>({ start: null, pts: [] });
  const [readout, setReadout] = useState(""); const rdT = useRef<ReturnType<typeof setTimeout>>();
  const show = (t: string) => { setReadout(t); clearTimeout(rdT.current); rdT.current = setTimeout(() => setReadout(""), 1200); };
  useEffect(() => () => clearTimeout(rdT.current), []);
  const [lx, ly] = xyLabels(slot);

  const finishRec = (last?: XY) => {
    const c = cap.current; if (c.start == null) return;
    const pts = fillPath(c.pts); cap.current = { start: null, pts: [] }; setArmed(false);
    if (pts.length) onChange({ xy: { ...(last ?? xy), held: false, rec: { pts, len: recLen, play: true } } }); show("REC DONE");
  };
  const move = (x: number, y: number) => {
    trail.current = [...trail.current.slice(-7), [x, y]];
    const nx = +x.toFixed(3), ny = +y.toFixed(3), st = stepNow();
    if (armed && st != null) {
      const c = cap.current, s = Math.floor(st);
      if (c.start == null) { c.start = s; c.pts = Array(recLen).fill(undefined); }
      if (s - c.start >= recLen) { finishRec({ ...xy, x: nx, y: ny }); return; }
      c.pts[s % recLen] = [nx, ny];
    }
    onChange(at(nx, ny, hold, true));
  };
  const lift = () => {
    trail.current = [];
    if (cap.current.start != null) { finishRec(hold ? { ...xy, held: false } : { ...xy, x: h.x, y: h.y, held: false }); return; }
    onChange(hold ? at(xy.x, xy.y, hold, false) : at(h.x, h.y, hold, false));
  };

  const px = (v: number) => X0 + Math.round((v + 1) / 2 * (PW - 1)), py = (v: number) => Y0 + Math.round((1 - v) / 2 * (PH - 1));
  const off = Math.abs(xy.x - h.x) > .01 || Math.abs(xy.y - h.y) > .01;
  const key = (p: Px, b: Box, t: string, on = false) => { if (on) p.rect(b.x, b.y, b.w, b.h); else p.box(b.x, b.y, b.w, b.h); p.textC(t, b.x + b.w / 2, b.y + 2, !on); };
  const bar = (p: Px, b: Box, t: string, f: number, v: string) => {
    p.box(b.x, b.y, b.w, b.h); const w = Math.round((b.w - 2) * Math.max(0, Math.min(1, f)));
    if (w > 0) p.rect(b.x + 1, b.y + 1, w, b.h - 2);
    // Labels sit on a cleared plate so they stay readable over the fill.
    const s = `${t} ${v}`, tw = s.length * 4 + 1; p.rect(b.x + 2, b.y + 1, tw, b.h - 2, false); p.text(s, b.x + 3, b.y + 2);
  };

  return <Panel name={readout || "XY"} label="Instrument XY pad" pages={PAGES} live={() => () => armed || (motionOn(xy) && stepNow() != null)}
    deps={[xy.x, xy.y, hold, xy.held, rec, lfo, armed, recLen, readout, slot.engine, slot.bass.mode, slot.sampler.grain, slot.sampler.stretch, lx]}
    knobs={() => []}
    body={(p, page) => {
      const st = stepNow(), pos = xyAt(xy, st);
      p.box(X0, Y0, PW, PH);
      for (let x = X0 + 4; x < X0 + PW; x += 6) p.dot(x, Y0 + PH / 2);
      for (let y = Y0 + 3; y < Y0 + PH; y += 4) p.dot(X0 + PW / 2, y);
      { const [l, r, t, b] = xyCorners(slot); p.text(l, 4, 13); p.text(r, 124 - r.length * 4, 13); p.textC(t, 64, 13); p.textC(b, 64, 39); }
      // SET origin: small cross so you know where CENTER returns.
      const hx = px(h.x), hy = py(h.y); p.dot(hx - 1, hy); p.dot(hx + 1, hy); p.dot(hx, hy - 1); p.dot(hx, hy + 1);
      // Recorded path (every other step dotted) and LFO preview around the base.
      if (rec?.pts.length) rec.pts.forEach(([x, y], i) => { if (i % 2 === 0 || rec.play) p.dot(px(x), py(y)); });
      if (lfo.on && lfo.depth > 0 && lfo.shape !== "sh") { const [bx, by] = rec?.play && rec.pts.length && st != null ? recAt(rec, st) : [xy.x, xy.y];
        for (let k = 0; k < 32; k += 2) { const [dx, dy] = shapeAt(lfo.shape, k / 32); p.dot(px(Math.max(-1, Math.min(1, bx + dx * lfo.depth))), py(Math.max(-1, Math.min(1, by + dy * lfo.depth)))); } }
      trail.current.forEach(([x, y]) => p.dot(px(x), py(y)));
      if (motionOn(xy) && st != null) { const mx = px(pos.x), my = py(pos.y); p.rect(mx - 2, my - 2, 5, 5); p.rect(mx - 1, my - 1, 3, 3, false); p.box(px(xy.x) - 1, py(xy.y) - 1, 3, 3); }
      else { const cx = px(xy.x), cy = py(xy.y); p.rect(cx - 2, cy - 2, 5, 5); p.rect(cx - 1, cy - 1, 3, 3, false); }
      if (armed) { p.rect(X0 + PW - 15, Y0 + PH - 8, 14, 7); p.text("REC", X0 + PW - 14, Y0 + PH - 7, false); }
      else if (rec?.play || lfo.on) p.text(rec?.play && lfo.on ? "R+L" : rec?.play ? "REC" : "LFO", X0 + PW - 14, Y0 + PH - 7);

      if (page === "XY") {
        p.text(`X ${lx}`.slice(0, 15), 2, 47); p.text(`Y ${ly}`.slice(0, 15), 2, 56);
        key(p, XZ.hold, "HOLD", hold); key(p, XZ.snap, "SNAP", !hold); key(p, XZ.set, off ? "SET" : "---"); key(p, XZ.center, "CENTER");
      } else if (page === "REC") {
        key(p, RZ.arm, "ARM", armed); key(p, RZ.play, rec?.pts.length ? "PLAY" : "---", !!rec?.play); key(p, RZ.clr, rec?.pts.length ? "CLR" : "---"); key(p, RZ.len, `LEN ${recLen / 16} BAR`);
        const b = REC_BAR, c = cap.current;
        if (armed && st == null) { p.box(b.x, b.y, b.w, b.h); p.textC("PRESS PLAY", b.x + b.w / 2, b.y + 2); }
        else if (armed) { const n = c.start == null ? 0 : Math.min(recLen, Math.floor(st!) - c.start); bar(p, b, c.start == null ? "TOUCH PAD" : "REC", n / recLen, c.start == null ? "" : `${n}/${recLen}`); }
        else if (rec?.play && st != null) { const f = (((st % rec.len) + rec.len) % rec.len) / rec.len; bar(p, b, "PLAY", f, `${Math.floor(f * rec.len) + 1}/${rec.len}`); }
        else { p.box(b.x, b.y, b.w, b.h); p.textC(rec?.pts.length ? `${rec.len} STEPS ${rec.play ? "ON" : "OFF"}` : "ARM THEN DRAW", b.x + b.w / 2, b.y + 2); }
      } else {
        key(p, LZ.on, "ON", lfo.on); key(p, LZ.shape, SHAPE_NAME[lfo.shape]);
        bar(p, LZ.rate, "RATE", lfo.rate / (LFO_RATES.length - 1), LFO_RATES[lfo.rate].n);
        bar(p, LZ.depth, "DPTH", lfo.depth, `${Math.round(lfo.depth * 100)}%`);
        bar(p, LZ.phase, "PHAS", lfo.phase, `${Math.round(lfo.phase * 360)}`);
      }
    }}
    extra={page => <>
      <XYPad x={X0} y={Y0} w={PW} h={PH} label="Sound XY: left tight, right open, down dark, up bright" onMove={move} onLift={lift} />
      {page === "XY" && <>
        <Tap {...XZ.hold} label="XY hold position" pressed={hold} onClick={() => set({ hold: true })} />
        <Tap {...XZ.snap} label="XY snap back to centre" pressed={!hold} onClick={() => onChange(at(h.x, h.y, false))} />
        <Tap {...XZ.set} label="Commit XY sound into the knobs" disabled={!off} onClick={() => { const c = commitXY(slot); onChange({ ...c, xy: { ...xy, ...c.xy } }); show("SET"); }} />
        <Tap {...XZ.center} label="XY back to centre" onClick={() => onChange(at(h.x, h.y))} />
      </>}
      {page === "REC" && <>
        <Tap {...RZ.arm} label="XY motion record arm" pressed={armed} onClick={() => { if (armed) { cap.current = { start: null, pts: [] }; setArmed(false); show("REC OFF"); } else { setArmed(true); show(stepNow() == null ? "PRESS PLAY" : "DRAW ON PAD"); } }} />
        <Tap {...RZ.play} label="XY motion playback" pressed={!!rec?.play} disabled={!rec?.pts.length} onClick={() => { if (rec) { set({ rec: { ...rec, play: !rec.play } }); show(rec.play ? "PLAY OFF" : "PLAY ON"); } }} />
        <Tap {...RZ.clr} label="Clear XY motion" disabled={!rec?.pts.length} onClick={() => { set({ rec: undefined }); show("CLEARED"); }} />
        <Tap {...RZ.len} label="XY motion length" disabled={armed} onClick={() => { const n = REC_LENS[(REC_LENS.indexOf(recLen) + 1) % REC_LENS.length]; setRecLen(n); show(`LEN ${n / 16} BAR`); }} />
      </>}
      {page === "LFO" && <>
        <Tap {...LZ.on} label="XY LFO on" pressed={lfo.on} onClick={() => { set({ lfo: { ...lfo, on: !lfo.on } }); show(lfo.on ? "LFO OFF" : "LFO ON"); }} />
        <Tap {...LZ.shape} label="XY LFO shape" onClick={() => { const s = XY_SHAPES[(XY_SHAPES.indexOf(lfo.shape) + 1) % XY_SHAPES.length]; set({ lfo: { ...lfo, shape: s } }); show(`SHP ${SHAPE_NAME[s]}`); }} />
        <Zone {...LZ.rate} horizontal label="XY LFO rate" value={lfo.rate} min={0} max={LFO_RATES.length - 1} step={1} reset={LFO_DEFAULT.rate} onChange={v => { const r = Math.round(v); set({ lfo: { ...lfo, rate: r } }); show(`RATE ${LFO_RATES[r].n}`); }} />
        <Zone {...LZ.depth} horizontal label="XY LFO depth" value={lfo.depth} min={0} max={1} step={.01} reset={LFO_DEFAULT.depth} onChange={v => { set({ lfo: { ...lfo, depth: v } }); show(`DPTH ${Math.round(v * 100)}%`); }} />
        <Zone {...LZ.phase} horizontal label="XY LFO phase" value={lfo.phase} min={0} max={1} step={.01} reset={0} onChange={v => { set({ lfo: { ...lfo, phase: v } }); show(`PHAS ${Math.round(v * 360)}`); }} />
      </>}
    </>} />;
}
export default memo(XyScreen);
