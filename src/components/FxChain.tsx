import { memo } from "react";
import { ChevronLeft, ChevronRight, Plus, Power, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { FX_DEFS, FX_TYPES, SYNC_DIVS, makeFx, type FxType, type FxUnit } from "@/audio/effects";

const fmt = (k: string, v: number, p: Record<string, number> = {}) =>
  k === "sync" ? SYNC_DIVS[Math.round(v)][0] : (k === "rate" || k === "time") && p.sync ? "synced"
  : k === "threshold" || k === "makeup" ? `${v} dB` : k === "ratio" ? `${v}:1` : k === "attack" || k === "release" ? `${Math.round(v * 1000)} ms`
  : k === "speed" || k === "smooth" ? `${Math.round(v * 100)}%`
  : k === "mix" || k === "depth" || k === "feedback" || k === "wow" || k === "env" ? `${Math.round(v * 100)}%`
  : k === "tone" || k === "damp" || (k === "manual" && v > 50) ? `${Math.round(v).toLocaleString()} Hz`
  : k === "manual" ? `${v} ms` : k === "time" ? `${Math.round(v * 1000)} ms` : k === "rate" ? (v === 0 ? "static" : `${v} Hz`) : k === "size" ? `${v} s` : String(v);
const label = (k: string) => (k === "env" ? "env follow" : k === "reduce" ? "downsample" : k === "sync" ? "bpm sync" : k);

function FxChain({ slotName, slots, fx, onChange }: { slots: string[]; slotName: string; fx: FxUnit[]; onChange: (fx: FxUnit[]) => void }) {
  const set = (i: number, p: Partial<FxUnit>) => onChange(fx.map((f, j) => (j === i ? { ...f, ...p } : f)));
  const move = (i: number, d: number) => { const n = [...fx]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  return <div className="gb-fx">
    <div className="gb-fx-row">
      <div className="object-message gb-fx-io">{slotName.toLowerCase()} in</div>
      {fx.map((f, i) => { const def = FX_DEFS[f.type];
        return <div key={f.id} className="gb-fx-wrap"><span className="gb-cable" aria-hidden="true" />
          <section className={`gb-fx-unit ${f.on ? "" : "off"}`} aria-label={def.label}>
            <header><span>{def.label}</span><span className="gb-fx-actions">
              <button aria-label="Move earlier" onClick={() => move(i, -1)} disabled={i === 0}><ChevronLeft size={12} /></button>
              <button aria-label="Move later" onClick={() => move(i, 1)} disabled={i === fx.length - 1}><ChevronRight size={12} /></button>
              <button aria-label={f.on ? "Bypass effect" : "Enable effect"} aria-pressed={f.on} className={f.on ? "on" : ""} onClick={() => set(i, { on: !f.on })}><Power size={12} /></button>
              <button aria-label="Remove effect" onClick={() => onChange(fx.filter((_, j) => j !== i))}><X size={12} /></button>
            </span></header>
            {f.type === "sidechain" && <label className="arp-field">Key input<select aria-label="Sidechain source" value={f.params.source ?? 1} onChange={e => set(i, { params: { ...f.params, source: +e.target.value } })}>{slots.map((name, j) => <option key={j} value={j+1}>{j+1} · {name}</option>)}</select></label>}
            {f.type === "gate" && <>
              <select className="gb-row-len" aria-label="Gate rhythm preset" defaultValue="" onChange={e => { if (e.target.value) set(i, { params: { ...f.params, mask: +e.target.value, steps: e.target.value === "2925" ? 12 : 16 } }); }}><option value="" disabled>Rhythm preset</option><option value="21845">16th stutter</option><option value="61166">4x4 pump</option><option value="52428">Off beat</option><option value="2925">3/4 poly</option></select>
              <div className="nad-gate-grid">{Array.from({ length: Math.round(f.params.steps ?? 16) }, (_, n) => <Button variant="ghost" size="icon" key={n} className={(Math.round(f.params.mask ?? 21845) & (1 << n)) ? "on" : ""} aria-label={`Gate step ${n+1}`} aria-pressed={!!(Math.round(f.params.mask ?? 21845) & (1<<n))} onClick={() => set(i, { params: { ...f.params, mask: Math.round(f.params.mask ?? 21845) ^ (1<<n) } })}>{n+1}</Button>)}</div>
            </>}
            {Object.entries(def.params).filter(([k]) => k !== "mask" && k !== "source").map(([k, r]) => { const [, min, max, step] = r as number[];
              return <div key={k} className="gb-param"><div className="parameter-label">{label(k)}<span>{fmt(k, f.params[k] ?? r[0], f.params)}</span></div>
                <Slider aria-label={`${def.label} ${k}`} resetValue={[r[0] as number]} min={min} max={max} step={step} value={[f.params[k] ?? r[0]]} onValueChange={([v]) => set(i, { params: { ...f.params, [k]: v } })} className="patch-slider" /></div>; })}
          </section></div>; })}
      <span className="gb-cable" aria-hidden="true" />
      <div className="object-message gb-fx-io">pan~ → master</div>
    </div>
    <div className="gb-fx-add"><Plus size={12} /> add {FX_TYPES.map(t => <button key={t} onClick={() => onChange([...fx, makeFx(t as FxType)])}>{FX_DEFS[t].label}</button>)}</div>
  </div>;
}

export default memo(FxChain);
