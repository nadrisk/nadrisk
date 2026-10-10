import { memo, useState } from "react";
import { Tap } from "@/pixel/PixelScreen";
import { Panel, type Knob } from "@/components/pixelScreens";
import { pkey } from "@/components/HwScreens";
import type { Px } from "@/pixel/draw";
import { FX_DEFS, FX_TYPES, SYNC_DIVS, makeFx, type FxType, type FxUnit } from "@/audio/effects";

const fmt = (k: string, v: number, p: Record<string, number> = {}) =>
  k === "sync" ? SYNC_DIVS[Math.round(v)][0] : (k === "rate" || k === "time") && p.sync ? "SYNC"
  : k === "threshold" || k === "makeup" ? `${v}DB` : k === "ratio" ? `${v}:1` : k === "attack" || k === "release" ? `${Math.round(v * 1000)}MS`
  : k === "speed" || k === "smooth" || k === "mix" || k === "depth" || k === "feedback" || k === "wow" || k === "env" ? `${Math.round(v * 100)}%`
  : k === "tone" || k === "damp" || (k === "manual" && v > 50) ? `${Math.round(v)}HZ`
  : k === "time" ? `${Math.round(v * 1000)}MS` : k === "rate" ? (v === 0 ? "STATIC" : `${v}HZ`) : k === "size" ? `${v}S` : String(+v.toFixed(2));
const nm = (t: FxType) => FX_DEFS[t].label.replace(/~$/, "").replace(/\./g, " ").toUpperCase();
const short = (k: string) => ({ feedback: "FDBK", threshold: "THR", release: "REL", attack: "ATK", source: "KEY", reduce: "DOWN", manual: "MAN" } as Record<string, string>)[k] ?? k.slice(0, 4).toUpperCase();
const ROWS = 4;

const pv = (p: Record<string, number>, k: string, fallback: number) => p[k] ?? fallback;

function drawFxVisual(d: Px, f: FxUnit) {
  const p = f.params, type = f.type;
  if (type === "gate") {
    const steps = Math.max(1, Math.min(16, Math.round(p.steps ?? 16))), mask = Math.round(p.mask ?? 21845);
    for (let n = 0; n < steps; n++) { const x = Math.floor((128 - steps * 8) / 2) + n * 8; if (mask & (1 << n)) d.rect(x, 25, 7, 12); else d.box(x, 25, 7, 12); }
    d.line(1, 41, 126, 41, true); return;
  }
  d.box(1, 21, 126, 24);
  if (["saturation", "acid", "bitcrush"].includes(type)) {
    const drive = pv(p, "drive", type === "bitcrush" ? 6 : 4), bias = pv(p, "bias", 0), bits = pv(p, "bits", 16); let py = 42;
    for (let x = 3; x < 125; x++) { const input = (x - 64) / 60; const shaped = type === "bitcrush" ? Math.round(input * bits) / bits : Math.tanh(input * drive * .35 + bias * .5); const y = 33 - Math.round(shaped * 9); d.line(x - 1, py, x, y); py = y; }
  } else if (["delay", "reverseDelay", "metal"].includes(type)) {
    const fb = pv(p, "feedback", .4), taps = 3 + Math.round(fb * 5), gap = Math.max(8, Math.min(20, Math.round(pv(p, "time", .25) * 35)));
    for (let i = 0; i < taps; i++) { const x = type === "reverseDelay" ? 123 - i * gap : 4 + i * gap, h = Math.max(2, Math.round(18 * fb ** i)); d.line(x, 42, x, 42 - h); if (type === "reverseDelay") d.line(x - 3, 42 - h, x, 42); }
  } else if (type === "reverb") {
    const size = pv(p, "size", 2.5), damp = pv(p, "damp", 6000); let py = 23;
    for (let x = 3; x < 125; x++) { const t = (x - 3) / 122, env = Math.exp(-t * (7 / Math.max(.3, size))), grain = Math.sin(x * .9) * Math.sin(x * 2.3) * env; const y = 33 + Math.round(grain * (damp / 16000 * 10 + 2)); d.line(x - 1, py, x, y); py = y; }
  } else if (["chorus", "flanger", "phaser", "vibrato", "tremolo"].includes(type)) {
    const depth = pv(p, "depth", .5), rate = pv(p, "rate", 1), cycles = Math.max(1, Math.min(5, rate / 2)); let py = 33;
    for (let x = 3; x < 125; x++) { const y = 33 + Math.round(Math.sin((x - 3) / 122 * Math.PI * 2 * cycles) * depth * 9); d.line(x - 1, py, x, y); py = y; }
  } else if (["eq", "djfilter"].includes(type)) {
    const sweep = pv(p, "sweep", 0), center = type === "djfilter" ? 64 + sweep * 52 : 64, q = pv(p, "q", pv(p, "resonance", 1)), gain = pv(p, "mid", sweep === 0 ? 0 : -12); let py = 33;
    for (let x = 3; x < 125; x++) { const bell = gain * Math.exp(-Math.abs(x - center) / Math.max(2, 15 / q)); const slope = type === "djfilter" ? (sweep < 0 ? Math.max(0, x - center) : -Math.max(0, center - x)) * Math.abs(sweep) * .25 : 0; const y = Math.max(23, Math.min(43, Math.round(33 - bell * .5 + slope))); d.line(x - 1, py, x, y); py = y; }
  } else {
    const amount = pv(p, "depth", pv(p, "mix", .7)), threshold = pv(p, "threshold", -24); const split = 3 + Math.round((threshold + 60) / 60 * 120);
    d.line(3, 42, split, 42 - Math.round((split - 3) * .15)); d.line(split, 42 - Math.round((split - 3) * .15), 124, 42 - Math.round((split - 3) * .15) - Math.round((124 - split) * .15 * (1 - amount * .8)));
    for (let x = 6; x < 124; x += 9) d.rect(x, 42 - Math.round(amount * ((x % 5) + 4)), 3, Math.round(amount * ((x % 5) + 4)));
  }
}

