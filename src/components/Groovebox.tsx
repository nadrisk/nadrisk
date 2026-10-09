import { memo, useCallback } from "react";
import type { MutableRefObject } from "react";
import { AudioLines, Dice5, Eraser, Play, Leaf, RotateCcw, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useGroovebox, type Slot } from "@/hooks/useGroovebox";
import type { FxUnit } from "@/audio/effects";
import PatchNode from "./PatchNode";
import SlotEditor from "./SlotEditor";
import FxChain from "./FxChain";
import ArpEditor from "./ArpEditor";
import type { ArpParams } from "@/audio/arp";
import Waveform from "./Waveform";
import type { StepVal } from "@/hooks/useGroovebox";

// Pads and the sequencer grid are memoized so a sequencer tick never re-renders the editor or
// fx panels, and a pad hit never waits on the sequencer — key for responsive finger drumming.
const PadGrid = memo(function PadGrid({ slots, selected, padRefs, onHit, onRelease }: {
  slots: Slot[]; selected: number; padRefs: MutableRefObject<(HTMLButtonElement | null)[]>; onHit: (i: number) => void; onRelease: (i: number) => void;
}) {
  return <div className="gb-pads">{slots.map((slot, i) => <button key={i} ref={el => (padRefs.current[i] = el)} onPointerDown={ev => { ev.preventDefault(); ev.currentTarget.setPointerCapture?.(ev.pointerId); onHit(i); }} onPointerUp={() => onRelease(i)} onPointerCancel={() => onRelease(i)} onLostPointerCapture={() => onRelease(i)} onKeyDown={ev => { if ((ev.key === "Enter" || ev.key === " ") && !ev.repeat) { ev.preventDefault(); onHit(i); } }} onKeyUp={ev => { if (ev.key === "Enter" || ev.key === " ") onRelease(i); }} onBlur={() => onRelease(i)} className={`gb-pad ${slot.arp.on ? "has-arp" : ""} ${selected === i ? "selected" : ""} ${slot.mute ? "muted" : ""}`} aria-label={`Play ${slot.name}`}>
    <span className="gb-pad-index">{String(i + 1).padStart(2, "0")}</span><span className="gb-pad-name">{slot.name}</span><span className="gb-pad-kind">{slot.engine === "drum" ? `drum · ${slot.drum.kind}` : slot.engine}</span>
  </button>)}</div>;
});

const StepGrid = memo(function StepGrid({ pattern, lengths, slots, selected, step, onToggle, onSelect, onLength }: {
  pattern: StepVal[][]; lengths: number[]; slots: Slot[]; selected: number; step: number; onToggle: (r: number, c: number) => void; onSelect: (i: number) => void; onLength: (r: number, len: number) => void;
}) {
  return <div className="gb-seq-grid">{pattern.map((row, r) => { const len = lengths[r], cur = step < 0 ? -1 : step % len; return <div key={r} className={`gb-row ${selected === r ? "selected" : ""}`}>
    <button className="gb-row-label" onClick={() => onSelect(r)}>{slots[r].name}</button>
    <select className="gb-row-len" aria-label={`${slots[r].name} loop length`} value={len} onChange={e => onLength(r, +e.target.value)}>{Array.from({ length: 16 }, (_, k) => <option key={k} value={k + 1}>{k + 1}</option>)}</select>
    {row.map((v, c) => { const off = c >= len, tieNext = !off && c + 1 < len && row[c + 1] === 2 && v !== 0;
      return <button key={c} disabled={off} aria-label={`${slots[r].name} step ${c + 1} ${v === 2 ? "tie" : v === 1 ? "hit" : "off"}`} onPointerDown={ev => { ev.preventDefault(); onToggle(r, c); }} onKeyDown={ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onToggle(r, c); } }} className={`gb-step ${v === 1 ? "on" : v === 2 ? "tie" : ""} ${tieNext ? "tie-next" : ""} ${off ? "disabled" : ""} ${c === cur ? "current" : ""} ${c % 4 === 0 ? "beat" : ""}`} />; })}
  </div>; })}</div>;
});

const Mixer = memo(function Mixer({ slots, selected, onLevel, onMute, onSolo, onClearSolo, onSelect }: {
  slots: Slot[]; selected: number; onLevel: (i: number, v: number) => void; onMute: (i: number) => void; onSolo: (i: number) => void; onClearSolo: () => void; onSelect: (i: number) => void;
}) {
  const anySolo = slots.some(s => s.solo);
  return <div className="node-body">
    <div className="gb-seq-tools" style={{ padding: 0 }}><Button variant="ghost" size="sm" disabled={!anySolo} onClick={onClearSolo}>clear solo</Button></div>
    <div className="gb-mixer">{slots.map((s, i) => <div key={i} className={`gb-strip ${selected === i ? "selected" : ""} ${s.mute || (anySolo && !s.solo) ? "silent" : ""}`}>
      <span className="gb-strip-val">{s.level}</span>
      <Slider orientation="vertical" aria-label={`${s.name} volume`} min={0} max={100} value={[s.level]} onValueChange={([v]) => onLevel(i, v)} className="gb-vslider" />
      <div className="gb-strip-btns">
        <button className={`gb-ms ${s.mute ? "m-on" : ""}`} aria-pressed={s.mute} aria-label={`Mute ${s.name}`} onClick={() => onMute(i)}>M</button>
        <button className={`gb-ms ${s.solo ? "s-on" : ""}`} aria-pressed={s.solo} aria-label={`Solo ${s.name}`} onClick={() => onSolo(i)}>S</button>
      </div>
      <button className="gb-strip-name" onClick={() => onSelect(i)}>{s.name}</button>
    </div>)}</div>
  </div>;
});

