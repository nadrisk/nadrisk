import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { FolderOpen, Upload } from "lucide-react";
import { LIBRARY, listCached, type SampleRef } from "@/audio/sampleStore";
import { Slider } from "@/components/ui/slider";
import type { ADSR, FilterKind, Wave } from "@/audio/voices";
import type { EngineKind, Slot } from "@/hooks/useGroovebox";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteName = (m: number) => `${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;

function P({ label, value, min, max, step = 1, fmt, onChange }: { label: string; value: number; min: number; max: number; step?: number; fmt?: (v: number) => string; onChange: (v: number) => void }) {
  return <div className="gb-param"><div className="parameter-label">{label}<span>{fmt ? fmt(value) : value}</span></div>
    <Slider aria-label={label} min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} className="patch-slider" /></div>;
}
function Seg<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: string }) {
  return <div className="gb-kinds" role="group" aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>{options.map(o => <button key={o} aria-pressed={o === value} className={o === value ? "selected" : ""} onClick={() => onChange(o)}>{o}</button>)}</div>;
}
const Group = ({ title, children }: { title: string; children: ReactNode }) => <fieldset className="gb-group"><legend>{title}</legend>{children}</fieldset>;
const ms = (v: number) => `${Math.round(v * 1000)} ms`, pct = (v: number) => `${Math.round(v * 100)}%`, hz = (v: number) => `${Math.round(v).toLocaleString()} Hz`;

function Env({ env, onChange }: { env: ADSR; onChange: (e: ADSR) => void }) {
  return <div className="gb-cols4">
    <P label="A" value={env.a} min={0.001} max={2} step={0.001} fmt={ms} onChange={a => onChange({ ...env, a })} />
    <P label="D" value={env.d} min={0.01} max={2} step={0.01} fmt={ms} onChange={d => onChange({ ...env, d })} />
    <P label="S" value={env.s} min={0} max={1} step={0.01} fmt={pct} onChange={s => onChange({ ...env, s })} />
    <P label="R" value={env.r} min={0.01} max={3} step={0.01} fmt={ms} onChange={r => onChange({ ...env, r })} />
  </div>;
}

function Partials({ values, onChange }: { values: number[]; onChange: (v: number[]) => void }) {
  const set = (i: number, e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect(); const v = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
    onChange(values.map((x, j) => (j === i ? Math.round(v * 100) / 100 : x)));
  };
  return <div className="gb-partials">{values.map((v, i) => <div key={i} className="gb-partial" aria-label={`Harmonic ${i < 8 ? i * 2 + 1 : (i - 8) * 2 + 2}`} role="slider" aria-valuenow={v} aria-valuemin={0} aria-valuemax={1}
    onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); set(i, e); }} onPointerMove={e => { if (e.buttons) set(i, e); }}>
    <i style={{ height: `${v * 100}%` }} className={i < 8 ? "odd" : "even"} /><span>{i < 8 ? i * 2 + 1 : (i - 8) * 2 + 2}</span></div>)}</div>;
}

function SampleView({ peaks, start, onStart }: { peaks: number[] | null; start: number; onStart: (v: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current, ctx = c?.getContext("2d"); if (!c || !ctx || !peaks) return;
    const w = c.clientWidth, h = c.clientHeight, r = window.devicePixelRatio || 1; c.width = w * r; c.height = h * r; ctx.setTransform(r, 0, 0, r, 0, 0);
    const css = getComputedStyle(document.documentElement), accent = `hsl(${css.getPropertyValue("--accent")})`, fg = `hsl(${css.getPropertyValue("--muted-foreground")})`;
    ctx.clearRect(0, 0, w, h);
    peaks.forEach((p, i) => { const x = i / peaks.length * w; ctx.fillStyle = i / peaks.length >= start ? accent : fg; ctx.fillRect(x, h / 2 - p * h / 2, Math.max(1, w / peaks.length - 1), p * h); });
    ctx.fillStyle = `hsl(${css.getPropertyValue("--foreground")})`; ctx.fillRect(start * w, 0, 1.5, h);
  }, [peaks, start]);
  return <canvas ref={ref} className="gb-sample" role="img" aria-label="Sample waveform, click to set start" onPointerDown={e => { const r = e.currentTarget.getBoundingClientRect(); onStart(Math.min(0.95, Math.max(0, (e.clientX - r.left) / r.width))); }} />;
}

const WAVES: readonly Wave[] = ["sine", "triangle", "sawtooth", "square"];
const FILTERS: readonly FilterKind[] = ["lowpass", "highpass", "bandpass", "notch"];

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
  const d = slot.drum, s = slot.synth, sm = slot.sampler;
  const D = (p: Partial<typeof d>) => onChange({ drum: { ...d, ...p } });
  const S = (p: Partial<typeof s>) => onChange({ synth: { ...s, ...p } });
  const M = (p: Partial<typeof sm>) => onChange({ sampler: { ...sm, ...p } });
  return <div className="node-body gb-editor-body">
    <div className="gb-cols2">
      <label className="parameter-label gb-inline">Name<input className="gb-input" value={slot.name} maxLength={10} onChange={e => onChange({ name: e.target.value.toUpperCase() })} /></label>
      <button className={`gb-mute ${slot.mute ? "selected" : ""}`} onClick={() => onChange({ mute: !slot.mute })}>{slot.mute ? "MUTED" : "MUTE"}</button>
    </div>
    <Seg label="Instrument" options={["drum", "synth", "sampler"] as const} value={slot.engine} onChange={(v: EngineKind) => onChange({ engine: v })} />
    <div className="gb-cols2">
      <P label="Volume" value={slot.level} min={0} max={100} fmt={v => `${v}%`} onChange={level => onChange({ level })} />
      <P label="Pan" value={slot.pan} min={-1} max={1} step={0.01} fmt={v => (v === 0 ? "C" : v < 0 ? `L${Math.round(-v * 100)}` : `R${Math.round(v * 100)}`)} onChange={pan => onChange({ pan })} />
    </div>

    {slot.engine === "drum" && <>
      <Seg label="Drum type" options={["kick", "snare", "hat"] as const} value={d.kind} onChange={kind => D({ kind })} />
      <Group title="pitch"><div className="gb-cols3">
        <P label="Pitch" value={d.pitch} min={20} max={1200} fmt={hz} onChange={pitch => D({ pitch })} />
        <P label="Pitch env" value={d.pitchEnv} min={0} max={48} fmt={v => `+${v} st`} onChange={pitchEnv => D({ pitchEnv })} />
        <P label="Env decay" value={d.pitchDecay} min={0.005} max={0.5} step={0.005} fmt={ms} onChange={pitchDecay => D({ pitchDecay })} />
      </div></Group>
      <Group title="amp"><Env env={d.env} onChange={env => D({ env })} /></Group>
      <Group title="tone"><div className="gb-cols3">
        <P label="Noise" value={d.noise} min={0} max={1} step={0.01} fmt={pct} onChange={noise => D({ noise })} />
        <P label="FM" value={d.fm} min={0} max={10} step={0.1} onChange={fm => D({ fm })} />
        <P label="FM ratio" value={d.fmRatio} min={0.25} max={8} step={0.01} onChange={fmRatio => D({ fmRatio })} />
        <P label="Ring mod" value={d.ring} min={0} max={1} step={0.01} fmt={pct} onChange={ring => D({ ring })} />
        <P label="Ring freq" value={d.ringFreq} min={20} max={5000} fmt={hz} onChange={ringFreq => D({ ringFreq })} />
      </div></Group>
      <Group title="filter"><Seg label="Filter type" options={FILTERS} value={d.filter} onChange={filter => D({ filter })} /><div className="gb-cols2">
        <P label="Cutoff" value={d.cutoff} min={40} max={16000} step={10} fmt={hz} onChange={cutoff => D({ cutoff })} />
        <P label="Resonance" value={d.res} min={0.1} max={20} step={0.1} onChange={res => D({ res })} />
        <P label="Filter env" value={d.filterEnv} min={-4} max={4} step={0.1} fmt={v => `${v} oct`} onChange={filterEnv => D({ filterEnv })} />
        <P label="Env decay" value={d.filterDecay} min={0.005} max={1} step={0.005} fmt={ms} onChange={filterDecay => D({ filterDecay })} />
      </div></Group>
    </>}

    {slot.engine === "synth" && <>
      <P label="Note" value={slot.note} min={24} max={84} fmt={noteName} onChange={note => onChange({ note })} />
      {(["osc1", "osc2"] as const).map(k => { const o = s[k]; const set = (p: Partial<typeof o>) => S({ [k]: { ...o, ...p } } as Partial<typeof s>);
        return <Group key={k} title={k === "osc1" ? "oscillator 1" : "oscillator 2"}>
          <Seg label={`${k} waveform`} options={(k === "osc1" ? [...WAVES, "additive"] : WAVES) as readonly (Wave | "additive")[]} value={o.wave} onChange={wave => set({ wave })} />
          {k === "osc2" && <Seg label="Osc 2 mode" options={["mix", "fm"] as const} value={s.osc2.mode} onChange={mode => S({ osc2: { ...s.osc2, mode } })} />}
          <div className="gb-cols3">
            <P label="Gain" value={o.gain} min={0} max={1} step={0.01} fmt={pct} onChange={gain => set({ gain })} />
            <P label="Pitch" value={o.coarse} min={-24} max={24} fmt={v => `${v} st`} onChange={coarse => set({ coarse })} />
            <P label="Fine" value={o.fine} min={-50} max={50} fmt={v => `${v} ct`} onChange={fine => set({ fine })} />
          </div>
          {k === "osc2" && s.osc2.mode === "fm" && <P label="FM amount" value={s.osc2.fmAmount} min={0} max={10} step={0.05} onChange={fmAmount => S({ osc2: { ...s.osc2, fmAmount } })} />}
        </Group>; })}
      <Group title="partials · odd / even (osc 1 additive)"><Partials values={s.partials} onChange={partials => S({ partials, osc1: { ...s.osc1, wave: "additive" } })} /></Group>
      <Group title="amp"><P label="Noise" value={s.noise} min={0} max={1} step={0.01} fmt={pct} onChange={noise => S({ noise })} /><Env env={s.env} onChange={env => S({ env })} /></Group>
      <Group title="filter"><Seg label="Filter type" options={FILTERS} value={s.filter} onChange={filter => S({ filter })} /><div className="gb-cols3">
        <P label="Cutoff" value={s.cutoff} min={40} max={16000} step={10} fmt={hz} onChange={cutoff => S({ cutoff })} />
        <P label="Resonance" value={s.res} min={0.1} max={20} step={0.1} onChange={res => S({ res })} />
        <P label="Dry / wet" value={s.wet} min={0} max={1} step={0.01} fmt={pct} onChange={wet => S({ wet })} />
        <P label="Filter env" value={s.filterEnv} min={-4} max={4} step={0.1} fmt={v => `${v} oct`} onChange={filterEnv => S({ filterEnv })} />
        <P label="Env decay" value={s.filterDecay} min={0.005} max={2} step={0.005} fmt={ms} onChange={filterDecay => S({ filterDecay })} />
      </div></Group>
      <Group title="pitch envelope"><div className="gb-cols2">
        <P label="Amount" value={s.pitchEnv} min={-24} max={24} fmt={v => `${v} st`} onChange={pitchEnv => S({ pitchEnv })} />
        <P label="Decay" value={s.pitchDecay} min={0.005} max={2} step={0.005} fmt={ms} onChange={pitchDecay => S({ pitchDecay })} />
      </div></Group>
      <Group title="lfo"><Seg label="LFO waveform" options={WAVES} value={s.lfo.wave} onChange={wave => S({ lfo: { ...s.lfo, wave } })} />
        <Seg label="LFO target" options={["pitch", "cutoff", "amp"] as const} value={s.lfo.target} onChange={target => S({ lfo: { ...s.lfo, target } })} />
        <div className="gb-cols2">
          <P label="Rate" value={s.lfo.rate} min={0.05} max={20} step={0.05} fmt={v => `${v} Hz`} onChange={rate => S({ lfo: { ...s.lfo, rate } })} />
          <P label="Depth" value={s.lfo.depth} min={0} max={1} step={0.01} fmt={pct} onChange={depth => S({ lfo: { ...s.lfo, depth } })} />
        </div></Group>
    </>}

    {slot.engine === "sampler" && <>
      <Group title={`sample · ${sm.sampleName}`}>
        <SampleView peaks={peaks} start={sm.start} onStart={start => M({ start })} />
        <SamplePicker value={sm.sampleId} onPick={onLoadId} onFolder={onLoadFolder} />
        <label className="gb-upload"><Upload size={12} /> import sample<input type="file" accept="audio/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) onLoad(f); e.target.value = ""; }} /></label>
        <div className="gb-cols3">
          <P label="Start" value={sm.start} min={0} max={0.95} step={0.005} fmt={pct} onChange={start => M({ start })} />
          <P label="Pitch" value={sm.pitch} min={-24} max={24} fmt={v => `${v} st`} onChange={pitch => M({ pitch })} />
          <button className={`gb-mute ${sm.loop ? "selected" : ""}`} aria-pressed={sm.loop} onClick={() => M({ loop: !sm.loop })}>{sm.loop ? "LOOP ON" : "LOOP OFF"}</button>
        </div>
      </Group>
      <Group title="amp"><Env env={sm.env} onChange={env => M({ env })} /></Group>
    </>}
  </div>;
}

export default memo(SlotEditor);
