import { Dice5, Power, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { FX_DEFS } from "@/audio/effects";
import type { Slot } from "@/hooks/useGroovebox";
import type { ModLane } from "@/audio/musical";
export default function ModEditor({ slot, bank, onChange }: { slot: Slot; bank: number; onChange: (lanes: ModLane[]) => void }) {
  const lane = slot.mods[bank];
  const set = (patch: Partial<ModLane>) => onChange(slot.mods.map((l, i) => i === bank ? { ...l, ...patch } : l));
  return <div className="node-body arp-body">
    <div className="arp-controls">
      <Button variant="outline" size="sm" aria-pressed={lane.on} onClick={() => set({ on: !lane.on })}><Power size={12} /> MOD {lane.on ? "ON" : "OFF"}</Button>
      <label className="arp-field">Target<select aria-label="Modulation target" value={lane.target} onChange={e => set({ target: e.target.value })}><option value="cutoff">Filter cutoff</option>{slot.fx.filter(f => "mix" in FX_DEFS[f.type].params).map(f => <option key={f.id} value={`${f.id}:mix`}>{FX_DEFS[f.type].label} dry/wet</option>)}</select></label>
      <label className="arp-field">Length<select aria-label="Modulation length" value={lane.steps} onChange={e => set({ steps: +e.target.value })}>{Array.from({ length: 16 }, (_, i) => <option key={i}>{i + 1}</option>)}</select></label>
      <Button variant="ghost" size="icon" aria-label="Randomize modulation" title="Randomize modulation" onClick={() => set({ values: lane.values.map(() => Math.random()) })}><Dice5 size={14} /></Button>
      <Button variant="ghost" size="icon" aria-label="Reset modulation" title="Reset modulation" onClick={() => set({ values: Array(16).fill(.5) })}><RotateCcw size={14} /></Button>
      <span className="patch-small">PATTERN {bank ? "B" : "A"}</span>
    </div>
    <div className="nad-mod-grid">{lane.values.slice(0, lane.steps).map((v, i) => <div className="nad-mod-step" key={i}><span>{Math.round(v * 100)}</span><Slider orientation="vertical" className="gb-vslider" aria-label={`Modulation step ${i + 1}`} value={[v]} min={0} max={1} step={.01} onValueChange={([n]) => set({ values: lane.values.map((x, j) => j === i ? n : x) })} /><span>{i + 1}</span></div>)}</div>
  </div>;
}
