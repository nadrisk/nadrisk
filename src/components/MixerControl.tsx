import { useEffect, useRef } from "react";
import { isResetTap, type Tap } from "@/link/reset";

type Props = { label: string; name: string; value: number; min: number; max: number; home: number; onChange: (v: number) => void; fader?: "vertical" | "horizontal"; readout: string };
export default function MixerControl({ label, name, value, min, max, home, onChange, fader, readout }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const tap = useRef<Tap | null>(null);
  const drag = useRef<{ x: number; y: number; value: number } | null>(null);
  const latest = useRef(onChange); latest.current = onChange;
  const set = (v: number) => latest.current(Math.round(Math.max(min, Math.min(max, v)) * 100) / 100);
  useEffect(() => {
    const el = root.current; if (!el) return;
    const receive = (event: Event) => { tap.current = null; set(min + (event as CustomEvent<number>).detail * (max - min)); };
    el.addEventListener("midivalue", receive); return () => el.removeEventListener("midivalue", receive);
  }, [min, max]);
  const fraction = (value - min) / (max - min);
  const angle = (-135 + fraction * 270) * Math.PI / 180;
  return <div className={`lk-control ${fader ? `lk-control-${fader}` : "lk-control-rotary"}`} ref={root} role="slider" tabIndex={0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} data-midi-value="" title="Double-tap to reset"
    onPointerDown={e => { if (!e.isTrusted) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, value }; }}
    onPointerMove={e => { const d = drag.current; if (!d) return; const distance = fader === "horizontal" ? e.clientX - d.x : d.y - e.clientY; const size = fader ? (fader === "horizontal" ? e.currentTarget.clientWidth : e.currentTarget.clientHeight) : 150; set(d.value + distance / Math.max(60, size) * (max - min)); }}
    onPointerUp={e => { const d = drag.current; drag.current = null; if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) >= 8) { tap.current = null; return; } const next = { time: e.timeStamp, x: e.clientX, y: e.clientY }; if (isResetTap(tap.current, next)) { set(home); tap.current = null; } else tap.current = next; }}
    onPointerCancel={() => { drag.current = null; tap.current = null; }}
    onKeyDown={e => { if (e.key === "Home") { e.preventDefault(); set(home); } else if (["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(e.key)) { e.preventDefault(); set(value + (["ArrowUp", "ArrowRight"].includes(e.key) ? 0.01 : -0.01)); } }}>
    <span className="lk-control-name">{name}</span>
    {fader ? <svg className="lk-travel" viewBox={fader === "horizontal" ? "0 0 200 36" : "0 0 40 140"} preserveAspectRatio="none" aria-hidden="true">{fader === "horizontal" ? <><path d="M10 18H190 M100 8V28" /><rect x={4 + fraction * 176} y="5" width="16" height="26" /></> : <><path d="M20 10V130 M9 70H31" /><rect x="5" y={120 - fraction * 114} width="30" height="14" /></>}</svg> : <svg viewBox="0 0 48 48" aria-hidden="true"><circle className="lk-dial-ring" cx="24" cy="24" r="21" /><circle cx="24" cy="24" r="16" /><path d={`M24 24L${24 + 15 * Math.sin(angle)} ${24 - 15 * Math.cos(angle)}`} /></svg>}
    <span className="lk-control-value">{readout}</span>
  </div>;
}