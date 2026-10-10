import { memo, useEffect, useState } from "react";
import { FolderOpen, Upload } from "lucide-react";
import { LIBRARY, listCached, type SampleRef } from "@/audio/sampleStore";
import { Button } from "@/components/ui/button";
import { CHORDS, type ChordArp, type ChordPlay } from "@/audio/musical";
import { RATES, type RateName } from "@/audio/arp";
import HwKnob from "@/components/HwKnob";
import type { EngineKind, Slot } from "@/hooks/useGroovebox";
import WispdiskPanel from "@/components/WispdiskPanel";
import CyberspacePanel from "@/components/CyberspacePanel";
import DrumkitPanel from "@/components/DrumkitPanel";
import Sub808Panel from "@/components/Sub808Panel";
import SirenPanel from "@/components/SirenPanel";
import EnsemblePanel from "@/components/EnsemblePanel";

function P(props: { label: string; value: number; min: number; max: number; step?: number; fmt?: (v: number) => string; onChange: (v: number) => void }) {
  return <HwKnob {...props} />;
}
function Seg<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: string }) {
  return <div className="gb-kinds" role="group" aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>{options.map(o => <button key={o} aria-pressed={o === value} className={o === value ? "selected" : ""} onClick={() => onChange(o)}>{o}</button>)}</div>;
}

