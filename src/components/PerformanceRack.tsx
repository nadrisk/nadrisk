import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, Rewind, Pause, Repeat2 } from "lucide-react";
import { ECHO_DIVS, type PerformanceParams } from "@/audio/performance";
export default function PerformanceRack({ value, onChange }: { value: PerformanceParams; onChange: (p: PerformanceParams) => void }) {
  const set = (patch: Partial<PerformanceParams>) => onChange({ ...value, ...patch });
  const hold = (mode: number) => ({ onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); set({ mode }); }, onPointerUp: () => set({ mode: 0 }), onPointerCancel: () => set({ mode: 0 }), onLostPointerCapture: () => set({ mode: 0 }), onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); set({ mode }); } }, onKeyUp: () => set({ mode: 0 }), onBlur: () => set({ mode: 0 }) });
  return <div className="node-body nad-performance">
    <div className="gb-cols2">
      <div className="gb-param"><div className="parameter-label">Envelope time<span>{value.time > 0 ? "+" : ""}{Math.round(value.time * 100)}%</span></div><Slider aria-label="Global envelope time" resetValue={[0]} min={-1} max={1} step={.01} value={[value.time]} onValueChange={([time]) => set({ time })} /></div>
      <div className="gb-param"><div className="parameter-label">Tension<span>{Math.round(value.tension * 100)}%</span></div><Slider aria-label="Tension" resetValue={[0]} min={0} max={1} step={.01} value={[value.tension]} onValueChange={([tension]) => set({ tension })} /></div>
    </div>
    <div className="gb-cols2">
      <div className="gb-param"><div className="parameter-label">DJ filter<span>{(value.djSweep ?? 0) === 0 ? "OFF" : (value.djSweep ?? 0) < 0 ? `LP ${Math.round(-(value.djSweep ?? 0) * 100)}` : `HP ${Math.round((value.djSweep ?? 0) * 100)}`}</span></div><Slider aria-label="Performance DJ filter" resetValue={[0]} min={-1} max={1} step={.01} value={[value.djSweep ?? 0]} onValueChange={([djSweep]) => set({ djSweep })} /></div>
      <div className="gb-param"><div className="parameter-label">Filter res<span>{(value.djRes ?? 1).toFixed(1)}</span></div><Slider aria-label="Performance filter resonance" resetValue={[1]} min={.1} max={10} step={.1} value={[value.djRes ?? 1]} onValueChange={([djRes]) => set({ djRes })} /></div>
      <div className="gb-param"><div className="parameter-label">Dub echo send<span>{Math.round((value.echoSend ?? 0) * 100)}%</span></div><Slider aria-label="Dub echo send" resetValue={[0]} min={0} max={1} step={.01} value={[value.echoSend ?? 0]} onValueChange={([echoSend]) => set({ echoSend })} /></div>
      <div className="gb-param"><div className="parameter-label">Echo feedback<span>{Math.round((value.echoFeedback ?? .7) * 100)}%</span></div><Slider aria-label="Dub echo feedback" resetValue={[.7]} min={0} max={1.1} step={.01} value={[value.echoFeedback ?? .7]} onValueChange={([echoFeedback]) => set({ echoFeedback })} /></div>
      <div className="gb-param"><div className="parameter-label">Echo time<span>{ECHO_DIVS[value.echoDiv ?? 3][0]}</span></div><Slider aria-label="Dub echo time" resetValue={[3]} min={0} max={ECHO_DIVS.length - 1} step={1} value={[value.echoDiv ?? 3]} onValueChange={([echoDiv]) => set({ echoDiv })} /></div>
      <div className="gb-param"><div className="parameter-label">Echo tone<span>{Math.round(value.echoTone ?? 2200)} Hz</span></div><Slider aria-label="Dub echo tone" resetValue={[2200]} min={400} max={8000} step={10} value={[value.echoTone ?? 2200]} onValueChange={([echoTone]) => set({ echoTone })} /></div>
    </div>
    <div className="gb-param"><div className="parameter-label">{value.loop ? "Loop window" : "Sequencer offset"}<span>{value.offset > 0 ? "+" : ""}{value.offset} steps</span></div><Slider aria-label="Sequencer offset" resetValue={[0]} min={-8} max={8} step={1} value={[value.offset]} onValueChange={([offset]) => set({ offset })} /></div>
    <div className="gb-banks gb-loops" role="group" aria-label="Loop shortener">{[0, 1, 2, 4, 8].map(n => <button key={n} className={`gb-bank ${value.loop === n ? "active" : ""}`} aria-pressed={value.loop === n} aria-label={n ? `Loop first ${n} steps` : "Loop full"} onClick={() => set({ loop: n })}>{n ? n : "FULL"}</button>)}</div>
    <div className="arp-controls">
      <label className="arp-field">Tension mode<select aria-label="Tension mode" value={value.style} onChange={e => set({ style: e.target.value as PerformanceParams["style"] })}><option value="sweep">Hyper sweep</option><option value="whiteout">Whiteout</option><option value="cyber">Cyber drop</option></select></label>
      <label className="arp-field">Chord pads<select aria-label="Chord performance mode" value={value.chordMode ?? "pad"} onChange={e => set({ chordMode: e.target.value as PerformanceParams["chordMode"] })}><option value="pad">per pad</option><option value="block">all block</option><option value="strum">all strum</option><option value="arp">all arp</option></select></label>
      <label className="arp-field">Capture length<select aria-label="Repeat length" value={value.division} onChange={e => set({ division: +e.target.value })}>{[[1,"1/4"],[.5,"1/8"],[.25,"1/16"],[.125,"1/32"]].map(([v,label]) => <option key={v} value={v}>{label}</option>)}</select></label>
      <Button variant="outline" size="sm" aria-label="Hold reverse" aria-pressed={value.mode === 1} {...hold(1)}><Rewind size={14} /> Reverse</Button>
      <Button variant="outline" size="sm" aria-label="Hold stutter" aria-pressed={value.mode === 2} {...hold(2)}><Repeat2 size={14} /> Stutter</Button>
      <Button variant="outline" size="sm" aria-label="Hold tape stop" aria-pressed={value.mode === 3} {...hold(3)}><Pause size={14} /> Tape stop</Button>
      <Button variant="ghost" size="icon" title="Reset performance" aria-label="Reset performance" onClick={() => set({ time: 0, tension: 0, mode: 0, offset: 0, loop: 0, djSweep: 0, echoSend: 0 })}><RotateCcw size={14} /></Button>
    </div>
  </div>;
}
