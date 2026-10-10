import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { FolderOpen, Upload } from "lucide-react";
import { LIBRARY, listCached, type SampleRef } from "@/audio/sampleStore";
import { Button } from "@/components/ui/button";
import { CHORDS, type ChordArp, type ChordPlay } from "@/audio/musical";
import { RATES, type RateName } from "@/audio/arp";
import HwKnob, { AdsrView } from "@/components/HwKnob";
import { defaultSiren, type ADSR, type FilterKind, type Wave } from "@/audio/voices";
import type { EngineKind, Slot } from "@/hooks/useGroovebox";
import WispdiskPanel from "@/components/WispdiskPanel";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteName = (m: number) => `${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;

function P(props: { label: string; value: number; min: number; max: number; step?: number; fmt?: (v: number) => string; onChange: (v: number) => void }) {
  return <HwKnob {...props} />;
}
function Seg<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: string }) {
  return <div className="gb-kinds" role="group" aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>{options.map(o => <button key={o} aria-pressed={o === value} className={o === value ? "selected" : ""} onClick={() => onChange(o)}>{o}</button>)}</div>;
}
const Group = ({ title, children }: { title: string; children: ReactNode }) => <fieldset className="gb-group"><legend>{title}</legend>{children}</fieldset>;
const ms = (v: number) => `${Math.round(v * 1000)} ms`, pct = (v: number) => `${Math.round(v * 100)}%`, hz = (v: number) => `${Math.round(v).toLocaleString()} Hz`;

function Env({ env, onChange }: { env: ADSR; onChange: (e: ADSR) => void }) {
  return <div className="hw-env"><AdsrView {...env} /><div className="gb-cols4">
    <P label="A" value={env.a} min={0.001} max={2} step={0.001} fmt={ms} onChange={a => onChange({ ...env, a })} />
    <P label="D" value={env.d} min={0.01} max={2} step={0.01} fmt={ms} onChange={d => onChange({ ...env, d })} />
    <P label="S" value={env.s} min={0} max={1} step={0.01} fmt={pct} onChange={s => onChange({ ...env, s })} />
    <P label="R" value={env.r} min={0.01} max={3} step={0.01} fmt={ms} onChange={r => onChange({ ...env, r })} />
  </div></div>;
}

function Partials({ values, onChange }: { values: number[]; onChange: (v: number[]) => void }) {
  const set = (i: number, e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect(); const v = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
    onChange(values.map((x, j) => (j === i ? Math.round(v * 100) / 100 : x)));
  };
  return <div className="gb-partials">{values.map((v, i) => <div key={i} className="gb-partial" aria-label={`Harmonic ${i + 1}`} role="slider" aria-valuenow={v} aria-valuemin={0} aria-valuemax={1}
    onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); set(i, e); }} onPointerMove={e => { if (e.buttons) set(i, e); }}>
    <i style={{ height: `${v * 100}%` }} className={i % 2 ? "even" : "odd"} /><span>{i + 1}</span></div>)}</div>;
}

function SampleView({ peaks, start, onStart }: { peaks: number[] | null; start: number; onStart: (v: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current, ctx = c?.getContext("2d"); if (!c || !ctx || !peaks) return;
    // Low-res 1-bit raster: draw at half resolution, upscale with nearest-neighbour (CSS pixelated).
    const w = Math.max(32, Math.floor(c.clientWidth / 2)), h = Math.max(16, Math.floor(c.clientHeight / 2)); c.width = w; c.height = h;
    const fg = `hsl(${getComputedStyle(c).getPropertyValue("--foreground")})`;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = fg;
    const lane = h / 2, mid = [lane / 2, lane + lane / 2];
    for (let x = 0; x < w; x++) {
      const p = peaks[Math.floor(x / w * peaks.length)] ?? 0, a = Math.max(1, Math.round(p * (lane / 2 - 1)));
      for (const m of mid) { ctx.fillRect(x, Math.round(m - a), 1, a * 2); if (x % 2 === 0) ctx.fillRect(x, Math.round(m), 1, 1); }
    }
    const sx = Math.round(start * w);
    for (let y = 0; y < h; y += 2) ctx.fillRect(sx, y, 1, 1);
    ctx.fillRect(sx, 0, 6, 5); ctx.clearRect(sx + 1, 1, 4, 3); ctx.fillRect(sx + 2, 2, 2, 1);
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
    <Seg label="Instrument" options={["drum", "synth", "sampler", "poly", "808", "siren"] as const} value={slot.engine} onChange={(v: EngineKind) => onChange({ engine: v })} />
    <div className="gb-cols2">
      <P label="Volume" value={slot.level} min={0} max={100} fmt={v => `${v}%`} onChange={level => onChange({ level })} />
      <P label="Pan" value={slot.pan} min={-1} max={1} step={0.01} fmt={v => (v === 0 ? "C" : v < 0 ? `L${Math.round(-v * 100)}` : `R${Math.round(v * 100)}`)} onChange={pan => onChange({ pan })} />
    </div>

    <label className="arp-field">Choke group<select aria-label="Choke group" value={slot.choke} onChange={e => onChange({ choke: +e.target.value })}>{[0,1,2,3,4].map(n => <option key={n} value={n}>{n ? `Group ${n}` : "Off"}</option>)}</select></label>
    {(slot.engine === "sampler" || slot.engine === "poly") && <Group title="chord pad">
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
    </Group>}
    {slot.engine === "poly" && <Group title="nad.poly · analog ensemble">
      <P label="Note" value={slot.note} min={24} max={84} fmt={noteName} onChange={note => onChange({ note })} />
      <div className="gb-cols3">{(["cutoff", "res", "detune", "sub", "pulse", "chorus"] as const).map(k => <P key={k} label={`Poly ${k}`} value={slot.poly[k]} min={k === "cutoff" ? 40 : 0} max={k === "cutoff" ? 16000 : k === "res" ? 8 : k === "detune" ? 30 : 1} step={k === "cutoff" ? 10 : .01} onChange={v => onChange({ poly: { ...slot.poly, [k]: v } })} />)}</div>
      <Env env={slot.poly.env} onChange={env => onChange({ poly: { ...slot.poly, env } })} />
    </Group>}
    {slot.engine === "808" && (() => { const b = slot.bass, B = (p: Partial<typeof b>) => onChange({ bass: { ...b, ...p } }); return <>
      <P label="Note" value={slot.note} min={20} max={60} fmt={noteName} onChange={note => onChange({ note })} />
      <Group title="nad.808 · pitch"><div className="gb-cols2">
        <P label="Pitch env" value={b.pitchEnv} min={0} max={48} fmt={v => `+${v} st`} onChange={pitchEnv => B({ pitchEnv })} />
        <P label="Env decay" value={b.pitchDecay} min={0.005} max={0.4} step={0.005} fmt={ms} onChange={pitchDecay => B({ pitchDecay })} />
      </div></Group>
      <Group title="amp"><div className="gb-cols2">
        <P label="Release" value={b.decay} min={0.05} max={4} step={0.01} fmt={ms} onChange={decay => B({ decay })} />
        <P label="Click" value={b.click} min={0} max={1} step={0.01} fmt={pct} onChange={click => B({ click })} />
      </div></Group>
      <Group title="weight"><div className="gb-cols3">
        <P label="Tube drive" value={b.tube} min={0} max={1} step={0.01} fmt={pct} onChange={tube => B({ tube })} />
        <P label="Harmonics" value={b.harmonics} min={0} max={1} step={0.01} fmt={pct} onChange={harmonics => B({ harmonics })} />
        <P label="Tone" value={b.tone} min={200} max={16000} step={10} fmt={hz} onChange={tone => B({ tone })} />
      </div></Group>
    </>; })()}
    {slot.engine === "siren" && (() => { const z = { ...defaultSiren(), ...slot.siren }, Z = (p: Partial<typeof z>) => onChange({ siren: { ...z, ...p } }); return <>
      <P label="Note" value={slot.note} min={36} max={96} fmt={noteName} onChange={note => onChange({ note })} />
      <Group title="nad.siren · oscillator"><Seg label="Siren wave" options={["square", "sawtooth", "triangle", "sine"] as const} value={z.wave} onChange={(wave: Wave) => Z({ wave })} />
        <P label="Tone" value={z.tone} min={300} max={12000} step={10} fmt={hz} onChange={tone => Z({ tone })} /></Group>
      <Group title="wobble lfo"><Seg label="Siren LFO wave" options={["square", "sawtooth", "triangle", "sine"] as const} value={z.lfoWave} onChange={(lfoWave: Wave) => Z({ lfoWave })} />
        <div className="gb-cols2"><P label="LFO rate" value={z.rate} min={.1} max={20} step={.1} fmt={v => `${v} Hz`} onChange={rate => Z({ rate })} />
        <P label="LFO depth" value={z.depth} min={0} max={24} step={.5} fmt={v => `${v} st`} onChange={depth => Z({ depth })} /></div></Group>
      <Group title="sweep · release"><div className="gb-cols3"><P label="Sweep" value={z.sweep} min={-24} max={24} step={1} fmt={v => `${v > 0 ? "+" : ""}${v} st`} onChange={sweep => Z({ sweep })} />
        <P label="Sweep time" value={z.sweepTime} min={.05} max={6} step={.05} fmt={v => `${v.toFixed(2)} s`} onChange={sweepTime => Z({ sweepTime })} />
        <P label="Siren release" value={z.release} min={.02} max={3} step={.01} fmt={ms} onChange={release => Z({ release })} /></div></Group>
    </>; })()}
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
      <Group title="partials · harmonics 1–16 (osc 1 additive)"><Partials values={s.partials} onChange={partials => S({ partials, osc1: { ...s.osc1, wave: "additive" } })} /></Group>
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
      <WispdiskPanel slot={slot} peaks={peaks} onChange={onChange} />
      <SamplePicker value={sm.sampleId} onPick={onLoadId} onFolder={onLoadFolder} />
      <label className="gb-upload"><Upload size={12} /> import sample<input type="file" accept="audio/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) onLoad(f); e.target.value = ""; }} /></label>
    </>}
  </div>;
}

export default memo(SlotEditor);
