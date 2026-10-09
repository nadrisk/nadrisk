import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, Rewind, Pause, Repeat2 } from "lucide-react";
import type { PerformanceParams } from "@/audio/performance";
export default function PerformanceRack({ value, onChange }: { value: PerformanceParams; onChange: (p: PerformanceParams) => void }) {
  const set = (patch: Partial<PerformanceParams>) => onChange({ ...value, ...patch });
  const hold = (mode: number) => ({ onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); set({ mode }); }, onPointerUp: () => set({ mode: 0 }), onPointerCancel: () => set({ mode: 0 }), onLostPointerCapture: () => set({ mode: 0 }), onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); set({ mode }); } }, onKeyUp: () => set({ mode: 0 }), onBlur: () => set({ mode: 0 }) });
  return <div className="node-body nad-performance">
    <div className="gb-cols2">
      <div className="gb-param"><div className="parameter-label">Envelope time<span>{value.time > 0 ? "+" : ""}{Math.round(value.time * 100)}%</span></div><Slider aria-label="Global envelope time" min={-1} max={1} step={.01} value={[value.time]} onValueChange={([time]) => set({ time })} /></div>
      <div className="gb-param"><div className="parameter-label">Tension<span>{Math.round(value.tension * 100)}%</span></div><Slider aria-label="Tension" min={0} max={1} step={.01} value={[value.tension]} onValueChange={([tension]) => set({ tension })} /></div>
    </div>
    <div className="arp-controls">
      <label className="arp-field">Tension mode<select aria-label="Tension mode" value={value.style} onChange={e => set({ style: e.target.value as PerformanceParams["style"] })}><option value="sweep">Hyper sweep</option><option value="whiteout">Whiteout</option><option value="cyber">Cyber drop</option></select></label>
      <label className="arp-field">Capture length<select aria-label="Repeat length" value={value.division} onChange={e => set({ division: +e.target.value })}>{[[1,"1/4"],[.5,"1/8"],[.25,"1/16"],[.125,"1/32"]].map(([v,label]) => <option key={v} value={v}>{label}</option>)}</select></label>
      <Button variant="outline" size="sm" aria-label="Hold reverse" aria-pressed={value.mode === 1} {...hold(1)}><Rewind size={14} /> Reverse</Button>
      <Button variant="outline" size="sm" aria-label="Hold stutter" aria-pressed={value.mode === 2} {...hold(2)}><Repeat2 size={14} /> Stutter</Button>
      <Button variant="outline" size="sm" aria-label="Hold tape stop" aria-pressed={value.mode === 3} {...hold(3)}><Pause size={14} /> Tape stop</Button>
      <Button variant="ghost" size="icon" title="Reset performance" aria-label="Reset performance" onClick={() => set({ time: 0, tension: 0, mode: 0 })}><RotateCcw size={14} /></Button>
    </div>
  </div>;
}
