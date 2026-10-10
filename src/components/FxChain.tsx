import { memo, useState } from "react";
import { Tap } from "@/pixel/PixelScreen";
import { Panel, type Knob } from "@/components/pixelScreens";
import { pkey } from "@/components/HwScreens";
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
          fx.slice(top, top + ROWS).forEach((u, k) => { const idx = top + k, y = 11 + k * 9, on = idx === i; if (on) p.rect(0, y, 128, 9); p.text(`${idx + 1} ${nm(u.type)}`.slice(0, 24), 2, y + 2, !on); p.text(u.on ? "ON" : "--", 118, y + 2, !on); });
          acts.forEach(([s, , x, , en]) => { p.box(x, 54, 30, 9, !en); p.textC(s, x + 15, 56); });
        } else if (page === "EDT") {
          if (!f) { p.text("NO EFFECT  ADD ONE", 2, 14); return; }
          p.text(`${i + 1} ${nm(f.type)}`.slice(0, 20), 2, 12);
          if (pages > 1) pkey(p, `P${pi + 1}/${pages}`, 100, 10, 27, false);
          if (f.type === "gate") for (let n = 0; n < gsteps; n++) { const x = 2 + n * 8, on = !!(mask & (1 << n)); if (on) p.rect(x, 22, 6, 8); else p.box(x, 22, 6, 8); }
          else p.text(f.on ? "ACTIVE" : "BYPASSED", 2, 24);
        } else {
          FX_TYPES.forEach((t, k) => { const x = 1 + (k % 4) * 32, y = 10 + Math.floor(k / 4) * 9; p.box(x, y, 31, 9); p.textC(nm(t).slice(0, 7), x + 15, y + 2); });
        }
      }}
      extra={page => page === "LST" ? <>
        {fx.slice(top, top + ROWS).map((u, k) => <Tap key={u.id} x={0} y={11 + k * 9} w={128} h={9} label={`Select effect ${top + k + 1} ${FX_DEFS[u.type].label}`} pressed={top + k === i} onClick={() => setSel(top + k)} />)}
        {acts.map(([s, l, x, fn, en]) => <Tap key={s + l} x={x} y={54} w={30} h={9} label={l} disabled={!en} onClick={fn} />)}
      </> : page === "EDT" ? <>
        {pages > 1 && <Tap x={100} y={10} w={27} h={9} label="Next parameter page" onClick={() => setPg((pi + 1) % pages)} />}
        {f?.type === "gate" && Array.from({ length: gsteps }, (_, n) => <Tap key={n} x={2 + n * 8} y={22} w={7} h={8} label={`Gate step ${n + 1}`} pressed={!!(mask & (1 << n))} onClick={() => set({ params: { ...f.params, mask: mask ^ (1 << n) } })} />)}
      </> : <>
        {FX_TYPES.map((t, k) => <Tap key={t} x={1 + (k % 4) * 32} y={10 + Math.floor(k / 4) * 9} w={31} h={9} label={`Add ${FX_DEFS[t].label}`} onClick={() => { onChange([...fx, makeFx(t)]); setSel(fx.length); }} />)}
      </>} />
  </div>;
}

export default memo(FxChain);
