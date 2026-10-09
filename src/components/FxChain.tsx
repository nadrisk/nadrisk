import { ChevronLeft, ChevronRight, Plus, Power, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { FX_DEFS, FX_TYPES, makeFx, type FxType, type FxUnit } from "@/audio/effects";

const fmt = (k: string, v: number) =>
  k === "mix" || k === "depth" || k === "feedback" || k === "wow" || k === "env" ? `${Math.round(v * 100)}%`
  : k === "tone" || k === "damp" || (k === "manual" && v > 50) ? `${Math.round(v).toLocaleString()} Hz`
  : k === "manual" ? `${v} ms` : k === "time" ? `${Math.round(v * 1000)} ms` : k === "rate" ? (v === 0 ? "static" : `${v} Hz`) : k === "size" ? `${v} s` : String(v);
const label = (k: string) => (k === "env" ? "env follow" : k === "reduce" ? "downsample" : k);

export default function FxChain({ slotName, fx, onChange }: { slotName: string; fx: FxUnit[]; onChange: (fx: FxUnit[]) => void }) {
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
            {Object.entries(def.params).map(([k, r]) => { const [, min, max, step] = r as number[];
              return <div key={k} className="gb-param"><div className="parameter-label">{label(k)}<span>{fmt(k, f.params[k])}</span></div>
                <Slider aria-label={`${def.label} ${k}`} min={min} max={max} step={step} value={[f.params[k]]} onValueChange={([v]) => set(i, { params: { ...f.params, [k]: v } })} className="patch-slider" /></div>; })}
          </section></div>; })}
      <span className="gb-cable" aria-hidden="true" />
      <div className="object-message gb-fx-io">pan~ → master</div>
    </div>
    <div className="gb-fx-add"><Plus size={12} /> add {FX_TYPES.map(t => <button key={t} onClick={() => onChange([...fx, makeFx(t as FxType)])}>{FX_DEFS[t].label}</button>)}</div>
  </div>;
}