function FxChain({ slotName, slots, fx, onChange }: { slots: string[]; slotName: string; fx: FxUnit[]; onChange: (fx: FxUnit[]) => void }) {
  const [sel, setSel] = useState(0);
  const [pg, setPg] = useState(0);
  const i = Math.min(sel, Math.max(0, fx.length - 1)), f = fx[i];
  const set = (p: Partial<FxUnit>) => onChange(fx.map((u, j) => (j === i ? { ...u, ...p } : u)));
  const move = (d: number) => { const j = i + d; if (!f || j < 0 || j >= fx.length) return; const n = [...fx]; [n[i], n[j]] = [n[j], n[i]]; onChange(n); setSel(j); };
  const params = f ? Object.entries(FX_DEFS[f.type].params).filter(([k]) => k !== "mask") as [string, number[]][] : [];
  const pages = Math.max(1, Math.ceil(params.length / 4)), pi = Math.min(pg, pages - 1);
  const top = Math.max(0, Math.min(i - 1, fx.length - ROWS));
  const knobs = (page: string): Knob[] => page !== "EDT" || !f ? [] : params.slice(pi * 4, pi * 4 + 4).map(([k, r]) => ({
    label: `${FX_DEFS[f.type].label} ${k}`, short: short(k), value: f.params[k] ?? r[0], min: k === "source" ? 1 : r[1], max: k === "source" ? slots.length : r[2], step: k === "source" ? 1 : r[3],
    fmt: v => (k === "source" ? `${v} ${slots[v - 1] ?? ""}` : fmt(k, v, f.params)), set: v => set({ params: { ...f.params, [k]: v } }),
  }));
  const mask = Math.round(f?.params.mask ?? 21845), gsteps = Math.round(f?.params.steps ?? 16);
  const acts: [string, string, number, () => void, boolean][] = [["UP", "Move earlier", 1, () => move(-1), i > 0], ["DN", "Move later", 33, () => move(1), i < fx.length - 1], [f?.on ? "ON" : "BYP", f?.on ? "Bypass effect" : "Enable effect", 65, () => f && set({ on: !f.on }), !!f], ["DEL", "Remove effect", 97, () => onChange(fx.filter((_, j) => j !== i)), !!f]];
  return <div className="gb-fx">
    <Panel name="FX" label="Effects" pages={["LST", "EDT", "ADD"]} deps={[JSON.stringify(fx), i, pi, slotName]} knobs={knobs}
      body={(p, page) => {
        if (page === "LST") {
          if (!fx.length) p.text(`${slotName} IN > MASTER  EMPTY`.slice(0, 31), 2, 14);
          fx.slice(top, top + ROWS).forEach((u, k) => { const idx = top + k, y = 11 + k * 9, on = idx === i; if (on) p.rect(0, y, 128, 9); p.text(`${idx + 1} ${nm(u.type)}`.slice(0, 27), 3, y + 2, !on); p.text(u.on ? "ON" : "--", 118, y + 2, !on); });
          acts.forEach(([s, , x, , en]) => { p.box(x, 54, 30, 9, !en); p.textC(s, x + 15, 56); });
        } else if (page === "EDT") {
          if (!f) { p.text("NO EFFECT  ADD ONE", 2, 14); return; }
          p.text(`${i + 1} ${nm(f.type)}`.slice(0, 22), 2, 12);
          if (pages > 1) pkey(p, `P${pi + 1}/${pages}`, 100, 10, 27, false);
          drawFxVisual(p, f);
          p.text(f.on ? "ON" : "BYP", 114, 14);
        } else {
          FX_TYPES.forEach((t, k) => { const x = 1 + (k % 4) * 32, y = 10 + Math.floor(k / 4) * 9; p.box(x, y, 31, 9); p.textC(nm(t).slice(0, 5), x + 16, y + 2); });
        }
      }}
      extra={page => page === "LST" ? <>
        {fx.slice(top, top + ROWS).map((u, k) => <Tap key={u.id} x={0} y={11 + k * 9} w={128} h={9} label={`Select effect ${top + k + 1} ${FX_DEFS[u.type].label}`} pressed={top + k === i} onClick={() => setSel(top + k)} />)}
        {acts.map(([s, l, x, fn, en]) => <Tap key={s + l} x={x} y={54} w={30} h={9} label={l} disabled={!en} onClick={fn} />)}
      </> : page === "EDT" ? <>
        {pages > 1 && <Tap x={100} y={10} w={27} h={9} label="Next parameter page" onClick={() => setPg((pi + 1) % pages)} />}
        {f?.type === "gate" && Array.from({ length: gsteps }, (_, n) => <Tap key={n} x={Math.floor((128 - gsteps * 8) / 2) + n * 8} y={25} w={7} h={12} label={`Gate step ${n + 1}`} pressed={!!(mask & (1 << n))} onClick={() => set({ params: { ...f.params, mask: mask ^ (1 << n) } })} />)}
      </> : <>
        {FX_TYPES.map((t, k) => <Tap key={t} x={1 + (k % 4) * 32} y={10 + Math.floor(k / 4) * 9} w={31} h={9} label={`Add ${FX_DEFS[t].label}`} onClick={() => { onChange([...fx, makeFx(t)]); setSel(fx.length); }} />)}
      </>} />
  </div>;
}

export default memo(FxChain);
