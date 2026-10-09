import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useMidi } from "@/hooks/useMidi";
import type { MutableRefObject } from "react";
import { AudioLines, Dice5, Eraser, Play, Leaf, RotateCcw, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider, ResetScope } from "@/components/ui/slider";
import TapeDeck from "./TapeDeck";
import { RATES, type RateName } from "@/audio/arp";
import { useGroovebox, stepAt, type Slot, type RepeatParams } from "@/hooks/useGroovebox";
import type { FxUnit } from "@/audio/effects";
import PatchNode from "./PatchNode";
import SlotEditor from "./SlotEditor";
import FxChain from "./FxChain";
import ArpEditor from "./ArpEditor";
import type { ArpParams } from "@/audio/arp";
import Waveform from "./Waveform";
import SetBank from "./SetBank";
import PerformanceRack from "./PerformanceRack";
import { FX_DEFS, MOD_LABEL, modParamsOf } from "@/audio/effects";
import VisualizerRack from "./VisualizerRack";
import type { StepVal } from "@/hooks/useGroovebox";

// Pads and the sequencer grid are memoized so a sequencer tick never re-renders the editor or
// fx panels, and a pad hit never waits on the sequencer — key for responsive finger drumming.
const PadGrid = memo(function PadGrid({ slots, selected, padRefs, onHit, onRelease, velMode, onVel }: {
  slots: Slot[]; selected: number; padRefs: MutableRefObject<(HTMLButtonElement | null)[]>; onHit: (i: number) => void; onRelease: (i: number) => void; velMode: boolean; onVel: (i: number, v: number) => void;
}) {
  // With pad repeat on, finger height inside the pad sets velocity (bottom = soft, top = loud), drawn as a fill.
  const vel = (i: number, e: React.PointerEvent<HTMLButtonElement>) => { const b = e.currentTarget.getBoundingClientRect(), v = Math.round(Math.min(1, Math.max(.05, 1 - (e.clientY - b.top) / b.height)) * 100) / 100; e.currentTarget.style.setProperty("--vel", String(v)); onVel(i, v); };
  return <div className={`gb-pads ${velMode ? "vel-mode" : ""}`}>{slots.map((slot, i) => <button key={i} ref={el => (padRefs.current[i] = el)} onPointerDown={ev => { ev.preventDefault(); ev.currentTarget.setPointerCapture?.(ev.pointerId); if (velMode) vel(i, ev); onHit(i); }} onPointerMove={ev => { if (velMode && ev.buttons) vel(i, ev); }} onPointerUp={() => onRelease(i)} onPointerCancel={() => onRelease(i)} onLostPointerCapture={() => onRelease(i)} onKeyDown={ev => { if ((ev.key === "Enter" || ev.key === " ") && !ev.repeat) { ev.preventDefault(); onHit(i); } }} onKeyUp={ev => { if (ev.key === "Enter" || ev.key === " ") onRelease(i); }} onBlur={() => onRelease(i)} className={`gb-pad ${slot.arp.on ? "has-arp" : ""} ${selected === i ? "selected" : ""} ${slot.mute ? "muted" : ""}`} aria-label={`Play ${slot.name}`}>
    {velMode && <i className="gb-pad-vel" aria-hidden="true" />}
    <span className="gb-pad-index">{String(i + 1).padStart(2, "0")}</span><span className="gb-pad-name">{slot.name}</span><span className="gb-pad-kind">{slot.engine === "drum" ? `drum · ${slot.drum.kind}` : slot.engine}</span>
  </button>)}</div>;
});

