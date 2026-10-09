import { memo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { NOTE_NAMES, RATES, SCALES, degreeCount, midiOf, noteName, randomizeArp, type ArpParams, type ArpStep, type RateName, type ScaleName } from "@/audio/arp";

type Props = { arp: ArpParams; slotName: string; onChange: (arp: ArpParams) => void };

function ArpEditor({ arp, slotName, onChange }: Props) {
  const [sel, setSel] = useState(0);
  const set = (p: Partial<ArpParams>) => onChange({ ...arp, ...p });
  const setCell = (i: number, p: Partial<ArpStep>) => set({ cells: arp.cells.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const span = degreeCount(arp.scale), cur = arp.cells[Math.min(sel, arp.steps - 1)], selIdx = Math.min(sel, arp.steps - 1);
  const deg = Math.min(cur.deg, span - 1);

  return <div className="node-body arp-body">
    <div className="arp-head">
      <button className={`gb-mute ${arp.on ? "selected" : ""}`} aria-pressed={arp.on} onClick={() => set({ on: !arp.on })}>{arp.on ? "PHRASE ON" : "PHRASE OFF"}</button>
      <button className="gb-mute" aria-label="Randomize phrase" onClick={() => onChange(randomizeArp(arp))}>⚄ RANDOM</button>
      <span className="patch-small">{arp.on ? `hold ${slotName} to loop` : "pad plays single notes"}</span>
    </div>
    <div className={`arp-controls ${arp.on ? "" : "is-off"}`}>
      <label className="arp-field">root<select value={arp.root} onChange={e => set({ root: +e.target.value })}>{NOTE_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}</select></label>
      <label className="arp-field">scale<select value={arp.scale} onChange={e => set({ scale: e.target.value as ScaleName })}>{Object.keys(SCALES).map(s => <option key={s}>{s}</option>)}</select></label>
      <label className="arp-field">oct<select value={arp.octave} onChange={e => set({ octave: +e.target.value })}>{[1, 2, 3, 4, 5].map(o => <option key={o}>{o}</option>)}</select></label>
      <label className="arp-field">steps<select value={arp.steps} onChange={e => set({ steps: +e.target.value })}>{Array.from({ length: 16 }, (_, i) => <option key={i}>{i + 1}</option>)}</select></label>
      <button className={`gb-mute ${arp.sync ? "selected" : ""}`} aria-pressed={arp.sync} onClick={() => set({ sync: !arp.sync })}>{arp.sync ? "SYNC" : "FREE"}</button>
      {arp.sync
        ? <label className="arp-field">rate<select value={arp.rate} onChange={e => set({ rate: e.target.value as RateName })}>{Object.keys(RATES).map(r => <option key={r}>{r}</option>)}</select></label>
        : <label className="arp-field">ms<input className="gb-input" type="number" min={40} max={1000} value={arp.freeMs} onChange={e => set({ freeMs: Math.min(1000, Math.max(40, +e.target.value || 40)) })} /></label>}
    </div>

    <div className="arp-grid" style={{ gridTemplateColumns: `repeat(${arp.steps}, minmax(18px, 1fr))` }}>
      {arp.cells.slice(0, arp.steps).map((c, i) => {
        const d = Math.min(c.deg, span - 1);
        return <button key={i} className={`arp-cell ${c.on ? "on" : "rest"} ${selIdx === i ? "sel" : ""} ${c.on && c.slide && i > 0 ? "slide" : ""}`} aria-label={`Step ${i + 1} ${c.on ? noteName(midiOf(arp, d)) : "rest"}`}
          onClick={() => (selIdx === i ? setCell(i, { on: !c.on }) : setSel(i))}>
          <i style={{ height: `${((d + 1) / span) * 100}%`, opacity: c.on ? 0.35 + c.vel * 0.65 : 0.15 }} />
          <span>{c.on ? noteName(midiOf(arp, d)).replace(/-?\d+$/, "") : "·"}</span>
        </button>;
      })}
    </div>
    <span className="patch-small">tap a step to select · tap again to toggle note / rest · slide glides into the step</span>

    <div className="arp-step">
      <div className="parameter-label">Step {selIdx + 1} pitch <span>{noteName(midiOf(arp, deg))}</span></div>
      <div className="arp-notes" style={{ gridTemplateColumns: `repeat(${span}, minmax(0, 1fr))` }}>
        {Array.from({ length: span }, (_, k) => <button key={k} className={k === deg ? "selected" : ""} aria-pressed={k === deg} onClick={() => setCell(selIdx, { deg: k, on: true })}>{noteName(midiOf(arp, k)).replace(/-?\d+$/, "")}</button>)}
      </div>
      <div className="arp-controls">
        <button className={`gb-mute ${cur.slide ? "selected" : ""}`} aria-pressed={!!cur.slide} aria-label="Step slide" onClick={() => setCell(selIdx, { slide: !cur.slide, on: true })}>{cur.slide ? "SLIDE ON" : "SLIDE OFF"}</button>
        <div className="gb-param" style={{ flex: 1, minWidth: 140 }}><div className="parameter-label">Glide time<span>{arp.glide ?? 80} ms</span></div>
          <Slider aria-label="Phrase glide time" resetValue={[80]} min={10} max={400} step={5} value={[arp.glide ?? 80]} onValueChange={([v]) => set({ glide: v })} className="patch-slider" /></div>
      </div>
      <div className="gb-cols2">
        <div className="gb-param"><div className="parameter-label">Velocity<span>{Math.round(cur.vel * 100)}</span></div>
          <Slider aria-label="Step velocity" min={0.05} max={1} step={0.01} value={[cur.vel]} onValueChange={([v]) => setCell(selIdx, { vel: v })} className="patch-slider" /></div>
        <div className="gb-param"><div className="parameter-label">Gate<span>{Math.round(cur.gate * 100)}%</span></div>
          <Slider aria-label="Step gate" min={0.05} max={1} step={0.01} value={[cur.gate]} onValueChange={([v]) => setCell(selIdx, { gate: v })} className="patch-slider" /></div>
      </div>
    </div>
  </div>;
}
export default memo(ArpEditor);
