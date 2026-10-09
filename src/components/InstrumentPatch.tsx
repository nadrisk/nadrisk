import { ArrowDownRight, AudioLines, Dice5, Play, RotateCcw, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useInstrument, type WaveShape } from "@/hooks/useInstrument";
import heroBg from "@/assets/hero-bg.jpg";
import PatchNode from "./PatchNode";
import Waveform from "./Waveform";

export default function InstrumentPatch() {
  const audio = useInstrument();
  return <section className="instrument-workspace" aria-label="Nadrisk interactive instrument">
    <div className="workspace-heading"><span><span className="status-dot" /> NAD_01.maxpat</span><span>EXPERIMENTAL SOUND ENVIRONMENT</span><span className="workspace-index">01 / PATCH</span></div>
    <div className="patch-canvas">
      <svg className="patch-cables" viewBox="0 0 1200 630" preserveAspectRatio="none" aria-hidden="true">
        <path d="M 130 190 C 130 270 970 130 970 260" className="control-cable" />
        <path d="M 130 390 C 130 440 555 360 555 455" />
        <path d="M 590 370 C 590 450 235 390 235 465" />
        <path d="M 970 420 C 970 470 235 410 235 470" className="signal-cable" />
        <path d="M 555 570 C 555 630 990 540 990 590" className="signal-cable" />
        <path d="M 130 200 C 130 260 130 230 130 285" />
      </svg>
      <div className="patch-left">
        <span className="patch-comment">// everything starts with a signal</span>
        <PatchNode label="transport" tag="01">
          <div className="transport-body">
            <Button variant="ghost" className={`transport-button ${audio.playing ? "is-playing" : ""}`} onClick={audio.toggle} disabled={audio.starting} aria-label={audio.playing ? "Stop instrument" : "Start instrument"} title={audio.playing ? "Stop instrument" : "Start instrument"}>{audio.playing ? <Square /> : <Play />}</Button>
            <div><span className="transport-state">{audio.starting ? "STARTING" : audio.playing ? "SIGNAL ON" : "SIGNAL OFF"}</span><span className="patch-small">{audio.playing ? "dsp 1" : "dsp 0"}</span></div>
          </div>
        </PatchNode>
        <div className="object-message"><span>loadmess</span><span>110.</span></div>
        <PatchNode label="cycle~" tag="OSCILLATOR">
          <div className="node-body"><label className="parameter-label" htmlFor="frequency">Frequency <span>Hz</span></label>
            <div className="number-display"><span>▸</span><input id="frequency" aria-label="Frequency" type="number" min="40" max="880" step="1" value={audio.frequency} onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n)) audio.setFrequency(Math.min(880, Math.max(40, n))); }} /></div>
            <Slider aria-label="Oscillator frequency" min={40} max={880} step={1} value={[audio.frequency]} onValueChange={([value]) => audio.setFrequency(value)} className="patch-slider" />
            <div className="range-labels"><span>40</span><span>880 Hz</span></div>
            <div className="wave-shapes">{(["sine", "triangle", "sawtooth"] as WaveShape[]).map(shape => <Button key={shape} variant="ghost" size="sm" aria-label={`${shape} waveform`} aria-pressed={audio.shape === shape} title={`${shape} waveform`} onClick={() => audio.setShape(shape)} className={audio.shape === shape ? "selected" : ""}><svg viewBox="0 0 50 24" aria-hidden="true"><path d={shape === "sine" ? "M1 12 C9 -5 16 -5 24 12 S40 29 49 12" : shape === "triangle" ? "M1 12 L12 2 L36 22 L49 12" : "M1 20 L22 3 L22 21 L45 3 L45 20"} /></svg></Button>)}</div>
          </div>
        </PatchNode>
      </div>
      <div className="patch-center">
        <div className="patch-comment">// Nadir Čajić — independent signal</div>
        <PatchNode label="jit.window nadrisk" tag="VISUAL OUTPUT" className="artwork-node"><img src={heroBg} alt="Nadrisk purple and teal artist artwork" /><div className="artwork-caption"><span>TEXTURE / FREQUENCY / FEELING</span><ArrowDownRight size={16} /></div></PatchNode>
        <div className="center-objects"><span className="object-message">prepend experiment</span><span className="object-message">route sound vision</span></div>
        <div className="patch-statement">Somewhere between a memory,<br />a dream, and a system error.</div>
      </div>
      <div className="patch-right">
        <span className="patch-comment">// bend the signal</span>
        <PatchNode label="svf~" tag="LOWPASS"><div className="node-body"><div className="parameter-label">Filter cutoff <span>Hz</span></div><div className="filter-value">{audio.cutoff.toLocaleString()}<span>Hz</span></div><Slider aria-label="Filter cutoff" min={100} max={8000} step={50} value={[audio.cutoff]} onValueChange={([value]) => audio.setCutoff(value)} className="patch-slider" /><div className="range-labels"><span>100</span><span>8,000 Hz</span></div><svg className="filter-graph" viewBox="0 0 240 66" aria-hidden="true"><path className="graph-grid" d="M0 22H240 M0 44H240 M60 0V66 M120 0V66 M180 0V66" /><path d={`M0 12 L${35 + audio.cutoff / 8000 * 140} 12 Q${65 + audio.cutoff / 8000 * 140} 12 ${85 + audio.cutoff / 8000 * 140} 58 L240 60`} /></svg></div></PatchNode>
        <PatchNode label="random" tag="NEW STATE"><div className="random-body"><Button variant="ghost" className="bang-button" size="icon" onClick={audio.randomize} aria-label="Randomize sound" title="Randomize sound"><Dice5 /></Button><span>happy accidents.</span></div></PatchNode>
        <Button variant="ghost" className="reset-button" onClick={audio.reset}><RotateCcw size={12} /> reset parameters</Button>
      </div>
      <div className="patch-bottom">
        <PatchNode label="scope~" tag={audio.playing ? "LIVE SIGNAL" : "SIGNAL MONITOR"} className="scope-node"><Waveform analyser={audio.engine.current?.analyser ?? null} playing={audio.playing} /><div className="scope-caption"><span>TIME DOMAIN</span><span>{audio.playing ? "● RUNNING" : "○ IDLE"}</span><span>1024 SAMPLES</span></div></PatchNode>
        <PatchNode label="gain~ → ezdac~" tag="OUTPUT" className="output-node"><div className="node-body"><div className="parameter-label"><span className="volume-label"><Volume2 size={14} /> Master level</span><span>{audio.volume}%</span></div><Slider aria-label="Master volume" min={0} max={100} value={[audio.volume]} onValueChange={([value]) => audio.setVolume(value)} className="patch-slider" /><div className="output-meter">{Array.from({ length: 24 }, (_, i) => <i key={i} className={audio.playing && i < audio.volume / 100 * 24 ? "meter-active" : ""} />)}</div><div className="range-labels"><span>−∞</span><span>0 dB</span></div></div></PatchNode>
      </div>
    </div>
    <div className="workspace-footer"><span><AudioLines size={13} />{audio.error || (audio.playing ? "AUDIO ENGINE RUNNING" : "AUDIO ENGINE STANDBY")}</span><span>44.1 kHz <span className="footer-separator">/</span> STEREO <span className="footer-separator">/</span> WEB AUDIO</span><span className="workspace-index">NADRISK © 2026</span></div>
  </section>;
}