function RepeatBar({ repeat, onRepeat, rec, onRec }: { repeat: RepeatParams; onRepeat: (r: RepeatParams) => void; rec: boolean; onRec: (v: boolean) => void }) {
  return <div className="gb-seq-tools gb-repeat">
    <button className={`gb-mute ${repeat.on ? "selected" : ""}`} aria-pressed={repeat.on} aria-label="Pad repeat" onClick={() => onRepeat({ ...repeat, on: !repeat.on })}>REPEAT {repeat.on ? "ON" : "OFF"}</button>
    <div className="gb-banks"><button className={`gb-bank ${!repeat.latch ? "active" : ""}`} aria-pressed={!repeat.latch} onClick={() => onRepeat({ ...repeat, latch: false })}>HOLD</button><button className={`gb-bank ${repeat.latch ? "active" : ""}`} aria-pressed={repeat.latch} aria-label="Repeat latch" onClick={() => onRepeat({ ...repeat, latch: true })}>LATCH</button></div>
    <select className="gb-row-len" aria-label="Repeat rate" value={repeat.rate} onChange={e => onRepeat({ ...repeat, rate: e.target.value as RateName })}>{Object.keys(RATES).map(r => <option key={r}>{r}</option>)}</select>
    <button className={`gb-mute gb-rec ${rec ? "selected" : ""}`} aria-pressed={rec} aria-label="Record into sequencer" onClick={() => onRec(!rec)}>● REC</button>
  </div>;
}

/** Targets a row can modulate: filter cutoff, pitch (for glides), and the params of each effect on that pad. */
const targetsOf = (slot: Slot) => [["off", "no mod"], ["cutoff", "cutoff"], ...(slot.engine === "drum" || slot.engine === "poly" ? [] : [["pitch", "pitch"]]),
  ...slot.fx.flatMap(f => modParamsOf(f.type).map(k => [`${f.id}:${k}`, `${FX_DEFS[f.type].label.replace("~", "")} ${MOD_LABEL[k] ?? k}`]))];

