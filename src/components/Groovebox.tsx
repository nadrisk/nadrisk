import { AudioLines, Dice5, Eraser, Play, Leaf, RotateCcw, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useGroovebox } from "@/hooks/useGroovebox";
import PatchNode from "./PatchNode";
import SlotEditor from "./SlotEditor";
import FxChain from "./FxChain";
import Waveform from "./Waveform";

export default function Groovebox() {
  const g = useGroovebox();
  const s = g.slots[g.selected];
  return <section className="instrument-workspace" aria-label="Nadrisk groovebox">
    <div className="workspace-heading"><span><span className="status-dot" /> NAD_RACK.maxpat</span><span>16-SLOT RACK / STEP SEQUENCER</span><span className="workspace-index">01 / GROOVEBOX</span></div>
    <div className="gb-grid">
      <PatchNode label="drum.rack 4x4" tag="INSTRUMENT RACK" className="gb-rack">
        <div className="gb-pads">{g.slots.map((slot, i) => <button key={i} ref={el => (g.padRefs.current[i] = el)} onPointerDown={ev => { ev.preventDefault(); g.hit(i); }} onKeyDown={ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); g.hit(i); } }} className={`gb-pad ${g.selected === i ? "selected" : ""} ${slot.mute ? "muted" : ""}`} aria-label={`Play ${slot.name}`}>
          <span className="gb-pad-index">{String(i + 1).padStart(2, "0")}</span><span className="gb-pad-name">{slot.name}</span><span className="gb-pad-kind">{slot.engine === "drum" ? `drum · ${slot.drum.kind}` : slot.engine}</span>
        </button>)}</div>
      </PatchNode>

      <PatchNode label={`slot.${String(g.selected + 1).padStart(2, "0")} ${s.engine}~`} tag="INSTRUMENT" className="gb-editor">
        <SlotEditor slot={s} peaks={g.peaks[g.selected]} onChange={p => g.updateSlot(g.selected, p)} onLoad={f => g.loadSample(g.selected, f)} />
      </PatchNode>

      <PatchNode label="gain~ → ezdac~" tag="MASTER OUTPUT" className="gb-master">
        <div className="node-body">
          <div className="transport-body">
            <Button variant="ghost" className={`transport-button ${g.playing ? "is-playing" : ""}`} onClick={g.togglePlay} aria-label={g.playing ? "Stop" : "Play"}>{g.playing ? <Square /> : <Play />}</Button>
            <div><span className="transport-state">{g.playing ? "RUNNING" : "STOPPED"}</span><span className="patch-small">step {g.step < 0 ? "--" : g.step + 1} / 16</span></div>
          </div>
          <div className="parameter-label">Tempo <span>{g.bpm} BPM</span></div>
          <Slider aria-label="Tempo" min={60} max={180} value={[g.bpm]} onValueChange={([v]) => g.setBpm(v)} className="patch-slider" />
          <div className="parameter-label"><span className="volume-label"><Volume2 size={14} /> Master</span><span>{g.volume}%</span></div>
          <Slider aria-label="Master volume" min={0} max={100} value={[g.volume]} onValueChange={([v]) => g.setVolume(v)} className="patch-slider" />
          <Button variant="ghost" size="sm" className={`gb-eco ${g.eco ? "on" : ""}`} aria-pressed={g.eco} onClick={() => g.setEco(!g.eco)}><Leaf size={12} /> eco mode {g.eco ? "on" : "off"}</Button>
          <div className="scope-node gb-scope"><Waveform analyser={g.engine.current?.analyser ?? null} playing={!!g.engine.current} eco={g.eco} /></div>
        </div>
      </PatchNode>

      <PatchNode label={`fx.chain slot.${String(g.selected + 1).padStart(2, "0")}`} tag="EFFECTS · SIGNAL ORDER" className="gb-fxnode">
        <FxChain slotName={s.name} fx={s.fx} onChange={fx => g.updateSlot(g.selected, { fx })} />
      </PatchNode>

      <PatchNode label="step.seq 16" tag="SEQUENCER" className="gb-seq">
        <div className="gb-seq-tools">
          <Button variant="ghost" size="sm" onClick={g.randomizePattern}><Dice5 size={12} /> random</Button>
          <Button variant="ghost" size="sm" onClick={g.clearPattern}><Eraser size={12} /> clear</Button>
          <Button variant="ghost" size="sm" onClick={g.resetAll}><RotateCcw size={12} /> reset</Button>
        </div>
        <div className="gb-seq-grid">{g.pattern.map((row, r) => <div key={r} className={`gb-row ${g.selected === r ? "selected" : ""}`}>
          <button className="gb-row-label" onClick={() => g.setSelected(r)}>{g.slots[r].name}</button>
          {row.map((on, c) => <button key={c} aria-label={`${g.slots[r].name} step ${c + 1}`} aria-pressed={on} onPointerDown={ev => { ev.preventDefault(); g.toggleStep(r, c); }} onKeyDown={ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); g.toggleStep(r, c); } }} className={`gb-step ${on ? "on" : ""} ${c === g.step ? "current" : ""} ${c % 4 === 0 ? "beat" : ""}`} />)}
        </div>)}</div>
      </PatchNode>
    </div>
    <div className="workspace-footer"><span><AudioLines size={13} />{g.error || (g.playing ? "SEQUENCER RUNNING" : "TAP A PAD OR PRESS PLAY")}</span><span>DRUM / SYNTH / SAMPLER <span className="footer-separator">/</span> WEB AUDIO</span><span className="workspace-index">NADRISK © 2026</span></div>
  </section>;
}