export default function Groovebox() {
  const g = useGroovebox();
  const s = g.slots[g.selected];
  const onFx = useCallback((fx: FxUnit[]) => g.updateSelected({ fx }), [g.updateSelected]);
  const onArp = useCallback((arp: ArpParams) => g.updateSelected({ arp }), [g.updateSelected]);
  return <section className="instrument-workspace" aria-label="Nadrisk groovebox">
    <div className="workspace-heading"><span><span className="status-dot" /> NAD_RACK.maxpat</span><span>16-SLOT RACK / STEP SEQUENCER</span><span className="workspace-index">01 / GROOVEBOX</span></div>
    <div className="gb-grid">
      <PatchNode label="drum.rack 4x4" tag="INSTRUMENT RACK" className="gb-rack">
        <PadGrid slots={g.slots} selected={g.selected} padRefs={g.padRefs} onHit={g.hit} onRelease={g.release} />
      </PatchNode>

      <PatchNode label={`slot.${String(g.selected + 1).padStart(2, "0")} ${s.engine}~`} tag="INSTRUMENT" className="gb-editor">
        <SlotEditor slot={s} peaks={g.peaks[g.selected]} onChange={g.updateSelected} onLoad={g.loadSelected} />
      </PatchNode>

      <PatchNode label="gain~ → ezdac~" tag="MASTER OUTPUT" className="gb-master">
        <div className="node-body">
          <div className="transport-body">
            <Button variant="ghost" className={`transport-button ${g.playing ? "is-playing" : ""}`} onClick={g.togglePlay} aria-label={g.playing ? "Stop" : "Play"}>{g.playing ? <Square /> : <Play />}</Button>
            <div><span className="transport-state">{g.playing ? "RUNNING" : "STOPPED"}</span><span className="patch-small">step {g.step < 0 ? "--" : (g.step % 16) + 1} / 16</span></div>
          </div>
          <div className="parameter-label">Tempo <span>{g.bpm} BPM</span></div>
          <Slider aria-label="Tempo" min={60} max={180} value={[g.bpm]} onValueChange={([v]) => g.setBpm(v)} className="patch-slider" />
          <div className="parameter-label"><span className="volume-label"><Volume2 size={14} /> Master</span><span>{g.volume}%</span></div>
          <Slider aria-label="Master volume" min={0} max={100} value={[g.volume]} onValueChange={([v]) => g.setVolume(v)} className="patch-slider" />
          <Button variant="ghost" size="sm" className={`gb-eco ${g.eco ? "on" : ""}`} aria-pressed={g.eco} onClick={() => g.setEco(!g.eco)}><Leaf size={12} /> eco mode {g.eco ? "on" : "off"}</Button>
          <span className="patch-small">device audio delay {g.latency == null ? "--" : `${g.latency} ms`}</span>
          <div className="scope-node gb-scope"><Waveform analyser={g.engine.current?.analyser ?? null} playing={!!g.engine.current} eco={g.eco} /></div>
        </div>
      </PatchNode>

      <PatchNode label={`phrase.seq slot.${String(g.selected + 1).padStart(2, "0")}`} tag="PAD SEQUENCER · PRE-INSTRUMENT" className="gb-arpnode">
        <ArpEditor arp={s.arp} slotName={s.name} onChange={onArp} />
      </PatchNode>

      <PatchNode label={`fx.chain slot.${String(g.selected + 1).padStart(2, "0")}`} tag="EFFECTS · SIGNAL ORDER" className="gb-fxnode">
        <FxChain slotName={s.name} fx={s.fx} onChange={onFx} />
      </PatchNode>

      <PatchNode label="mixer~ 16ch" tag="MIXER · VOL / MUTE / SOLO" className="gb-mixnode">
        <Mixer slots={g.slots} selected={g.selected} onLevel={g.setLevel} onMute={g.toggleMute} onSolo={g.toggleSolo} onClearSolo={g.clearSolo} onSelect={g.setSelected} />
      </PatchNode>

      <PatchNode label={`step.seq 16 · pattern ${g.bank ? "B" : "A"}`} tag="SEQUENCER" className="gb-seq">
        <div className="gb-seq-tools">
          <div className="gb-banks">{["A", "B"].map((n, b) => <button key={n} className={`gb-bank ${g.bank === b ? "active" : ""} ${g.queued === b ? "queued" : ""}`} aria-pressed={g.bank === b} onClick={() => g.selectBank(b)}>{n}</button>)}</div>
          <Button variant="ghost" size="sm" onClick={g.copyBank}>copy → {g.bank ? "A" : "B"}</Button>
          <Button variant="ghost" size="sm" onClick={g.randomizePattern}><Dice5 size={12} /> random</Button>
          <Button variant="ghost" size="sm" onClick={g.clearPattern}><Eraser size={12} /> clear</Button>
          <Button variant="ghost" size="sm" onClick={g.resetAll}><RotateCcw size={12} /> reset</Button>
        </div>
        <StepGrid pattern={g.pattern} lengths={g.lengths} onLength={g.setTrackLength} slots={g.slots} selected={g.selected} step={g.step} onToggle={g.toggleStep} onSelect={g.setSelected} />
      </PatchNode>
    </div>
    <div className="workspace-footer"><span><AudioLines size={13} />{g.error || (g.queued != null ? `PATTERN ${g.queued ? "B" : "A"} QUEUED · NEXT BAR` : g.playing ? "SEQUENCER RUNNING" : "TAP A PAD OR PRESS PLAY")}</span><span>DRUM / SYNTH / SAMPLER <span className="footer-separator">/</span> WEB AUDIO</span><span className="workspace-index">NADRISK © 2026</span></div>
  </section>;
}
