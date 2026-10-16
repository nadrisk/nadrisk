import { useNoteKnob } from "@/components/harmonyKnob";
import { memo, useState } from "react";
import { synthPreviewColumns } from "@/pixel/synthPreview";
import { BarDraw, Tap, Zone } from "@/pixel/PixelScreen";
import { Panel, drawEnvGraph, drawFilterCurve, drawWaveIcon, EnvZones, envKnobs, fineSt, ms, pct, st, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";
import { specParams, specGateMask, N_BANDS, type SpecParams } from "@/audio/spectral";
const gateFresh = () => performance.now() - specGateMask.at < 400;
import { lfoDests, type LfoDests, type Wave } from "@/audio/voices";

const PAGES = ["O1", "O2", "FLT", "LFO", "ENV"] as const;
const SPEC_PAGES = ["BND", "SPC", "FLT", "LFO", "ENV"] as const;

// Classic harmonic recipes (bar = perceived level): saw = all harmonics 1/n, square = odd 1/n, organ drawbars, bell-ish.
const H = (f: (n: number) => number) => Array.from({ length: 16 }, (_, i) => Math.min(1, Math.sqrt(Math.max(0, f(i + 1)))));
const PRESETS: [string, number[]][] = [
  ["SINE", H(n => (n === 1 ? 1 : 0))], ["TRI", H(n => (n % 2 ? 1 / (n * n) : 0) * 1.4)], ["SAW", H(n => 1 / n)], ["SQR", H(n => (n % 2 ? 1 / n : 0))], ["ORG", H(n => ([1, 2, 3, 4, 6, 8].includes(n) ? .6 : 0))],
  ["HOLW", H(n => (n % 2 ? 1 / (n * n) : 0) * 3)], ["BELL", H(n => ([1, 3, 5, 9, 12].includes(n) ? .5 / Math.sqrt(n) : 0))],
];
// Old sets may still use the native waves; they are shown (and step on) as the matching recipe.
const NATIVE: Record<string, string> = { sine: "SINE", triangle: "TRI", sawtooth: "SAW", square: "SQR" };
const addLabel = (pl: number[]) => PRESETS.find(([, v]) => v.every((x, i) => Math.abs(x - (pl[i] ?? 0)) < .02))?.[0] ?? "USR";
const presetPartials = (name: string) => PRESETS.find(([n]) => n === name)?.[1] ?? PRESETS[0][1];

// CYBERSPACE: the synth editor as a 128x64 1-bit hardware screen.
function CyberspacePanel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const s = slot.synth;
  const S = (p: Partial<typeof s>) => onChange({ synth: { ...s, ...p } });
  const [envPage, setEnvPage] = useState<"AMP" | "PIT" | "FLT">("AMP");
  const selectedEnv = envPage === "AMP" ? s.env : envPage === "PIT" ? s.pitchEnvShape : s.filterEnvShape;
  const [lfoPage, setLfoPage] = useState<"SHP" | "DST">("SHP");
  const ld = lfoDests(s.lfo), lfoMax = Math.max(ld.pitch, ld.cutoff, ld.amp, ld.osc1, ld.osc2);
  const setDest = (k: keyof LfoDests, v: number) => { const dests = { ...ld, [k]: v }; S({ lfo: { ...s.lfo, dests, depth: Math.max(...Object.values(dests)) } }); };
  const setSelectedEnv = (env: typeof s.env) => envPage === "AMP" ? S({ env }) : envPage === "PIT" ? S({ pitchEnvShape: env }) : S({ filterEnvShape: env });

  const noteK = useNoteKnob(slot, onChange);
  const spec = s.mode === "spec", sp = specParams(s.spec);
  const SP = (q: Partial<SpecParams>) => S({ spec: { ...sp, ...q } });
  const toggleMode = () => S({ mode: spec ? "add" : "spec", spec: sp });
  const knobs = (page: string): Knob[] => {
    if (page === "BND") return [noteK,
      { label: "Spectral shift", short: "SHFT", value: sp.shift, min: -1, max: 1, step: .01, reset: 0, fmt: v => `${v >= 0 ? "+" : ""}${(v * 2).toFixed(1)}O`, set: shift => SP({ shift }) },
      { label: "Spectral fine", short: "FINE", value: Math.max(-50, Math.min(50, s.osc1.fine)), min: -50, max: 50, step: 1, bare: true, reset: 0, fmt: v => `F${fineSt(v)}`, set: fine => S({ osc1: { ...s.osc1, fine } }) }];
    if (page === "SPC") return [
      { label: "Spectral gate", short: "GATE", value: sp.gate, min: 0, max: 1, step: .01, reset: 0, fmt: pct, set: gate => SP({ gate }) },
      { label: "Spectral tight", short: "TGHT", value: sp.tight, min: 0, max: 1, step: .01, fmt: pct, set: tight => SP({ tight }) },
      { label: "Spectral blur", short: "BLUR", value: sp.blur, min: 0, max: 1, step: .01, fmt: pct, set: blur => SP({ blur }) },
      { label: "Spectral bite", short: "BITE", value: sp.bite, min: 0, max: 1, step: .01, fmt: pct, set: bite => SP({ bite }) }];
    if (page === "O1" || page === "O2") {
      const k = page === "O1" ? "osc1" : "osc2", o = s[k];
      const set = (p: Partial<typeof o>) => S({ [k]: { ...o, ...p } } as Partial<typeof s>);
      const base: Knob[] = [
        { label: `${k} gain`, short: "GAIN", value: o.gain, min: 0, max: 1, step: .01, fmt: pct, set: gain => set({ gain }) },
        // O1 carries the pad's root NOTE; O2 keeps its PTCH as the interval to osc 1.
        k === "osc1" ? noteK : { label: `${k} pitch`, short: "PTCH", value: o.coarse, min: -24, max: 24, step: 1, bare: true, reset: 0, fmt: v => `P${st(v)}`, set: coarse => set({ coarse }) },
        { label: `${k} fine`, short: "FINE", value: Math.max(-50, Math.min(50, o.fine)), min: -50, max: 50, step: 1, bare: true, reset: 0, fmt: v => `F${fineSt(v)}`, set: fine => set({ fine }) },
      ];
      if (k === "osc2") base.push({ label: "FM amount", short: "FM", value: s.osc2.fmAmount, min: 0, max: 10, step: .05, reset: 0, fmt: v => `${v.toFixed(1)}${s.fenvFm ? "E" : ""}`, set: fmAmount => S({ osc2: { ...s.osc2, fmAmount } }) });
      else base.push({ label: "Noise", short: "NOIZ", value: s.noise, min: 0, max: 1, step: .01, fmt: pct, set: noise => S({ noise }) });
      return base;
    }
    if (page === "FLT") return [
      { label: "Cutoff", short: "CUT", value: s.cutoff, min: 40, max: 16000, step: 1, log: true, fmt: v => v >= 9950 ? `${Math.round(v / 1000)}K` : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${Math.round(v)}HZ`, set: cutoff => S({ cutoff }) },
      { label: "Resonance", short: "RES", value: s.res, min: .1, max: 20, step: .1, fmt: v => v.toFixed(1), set: res => S({ res }) },
      // FENV is 0-100% of a 4-octave sweep; FDEC was removed because the FLT ADSR owns the envelope shape.
      { label: "Filter env", short: "FENV", value: Math.max(0, s.filterEnv) / 4, min: 0, max: 1, step: .01, fmt: pct, set: v => S({ filterEnv: v * 4 }) },
      // EFM: filter envelope drives FM amount on its own, independent of the cutoff depth.
      { label: "Filter env to FM", short: "EFM", value: s.fenvFm ?? 0, min: 0, max: 1, step: .01, reset: 0, fmt: pct, set: fenvFm => S({ fenvFm }) },
      { label: "Dry / wet", short: "WET", value: s.wet, min: 0, max: 1, step: .01, fmt: pct, set: wet => S({ wet }) },
    ];
    if (page === "LFO") return lfoPage === "SHP" ? [
      { label: "LFO rate", short: "RATE", value: s.lfo.rate, min: .05, max: 20, step: .05, fmt: v => `${v.toFixed(1)}HZ`, set: rate => S({ lfo: { ...s.lfo, rate } }) },
      { label: "LFO attack", short: "ATK", value: s.lfo.attack ?? 0, min: 0, max: 4, step: .01, fmt: ms, set: attack => S({ lfo: { ...s.lfo, attack } }) },
      { label: "LFO to volume", short: "VOL", value: ld.amp, min: 0, max: 1, step: .01, fmt: pct, set: v => setDest("amp", v) },
    ] : [
      { label: "LFO to pitch", short: "PIT", value: ld.pitch, min: 0, max: 1, step: .01, fmt: pct, set: v => setDest("pitch", v) },
      { label: "LFO to cutoff", short: "CUT", value: ld.cutoff, min: 0, max: 1, step: .01, fmt: pct, set: v => setDest("cutoff", v) },
      { label: "LFO to osc 1 level", short: "O1", value: ld.osc1, min: 0, max: 1, step: .01, fmt: pct, set: v => setDest("osc1", v) },
      { label: "LFO to osc 2 level", short: "O2", value: ld.osc2, min: 0, max: 1, step: .01, fmt: pct, set: v => setDest("osc2", v) },
    ];
    return envKnobs(selectedEnv, setSelectedEnv);
  };

  // Oscilloscope trace computed from the current settings so it reacts as the sound is shaped.
  const scope = (p: import("@/pixel/draw").Px, page: string) => {
    const X0 = 3, W = 122, Y0 = 26, H = 15, mid = Y0 + 7;
    p.box(2, Y0 - 1, 124, H + 2);
    for (let x = X0; x < X0 + W; x += 4) p.dot(x, mid);
    const shape = (w: Wave, ph: number) => { const t = ((ph % 1) + 1) % 1;
      if (w === "sine") return Math.sin(t * Math.PI * 2);
      if (w === "triangle") return 1 - Math.abs(t * 4 - 2);
      if (w === "sawtooth") return t * 2 - 1;
      return t < .5 ? 1 : -1; };
    const lfoShape = (t: number) => shape(s.lfo.wave, t);
    if (page === "LFO") {
      const amp = Math.max(.15, lfoMax), atk = s.lfo.attack ?? 0;
      let prev: [number, number] | null = null;
      // The trace fades in across the first part of the window to show the LFO attack (window ~ 2 s).
      for (let i = 0; i < W; i++) { const t = i / W, fade = atk > 0 ? Math.min(1, t * 2 / atk) : 1;
        const v = lfoShape(t * Math.min(6, Math.max(.5, s.lfo.rate / 2))) * amp * fade;
        const pt: [number, number] = [X0 + i, mid - Math.round(Math.max(-1, Math.min(1, v)) * 6)];
        if (prev) p.line(prev[0], prev[1], pt[0], pt[1]); prev = pt; }
      return;
    }
    const k = page === "O1" ? "osc1" : "osc2", o = s[k];
    // Two detuned cycles of the oscillator, FM-wobbled by the LFO, smoothed by the filter, plus noise.
    const cycles = 2 + Math.max(0, o.coarse + 24) / 48 * 3, det = 1 + o.fine / 400;
    const smooth = 1 - Math.min(.92, Math.log(s.cutoff / 40) / Math.log(400));
    const lfoAmt = ld.pitch / 24, lfoCyc = Math.min(6, s.lfo.rate / 2);
    let y = 0, ph = 0, prev: [number, number] | null = null, seed = 7;
    for (let i = 0; i < W; i++) { const t = i / W;
      const fm = 1 + lfoShape(t * lfoCyc) * lfoAmt * .5; ph += cycles / W * fm;
      seed = (seed * 16807) % 2147483647; const nz = (seed / 2147483647 * 2 - 1) * s.noise * .5;
      const v = shape(o.wave as Wave, ph) * (o.gain * .6 + .4) + shape(o.wave as Wave, ph * det) * .2 + nz;
      y += (v - y) * (1 - smooth * .85);
      const pt: [number, number] = [X0 + i, mid - Math.round(Math.max(-1, Math.min(1, y)) * 6)];
      if (prev) p.line(prev[0], prev[1], pt[0], pt[1]); prev = pt; }
  };

  const modeKey = (p: import("@/pixel/draw").Px) => { p.box(96, 11, 30, 10); if (spec) p.invert(97, 12, 28, 8); p.textC(spec ? "ADD" : "SPEC", 111, 13, !spec); };
  const body = (p: import("@/pixel/draw").Px, page: string) => {
    if (page === "BND" || page === "SPC") {
      modeKey(p); p.text(page === "BND" ? "BANDS" : `GATE ${Math.round(sp.gate * 100)}`, 3, 13);
      p.box(2, 25, 124, 19, true);
      for (let i = 0; i < N_BANDS; i++) { const v = sp.bands[i], bh = Math.round(v * 15), x = 4 + i * 7.6;
        if (page === "BND") p.rect(x, 42 - bh, 4, bh);
        else if (sp.gate < .01 || !gateFresh()) p.rect(x, 42 - bh, 4, bh); }
        // SPC: the gate's real retained/suppressed bins (64 log-spaced), solid = kept, floor tick = gated out.
        if (page === "SPC" && sp.gate > .01 && gateFresh()) { const m = specGateMask.bins;
          for (let b = 0; b < 64; b++) { const x = 4 + Math.round(b * 1.9), h = Math.round(m[b] * 15); if (h > 0) p.rect(x, 42 - h, 1, h); else p.dot(x, 42); } }
      if (page === "SPC") { const w = Math.round(8 + sp.blur * 40), tl = Math.round(4 + (1 - sp.tight) * 40); p.text(`T${Math.round(sp.tight * 100)} B${Math.round(sp.blur * 100)}`, 3, 19); p.line(70, 22, 70 + tl, 22); p.line(70, 24, 70 + w, 24); }
      return;
    }
    if (page === "O1") modeKey(p);
    if (page === "O1" || page === "O2") {
      const k = page === "O1" ? "osc1" : "osc2", o = s[k];
      const stored = k === "osc2" ? (s.partials2 ?? s.partials) : s.partials;
      const wname = o.wave === "additive" ? addLabel(stored) : NATIVE[o.wave];
      const pl = o.wave === "additive" ? stored : presetPartials(wname);
      {
        const columns = synthPreviewColumns(pl, o.wave === "additive" ? undefined : o.wave);
        let prev = 0; columns.forEach((c, x) => {
          const y = 17 - Math.round(c.value * 5);
          if (x) p.line(1 + x, prev, 2 + x, y);
          p.line(2 + x, 17 - Math.round(c.max * 5), 2 + x, 17 - Math.round(c.min * 5));
          prev = y;
        });
      }
      p.text(`${wname} >`, 28, 15);
      if (k === "osc2") { p.box(74, 12, 25, 7); if (s.osc2.mode === "fm") p.invert(75, 13, 23, 5); p.text(s.osc2.mode === "fm" ? "MIX" : "FM", 79, 13, s.osc2.mode !== "fm"); }
      // Native waves from older sets are represented by their matching harmonic recipe immediately,
      // so every oscillator page keeps the same additive editor before and after the first wave change.
      p.box(2, 25, 124, 19, true);
      for (let i = 0; i < 16; i++) { const v = pl[i] ?? 0, bh = Math.round(v * 15); p.rect(4 + i * 7.6, 42 - bh, 4, bh); if (i % 2) p.dot(5 + i * 7.6, 42); }
      // Octave markers (harmonics 1, 2, 4, 8, 16) show which bars sit on the root's octaves.
      [0, 1, 3, 7, 15].forEach(i => p.line(5 + i * 7.6, 26, 6 + i * 7.6, 26));
    } else if (page === "FLT") {
      drawFilterCurve(p, s.filter, s.cutoff, s.res, 2, 11, 124, 32);
      p.text(s.filter.slice(0, 2).toUpperCase(), 4, 13);
    } else if (page === "LFO") {
      drawWaveIcon(p, s.lfo.wave, 2, 11, 22, 12);
      p.text(s.lfo.wave.slice(0, 3).toUpperCase(), 28, 15);
      { const tr = !!s.lfo.retrig; p.box(46, 10, 28, 8); if (tr) p.invert(47, 11, 26, 6); p.textC(tr ? "TRIG" : "FREE", 60, 11, tr); }
      (["SHP", "DST"] as const).forEach((k, i) => { const x = 76 + i * 25; p.box(x, 10, 24, 8); if (k === lfoPage) p.invert(x + 1, 11, 22, 6); p.textC(k, x + 12, 11, k !== lfoPage); });
      scope(p, page);
    } else {
      drawEnvGraph(p, selectedEnv, 2, 16, 124, 27);
      const amount = envPage === "PIT" ? s.pitchEnv : envPage === "FLT" ? s.filterEnv : 0;
      if (envPage === "FLT") { p.text(`C${Math.round(Math.max(0, s.filterEnv) / 4 * 100)}`, 3, 11); p.text(`FM${Math.round((s.fenvFm ?? 0) * 100)}`, 30, 11); }
      else p.text(envPage === "AMP" ? "LEVEL" : `${amount >= 0 ? "+" : ""}${amount.toFixed(1)}`, 3, 11);
      (["AMP", "PIT", "FLT"] as const).forEach((k, i) => { const x = 61 + i * 21; p.box(x, 11, 20, 5); if (k === envPage) p.invert(x + 1, 12, 18, 3); p.text(k, x + 4, 11, k !== envPage); });
    }
  };

  const extra = (page: string) => {
    const mk = <Tap x={96} y={11} w={30} h={10} label={`Switch to ${spec ? "ADD" : "SPEC"}`} pressed={spec} onClick={toggleMode} />;
    if (page === "BND") return <>{mk}<BarDraw x={3} y={26} w={122} h={17} values={sp.bands} onChange={bands => SP({ bands })} /></>;
    if (page === "SPC") return mk;
    if (page === "O1" || page === "O2") {
      const k = page === "O1" ? "osc1" : "osc2", o = s[k];
      const stored = k === "osc2" ? (s.partials2 ?? s.partials) : s.partials;
      const name = o.wave === "additive" ? addLabel(stored) : NATIVE[o.wave];
      const pl = o.wave === "additive" ? stored : presetPartials(name);
      const setPartials = (partials: number[]) => S({ [k]: { ...o, wave: "additive" }, ...(k === "osc2" ? { partials2: partials } : { partials }) } as Partial<typeof s>);
      const nextWave = () => { const cur = PRESETS.findIndex(([n]) => n === name), nx = PRESETS[(cur + 1) % PRESETS.length][1]; S({ [k]: { ...o, wave: "additive" }, ...(k === "osc2" ? { partials2: nx } : { partials: nx }) } as Partial<typeof s>); };
      return <>
        {page === "O1" && mk}
        <Tap x={2} y={11} w={60} h={12} label={`${k} waveform: ${name}, tap for next`} onClick={nextWave} />
        {k === "osc2" && <Tap x={72} y={10} w={30} h={11} label={`Switch Osc 2 to ${s.osc2.mode === "fm" ? "MIX" : "FM"}`} pressed={s.osc2.mode === "fm"} onClick={() => S({ osc2: { ...s.osc2, mode: s.osc2.mode === "fm" ? "mix" : "fm" } })} />}
        {/* Each oscillator owns its partial set; editing a legacy native wave converts that matching recipe to additive. */}
        <BarDraw x={3} y={26} w={122} h={17} values={pl.slice(0, 16)} onChange={setPartials} />
        {pl.slice(0, 16).map((v, i) => <Zone key={i} x={3 + i * 7.6} y={42} w={7} h={2} label={`${k} harmonic ${i + 1}`} value={v} min={0} max={1} step={.01} onChange={nv => { const partials = pl.slice(); partials[i] = nv; setPartials(partials); }} />)}
      </>;
    }
    if (page === "FLT") return <Zone x={2} y={11} w={124} h={32} horizontal label="Cutoff" value={s.cutoff} min={40} max={16000} step={1} log onChange={cutoff => S({ cutoff })} />;
    if (page === "LFO") return <>
      <Tap x={2} y={11} w={42} h={12} label="LFO waveform, tap for next" onClick={() => { const W: Wave[] = ["sine", "triangle", "sawtooth", "square"]; S({ lfo: { ...s.lfo, wave: W[(W.indexOf(s.lfo.wave) + 1) % 4] } }); }} />
      <Tap x={46} y={10} w={28} h={8} label="LFO free or retrigger" pressed={!!s.lfo.retrig} onClick={() => S({ lfo: { ...s.lfo, retrig: !s.lfo.retrig } })} />
      {(["SHP", "DST"] as const).map((k, i) => <Tap key={k} x={76 + i * 25} y={10} w={24} h={8} label={k === "SHP" ? "LFO shape page" : "LFO destinations page"} pressed={lfoPage === k} onClick={() => setLfoPage(k)} />)}
    </>;
    if (page === "ENV") return <>
      {envPage === "PIT" && <Zone x={2} y={10} w={55} h={7} label="Pitch envelope amount" value={s.pitchEnv} min={-24} max={24} step={1} onChange={pitchEnv => S({ pitchEnv })} />}
      {envPage === "FLT" && <><Zone x={2} y={10} w={27} h={7} label="Filter envelope amount" value={Math.max(0, s.filterEnv)} min={0} max={4} step={.04} reset={0} onChange={filterEnv => S({ filterEnv })} />
        <Zone x={29} y={10} w={30} h={7} label="Filter envelope to FM" value={s.fenvFm ?? 0} min={0} max={1} step={.01} reset={0} onChange={fenvFm => S({ fenvFm })} /></>}
      {(["AMP", "PIT", "FLT"] as const).map((k, i) => <Tap key={k} x={61 + i * 21} y={10} w={20} h={7} label={`${k} envelope`} pressed={envPage === k} onClick={() => setEnvPage(k)} />)}
      <EnvZones env={selectedEnv} set={setSelectedEnv} y0={16} h={27} />
    </>;
    return null;
  };

  return <Panel name={slot.name || "SYN"} pages={spec ? SPEC_PAGES : PAGES} label="Cyberspace synth" knobs={knobs} body={body} extra={extra} live={pg => pg === "SPC" && spec ? gateFresh : undefined} deps={[slot.name, s, envPage, lfoPage]} />;
}
export default memo(CyberspacePanel);
