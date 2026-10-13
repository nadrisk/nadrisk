import { memo, useContext, useEffect, useRef } from "react";
import { ResetScope } from "@/components/ui/slider";
const knobHome = new Map<string, number>();

type Props = { label: string; value: number; min: number; max: number; step?: number; fmt?: (v: number) => string; onChange: (v: number) => void };

// 1-bit hardware encoder: ring, needle, value readout. Vertical drag, wheel, arrows; double-click resets.
function HwKnob({ label, value, min, max, step = 1, fmt, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const key = `${useContext(ResetScope)}|${label}`; if (!knobHome.has(key)) knobHome.set(key, value);
  const st = useRef({ value, onChange, def: value, y: 0, v: 0 });
  st.current.def = knobHome.get(key)!; st.current.value = value; st.current.onChange = onChange;
  const q = (v: number) => { const c = Math.min(max, Math.max(min, v)); return Math.round((c - min) / step) * step + min; };
  const set = (v: number) => { const n = +q(v).toFixed(6); if (n !== st.current.value) st.current.onChange(n); };
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const m = (e: Event) => set(min + (e as CustomEvent<number>).detail * (max - min));
    el.addEventListener("midivalue", m); return () => el.removeEventListener("midivalue", m);
  });
  const f = (value - min) / (max - min || 1), a = (-135 + f * 270) * Math.PI / 180;
  const arc = (t: number) => { const r = (-135 + t * 270 - 90) * Math.PI / 180; return `${16 + 13 * Math.cos(r)} ${16 + 13 * Math.sin(r)}`; };
  return <div className="hw-knob" ref={ref} role="slider" tabIndex={0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} data-midi-value=""
    onPointerDown={e => { if (!e.isTrusted) return; e.currentTarget.setPointerCapture(e.pointerId); st.current.y = e.clientY; st.current.v = value; }}
    onPointerMove={e => { if (!e.buttons || !e.isTrusted) return; const d = (st.current.y - e.clientY) / (e.shiftKey ? 600 : 150); set(st.current.v + d * (max - min)); }}
    onDoubleClick={e => { if (e.isTrusted) set(st.current.def); }}
    onKeyDown={e => { const k = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -1 : 0; if (k) { e.preventDefault(); set(value + k * step); } }}>
    <svg viewBox="0 0 32 32" aria-hidden>
      <path d={`M ${arc(0)} A 13 13 0 1 1 ${arc(1)}`} className="hw-track" />
      {f > 0.002 && <path d={`M ${arc(0)} A 13 13 0 ${f > 2 / 3 ? 1 : 0} 1 ${arc(f)}`} className="hw-fill" />}
      <circle cx="16" cy="16" r="9" className="hw-cap" />
      <line x1="16" y1="16" x2={16 + 9 * Math.sin(a)} y2={16 - 9 * Math.cos(a)} className="hw-needle" />
    </svg>
    <span className="hw-name">{label}</span>
    <span className="hw-val">{fmt ? fmt(value) : +value.toFixed(2)}</span>
  </div>;
}
export default memo(HwKnob);

// Elektron-style envelope graph: nodes at peak, sustain and release, dashed stage markers.
export function AdsrView({ a, d, s, r }: { a: number; d: number; s: number; r: number }) {
  const t = a + d + r + 0.6, W = 120, H = 40, x = (v: number) => 4 + v / t * (W - 8), y = (v: number) => H - 4 - v * (H - 8);
  const p = [[x(0), y(0)], [x(a), y(1)], [x(a + d), y(s)], [x(a + d + .6), y(s)], [x(t), y(0)]];
  return <svg className="hw-adsr" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
    {p.slice(1, 4).map(([px], i) => <line key={i} x1={px} x2={px} y1={2} y2={H - 2} className="hw-dash" />)}
    <polyline points={p.map(q => q.join(",")).join(" ")} className="hw-line" />
    {p.slice(1, 4).map(([px, py], i) => <circle key={i} cx={px} cy={py} r={2.2} className="hw-node" />)}
  </svg>;
}