type View = "note" | "mod" | "vel" | "chance";
const StepGrid = memo(function StepGrid({ pattern, lengths, slots, selected, step, bank, view, vel, chance, offset, loop, onToggle, onSelect, onLength, onValue, onModTarget }: {
  pattern: StepVal[][]; lengths: number[]; slots: Slot[]; selected: number; step: number; bank: number; view: View; vel: number[][]; chance: number[][]; offset: number; loop: number; onToggle: (r: number, c: number) => void; onSelect: (i: number) => void; onLength: (r: number, len: number) => void; onValue: (view: View, r: number, c: number, v: number) => void; onModTarget: (r: number, t: string) => void;
}) {
  const drag = (r: number, c: number, e: React.PointerEvent<HTMLButtonElement>) => { const b = e.currentTarget.getBoundingClientRect(); onValue(view, r, c, Math.round(Math.min(1, Math.max(0, 1 - (e.clientY - b.top) / b.height)) * 100) / 100); };
  return <div className={`gb-seq-grid ${view !== "note" ? "is-mod" : ""} view-${view}`}>{pattern.map((row, r) => { const len = lengths[r], cur = step < 0 ? -1 : stepAt(step, len, loop, offset), lane = slots[r].mods?.[bank], opts = targetsOf(slots[r]), tv = lane?.on && opts.some(o => o[0] === lane.target) ? lane.target : "off";
    const start = ((offset % len) + len) % len, inWin = (c: number) => !loop || loop >= len || ((c - start + len) % len) < loop;
    return <div key={r} className={`gb-row ${selected === r ? "selected" : ""}`}>
    <button className="gb-row-label" onClick={() => onSelect(r)}>{slots[r].name}</button>
    <select className="gb-row-len" aria-label={`${slots[r].name} loop length`} value={len} onChange={e => onLength(r, +e.target.value)}>{Array.from({ length: 16 }, (_, k) => <option key={k} value={k + 1}>{k + 1}</option>)}</select>
    <select className={`gb-row-len gb-row-mod ${tv !== "off" ? "on" : ""}`} aria-label={`${slots[r].name} modulation target`} value={tv} onChange={e => onModTarget(r, e.target.value)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    {row.map((v, c) => { const off = c >= len, tieNext = !off && c + 1 < len && row[c + 1] >= 2 && v !== 0, label = v >= 2 ? "tie" : v === 1 ? "hit" : "off";
      const val = view === "vel" ? vel[r]?.[c] ?? 1 : view === "chance" ? chance[r]?.[c] ?? 1 : lane?.values[c] ?? .5;
      const canDrag = view !== "note" && v === 1 || (view === "mod" && v !== 0 && tv !== "off");
      const drag2 = canDrag && (view !== "mod" || tv !== "off");
      return <button key={c} disabled={off} aria-label={`${slots[r].name} step ${c + 1} ${label}${drag2 ? ` ${view} ${Math.round(val * 100)}%` : ""}`}
        onPointerDown={ev => { if (drag2) { ev.preventDefault(); ev.currentTarget.setPointerCapture(ev.pointerId); drag(r, c, ev); } }}
        onClick={() => { if (!drag2) onToggle(r, c); }}
        onPointerMove={ev => { if (drag2 && ev.buttons) drag(r, c, ev); }}
        onKeyDown={ev => { if (drag2 && (ev.key === "ArrowUp" || ev.key === "ArrowDown")) { ev.preventDefault(); onValue(view, r, c, Math.min(1, Math.max(0, val + (ev.key === "ArrowUp" ? .05 : -.05)))); } }}
        className={`gb-step ${v === 1 ? "on" : v >= 2 ? "tie" : ""} ${tieNext ? "tie-next" : ""} ${off ? "disabled" : ""} ${!off && !inWin(c) ? "out-loop" : ""} ${c === cur ? "current" : ""} ${c % 4 === 0 ? "beat" : ""} ${drag2 ? "mod" : ""}`}>
        {drag2 && <i className="gb-step-fill" style={{ height: `${val * 100}%` }} />}
        {view === "note" && v === 1 && ((vel[r]?.[c] ?? 1) < .99 || (chance[r]?.[c] ?? 1) < .99) && <i className="gb-step-dot" />}
      </button>; })}
  </div>; })}</div>;
});

const Mixer = memo(function Mixer({ slots, selected, onEq, onLevel, onMute, onSolo, onClearSolo, onSelect }: {
  slots: Slot[]; selected: number; onEq: (i: number, eq: Slot["eq"]) => void; onLevel: (i: number, v: number) => void; onMute: (i: number) => void; onSolo: (i: number) => void; onClearSolo: () => void; onSelect: (i: number) => void;
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
    <div className="gb-eq" aria-label={`EQ ${slots[selected].name}`}>
      <span className="gb-eq-title">eq · {slots[selected].name}</span>
      {([["low", "Low 100 Hz", -15, 15, 0.5, "dB"], ["mid", "Mid", -15, 15, 0.5, "dB"], ["midFreq", "Mid freq", 200, 6000, 10, "Hz"], ["high", "High 9 kHz", -15, 15, 0.5, "dB"]] as const).map(([k, l, mn, mx, st, u]) =>
        <div key={k} className="gb-param"><div className="parameter-label">{l}<span>{slots[selected].eq[k]} {u}</span></div>
          <Slider aria-label={`${l} EQ`} min={mn} max={mx} step={st} value={[slots[selected].eq[k]]} onValueChange={([v]) => onEq(selected, { ...slots[selected].eq, [k]: v })} className="patch-slider" /></div>)}
    </div>
  </div>;
});

export default function Groovebox() {
  const g = useGroovebox();
  const rootRef = useRef<HTMLElement>(null);
  const midi = useMidi(rootRef, g.hit, g.release);
  const pf = g.performance, setPf = (p: Partial<typeof pf>) => g.setPerformance({ ...pf, ...p });
  const s = g.slots[g.selected];
  const onFx = useCallback((fx: FxUnit[]) => g.updateSelected({ fx }), [g.updateSelected]);
  const [modView, setModView] = useState(false);
  const onEq = useCallback((i: number, eq: Slot["eq"]) => g.updateSlot(i, { eq }), [g.updateSlot]);
  const onArp = useCallback((arp: ArpParams) => g.updateSelected({ arp }), [g.updateSelected]);
  return <section ref={rootRef} className={`instrument-workspace ${midi.learn ? "midi-learn" : ""}`} aria-label="Nadrisk groovebox">
    <div className="workspace-heading"><span><span className="status-dot" /> NAD_RACK.nad</span><span>16-SLOT RACK / STEP SEQUENCER</span><span className="workspace-index">01 / GROOVEBOX</span></div>
    <div className="gb-grid">
      <PatchNode label="drum.rack 4x4" tag="INSTRUMENT RACK" className="gb-rack">
        <PadGrid slots={g.slots} selected={g.selected} padRefs={g.padRefs} onHit={g.hit} onRelease={g.release} />
      </PatchNode>

      <PatchNode label={`slot.${String(g.selected + 1).padStart(2, "0")} ${s.engine}~`} tag="INSTRUMENT" className="gb-editor">
        <SlotEditor slot={s} peaks={g.peaks[g.selected]} onChange={g.updateSelected} onLoad={g.loadSelected} onLoadId={g.loadSelectedId} onLoadFolder={g.loadFolder} />
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
          <div className="gb-cols2">
            <Button variant="ghost" size="sm" className={`gb-eco ${pf.clipOn ? "on" : ""}`} aria-label="Master clipper" aria-pressed={pf.clipOn} onClick={() => setPf({ clipOn: !pf.clipOn })}>clipper {pf.clipOn ? "on" : "off"}</Button>
            <Button variant="ghost" size="sm" className={`gb-eco ${pf.limitOn ? "on" : ""}`} aria-label="Master limiter" aria-pressed={pf.limitOn} onClick={() => setPf({ limitOn: !pf.limitOn })}>limiter {pf.limitOn ? "on" : "off"}</Button>
          </div>
          <div className="parameter-label">Clip drive <span>{pf.clipDrive} dB</span></div>
          <Slider aria-label="Clip drive" disabled={!pf.clipOn} min={0} max={18} step={0.5} value={[pf.clipDrive]} onValueChange={([clipDrive]) => setPf({ clipDrive })} className="patch-slider" />
          <div className="parameter-label">Limiter ceiling <span>{pf.ceiling} dB</span></div>
          <Slider aria-label="Limiter ceiling" disabled={!pf.limitOn} min={-12} max={0} step={0.5} value={[pf.ceiling]} onValueChange={([ceiling]) => setPf({ ceiling })} className="patch-slider" />
          <span className="patch-small">device audio delay {g.latency == null ? "--" : `${g.latency} ms`}</span>
          <div className="scope-node gb-scope"><Waveform analyser={g.engine.current?.analyser ?? null} playing={!!g.engine.current} eco={g.eco} /></div>
        </div>
      </PatchNode>

      <PatchNode label={`phrase.seq slot.${String(g.selected + 1).padStart(2, "0")}`} tag="PAD SEQUENCER · PRE-INSTRUMENT" className="gb-arpnode">
        <ArpEditor arp={s.arp} slotName={s.name} onChange={onArp} />
      </PatchNode>

      <PatchNode label="nad.performance~" tag="MASTER · TENSION / CAPTURE" className="gb-mixnode">
        <PerformanceRack value={g.performance} onChange={g.setPerformance} />
      </PatchNode>
      <PatchNode label={`fx.chain slot.${String(g.selected + 1).padStart(2, "0")}`} tag="EFFECTS · SIGNAL ORDER" className="gb-fxnode">
        <FxChain slots={g.slots.map(x => x.name)} slotName={s.name} fx={s.fx} onChange={onFx} />
      </PatchNode>

      <PatchNode label="midi.map~" tag="MIDI · LEARN" className="gb-mixnode">
        <div className="node-body gb-midi" data-midi-ui>
          <div className="gb-seq-tools" style={{ padding: 0, flexWrap: "wrap" }}>
            <Button variant="ghost" size="sm" onClick={midi.connect}>{midi.devices ? `${midi.devices.length} device${midi.devices.length === 1 ? "" : "s"}` : "connect midi"}</Button>
            <Button variant="ghost" size="sm" className={`gb-eco ${midi.learn ? "on" : ""}`} style={{ marginTop: 0 }} aria-pressed={midi.learn} onClick={() => midi.setLearn(!midi.learn)}>learn {midi.learn ? "on" : "off"}</Button>
            <Button variant="ghost" size="sm" disabled={!midi.target || !Object.values(midi.maps).includes(midi.target)} onClick={() => midi.target && midi.unmap(midi.target)}>unmap</Button>
            <Button variant="ghost" size="sm" disabled={!Object.keys(midi.maps).length} onClick={midi.clear}>clear all</Button>
          </div>
          <span className="patch-small">{midi.status || (midi.learn ? (midi.target ? `move a knob or hit a key for: ${midi.target}` : "tap any control, then move a knob or hit a key") : `${Object.keys(midi.maps).length} mappings · notes 36–51 play pads 1–16`)}</span>
          {midi.devices && midi.devices.length > 0 && <span className="patch-small">{midi.devices.join(" · ")}</span>}
        </div>
      </PatchNode>

      <PatchNode label="vis.rack~" tag="VISUALIZERS · METERS" className="gb-mixnode">
        <VisualizerRack master={g.engine.current?.master ?? null} eco={g.eco} />
      </PatchNode>

      <PatchNode label="set.bank 8" tag="SAVED SETS · SONGS" className="gb-mixnode">
        <SetBank getSet={g.getSet} applySet={g.applySet} />
      </PatchNode>

      <PatchNode label="mixer~ 16ch" tag="MIXER · VOL / MUTE / SOLO" className="gb-mixnode">
        <Mixer onEq={onEq} slots={g.slots} selected={g.selected} onLevel={g.setLevel} onMute={g.toggleMute} onSolo={g.toggleSolo} onClearSolo={g.clearSolo} onSelect={g.setSelected} />
      </PatchNode>

      <PatchNode label={`step.seq 16 · pattern ${g.bank ? "B" : "A"}`} tag="SEQUENCER" className="gb-seq">
        <div className="gb-seq-tools">
          <div className="gb-banks">{["A", "B"].map((n, b) => <button key={n} className={`gb-bank ${g.bank === b ? "active" : ""} ${g.queued === b ? "queued" : ""}`} aria-pressed={g.bank === b} onClick={() => g.selectBank(b)}>{n}</button>)}</div>
          <div className="gb-banks gb-view"><button className={`gb-bank ${!modView ? "active" : ""}`} aria-pressed={!modView} onClick={() => setModView(false)}>NOTE</button><button className={`gb-bank ${modView ? "active" : ""}`} aria-pressed={modView} onClick={() => setModView(true)}>MOD</button></div>
          <Button variant="ghost" size="sm" onClick={g.copyBank}>copy → {g.bank ? "A" : "B"}</Button>
          <Button variant="ghost" size="sm" onClick={g.randomizePattern}><Dice5 size={12} /> random</Button>
          <Button variant="ghost" size="sm" onClick={g.clearPattern}><Eraser size={12} /> clear</Button>
          <Button variant="ghost" size="sm" onClick={g.resetAll}><RotateCcw size={12} /> reset</Button>
        </div>
        <span className="patch-small gb-seq-hint">{modView ? "pick a target per row · drag lit steps up / down to set the amount" : "tap: hit → tie → glide → off · glide slides to the step's pitch mod"}</span>
        <StepGrid offset={pf.offset} loop={pf.loop} bank={g.bank} mod={modView} onModValue={g.setModValue} onModTarget={g.setModTarget} pattern={g.pattern} lengths={g.lengths} onLength={g.setTrackLength} slots={g.slots} selected={g.selected} step={g.step} onToggle={g.toggleStep} onSelect={g.setSelected} />
      </PatchNode>
    </div>
    <div className="workspace-footer"><span><AudioLines size={13} />{g.error || (g.queued != null ? `PATTERN ${g.queued ? "B" : "A"} QUEUED · NEXT BAR` : g.playing ? "SEQUENCER RUNNING" : "TAP A PAD OR PRESS PLAY")}</span><span>DRUM / SYNTH / SAMPLER <span className="footer-separator">/</span> WEB AUDIO</span><span className="workspace-index">NADRISK © 2026</span></div>
  </section>;
}
