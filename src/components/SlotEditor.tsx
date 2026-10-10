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
import { SlotScreen, ChordScreen } from "@/components/SlotScreens";

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
    <SlotScreen slot={slot} onChange={onChange} />
    {(slot.engine === "sampler" || slot.engine === "poly") && <ChordScreen slot={slot} onChange={onChange} />}

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