function SamplePicker({ value, onPick, onFolder }: { value?: string; onPick: (id: string, name: string) => void; onFolder: (f: File[]) => Promise<{ total: number; matched: number }> }) {
  const [cached, setCached] = useState<SampleRef[]>([]);
  const [msg, setMsg] = useState("");
  const refresh = () => { listCached().then(setCached).catch(() => setCached([])); };
  useEffect(refresh, [value]);
  const all = [...LIBRARY.map(n => ({ id: `lib:${n}`, name: n })), ...cached];
  return <>
    <div className="gb-cols2">
      <select className="gb-row-len gb-sample-pick" aria-label="Choose sample" value={value ?? ""} onFocus={refresh} onChange={e => { const r = all.find(x => x.id === e.target.value); if (r) onPick(r.id, r.name); }}>
        <option value="" disabled>choose sample…</option>
        <optgroup label="nadrisk library">{LIBRARY.map(n => <option key={n} value={`lib:${n}`}>{n}</option>)}</optgroup>
        {cached.length > 0 && <optgroup label="your samples (saved here)">{cached.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
      </select>
      <label className="gb-upload"><FolderOpen size={12} /> load folder<input type="file" multiple className="sr-only" {...{ webkitdirectory: "", directory: "" }} onChange={async e => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (!f.length) return; const r = await onFolder(f); refresh(); setMsg(`${r.total} saved · ${r.matched} matched to pads by name`); }} /></label>
    </div>
    {msg && <span className="patch-small">{msg}</span>}
  </>;
}

function SlotEditor({ slot, peaks, onChange, onLoad, onLoadId, onLoadFolder }: { slot: Slot; peaks: number[] | null; onChange: (p: Partial<Slot>) => void; onLoad: (f: File) => void; onLoadId: (id: string, name: string) => void; onLoadFolder: (f: File[]) => Promise<{ total: number; matched: number }> }) {
  const sm = slot.sampler;
  return <div className="node-body gb-editor-body">
    <div className="gb-cols2">
      <label className="parameter-label gb-inline">Name<input className="gb-input" value={slot.name} maxLength={10} onChange={e => onChange({ name: e.target.value.toUpperCase() })} /></label>
      <button className={`gb-mute ${slot.mute ? "selected" : ""}`} onClick={() => onChange({ mute: !slot.mute })}>{slot.mute ? "MUTED" : "MUTE"}</button>
    </div>
    <Seg label="Instrument" options={["drum", "synth", "sampler", "poly", "808", "siren"] as const} value={slot.engine} onChange={(v: EngineKind) => onChange({ engine: v })} />
    {slot.engine !== "sampler" && <div className="gb-cols2">
      <P label="Volume" value={slot.level} min={0} max={100} fmt={v => `${v}%`} onChange={level => onChange({ level })} />
      <P label="Pan" value={slot.pan} min={-1} max={1} step={0.01} fmt={v => (v === 0 ? "C" : v < 0 ? `L${Math.round(-v * 100)}` : `R${Math.round(v * 100)}`)} onChange={pan => onChange({ pan })} />
    </div>}


    <label className="arp-field">Choke group<select aria-label="Choke group" value={slot.choke} onChange={e => onChange({ choke: +e.target.value })}>{[0,1,2,3,4].map(n => <option key={n} value={n}>{n ? `Group ${n}` : "Off"}</option>)}</select></label>
    {(slot.engine === "sampler" || slot.engine === "poly") && <fieldset className="gb-group"><legend>chord pad</legend>
      <div className="arp-controls"><Button variant="outline" size="sm" aria-pressed={slot.chord.on} onClick={() => onChange({ chord: { ...slot.chord, on: !slot.chord.on } })}>CHORD {slot.chord.on ? "ON" : "OFF"}</Button>
      <label className="arp-field">Voicing<select aria-label="Chord voicing" value={slot.chord.type} onChange={e => onChange({ chord: { ...slot.chord, type: e.target.value as keyof typeof CHORDS } })}>{Object.keys(CHORDS).map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="arp-field">Inversion<select aria-label="Chord inversion" value={slot.chord.inversion} onChange={e => onChange({ chord: { ...slot.chord, inversion: +e.target.value } })}>{[0,1,2].map(n => <option value={n} key={n}>{n === 0 ? "Root" : `${n}${n === 1 ? "st" : "nd"}`}</option>)}</select></label>
      <Button variant="outline" size="sm" aria-pressed={slot.chord.spread} onClick={() => onChange({ chord: { ...slot.chord, spread: !slot.chord.spread } })}>Spread {slot.chord.spread ? "on" : "off"}</Button></div>
      <Seg label="Chord play mode" options={["block", "strum", "arp"] as const} value={slot.chord.play ?? "block"} onChange={(play: ChordPlay) => onChange({ chord: { ...slot.chord, play } })} />
      {slot.chord.play === "arp" && <div className="arp-controls">
        <label className="arp-field">Order<select aria-label="Chord arp order" value={slot.chord.arp ?? "up"} onChange={e => onChange({ chord: { ...slot.chord, arp: e.target.value as ChordArp } })}>{["up", "down", "updown", "random"].map(o => <option key={o}>{o}</option>)}</select></label>
        <label className="arp-field">Rate<select aria-label="Chord arp rate" value={slot.chord.rate ?? "1/16"} onChange={e => onChange({ chord: { ...slot.chord, rate: e.target.value as RateName } })}>{Object.keys(RATES).map(r => <option key={r}>{r}</option>)}</select></label>
      </div>}
      {slot.chord.play === "strum" && <P label="Strum time" value={slot.chord.strum ?? 30} min={5} max={150} step={1} fmt={v => `${v} ms`} onChange={strum => onChange({ chord: { ...slot.chord, strum } })} />}
    </fieldset>}

    {slot.engine === "drum" && <DrumkitPanel slot={slot} onChange={onChange} />}
    {slot.engine === "synth" && <CyberspacePanel slot={slot} onChange={onChange} />}
    {slot.engine === "808" && <Sub808Panel slot={slot} onChange={onChange} />}
    {slot.engine === "siren" && <SirenPanel slot={slot} onChange={onChange} />}
    {slot.engine === "poly" && <EnsemblePanel slot={slot} onChange={onChange} />}
    {slot.engine === "sampler" && <>
      <WispdiskPanel slot={slot} peaks={peaks} onChange={onChange} />
      <SamplePicker value={sm.sampleId} onPick={onLoadId} onFolder={onLoadFolder} />
      <label className="gb-upload"><Upload size={12} /> import sample<input type="file" accept="audio/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) onLoad(f); e.target.value = ""; }} /></label>
    </>}
  </div>;
}

export default memo(SlotEditor);
