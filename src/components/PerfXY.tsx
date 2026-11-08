import { useRef, useState } from "react";
import type { PerformanceParams } from "@/audio/performance";

// Kaoss-style performance pad: touch engages, lift snaps back to the values held before the touch unless HOLD is on.
type Mode = "filter" | "tension";
const MODES: [Mode, string, string, string][] = [["filter", "FLTR/ECHO", "LP ← DJ → HP", "ECHO SEND"], ["tension", "TENS/TIME", "TIME − ↔ +", "TENSION"]];
const map = (m: Mode, x: number, y: number): Partial<PerformanceParams> => m === "filter" ? { djSweep: Math.round((x * 2 - 1) * 100) / 100, echoSend: Math.round(y * 100) / 100 } : { time: Math.round((x * 2 - 1) * 100) / 100, tension: Math.round(y * 100) / 100 };
const read = (m: Mode, v: PerformanceParams) => m === "filter" ? [((v.djSweep ?? 0) + 1) / 2, v.echoSend ?? 0] : [(v.time + 1) / 2, v.tension];

export default function PerfXY({ value, onChange }: { value: PerformanceParams; onChange: (p: PerformanceParams) => void }) {
  const [mode, setMode] = useState<Mode>("filter");
  const [hold, setHold] = useState(false);
  const [touch, setTouch] = useState(false);
  const before = useRef<Partial<PerformanceParams> | null>(null);
  const vRef = useRef(value); vRef.current = value;
  const padRef = useRef<HTMLDivElement>(null);
  const at = (e: React.PointerEvent) => { const r = padRef.current!.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height))]; };
  const move = (e: React.PointerEvent) => { const [x, y] = at(e); onChange({ ...vRef.current, ...map(mode, x, y) }); };
  const end = () => { setTouch(false); if (!hold && before.current) onChange({ ...vRef.current, ...before.current }); before.current = null; };
  const [px, py] = read(mode, value), m = MODES.find(x => x[0] === mode)!;
  const hk = (n: number, s: string) => <button key={s} className="perf-xy-key" aria-label={`Hold ${s}`} aria-pressed={value.mode === n} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); onChange({ ...vRef.current, mode: n }); }} onPointerUp={() => onChange({ ...vRef.current, mode: 0 })} onPointerCancel={() => onChange({ ...vRef.current, mode: 0 })}>{s}</button>;
  return <div className="perf-xy">
    <div className="perf-xy-modes">{MODES.map(([k, l]) => <button key={k} className="perf-xy-key" aria-pressed={mode === k} onClick={() => { if (!touch) setMode(k); }}>{l}</button>)}<button className="perf-xy-key" aria-label="Hold XY position" aria-pressed={hold} onClick={() => { setHold(h => { if (h) onChange({ ...vRef.current, ...(mode === "filter" ? { djSweep: 0, echoSend: 0 } : { time: vRef.current.timeHome ?? 0, tension: 0 }) }); return !h; }); }}>HOLD</button></div>
    <div ref={padRef} className={`perf-xy-pad${touch || hold ? " perf-xy-on" : ""}`} role="slider" aria-label={`Performance XY pad, ${m[1]}`} aria-valuenow={Math.round(px * 100)}
      onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); if (!hold || !before.current) before.current = mode === "filter" ? { djSweep: 0, echoSend: 0 } : { time: vRef.current.timeHome ?? 0, tension: 0 }; setTouch(true); move(e); }}
      onPointerMove={e => { if (touch) move(e); }} onPointerUp={end} onPointerCancel={end}>
      <span className="perf-xy-y">{m[3]} ↑</span><span className="perf-xy-x">{m[2]}</span>
      <i className="perf-xy-h" style={{ top: `${(1 - py) * 100}%` }} /><i className="perf-xy-v" style={{ left: `${px * 100}%` }} />
      <b className="perf-xy-dot" style={{ left: `${px * 100}%`, top: `${(1 - py) * 100}%` }} />
    </div>
    <div className="perf-xy-holds">{hk(1, "REV")}{hk(2, "STUT")}{hk(3, "STOP")}</div>
  </div>;
}
