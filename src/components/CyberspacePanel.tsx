import { useNoteKnob } from "@/components/harmonyKnob";
import { memo, useState } from "react";
import { BarDraw, Tap, Zone } from "@/pixel/PixelScreen";
import { Panel, drawEnvGraph, drawFilterCurve, drawWaveIcon, EnvZones, envKnobs, fineSt, hz, ms, pct, st, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";
import { lfoDests, type LfoDests, type Wave } from "@/audio/voices";

const PAGES = ["O1", "O2", "FLT", "LFO", "ENV"] as const;

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
  const knobs = (page: string): Knob[] => {
    if (page === "O1" || page === "O2") {
      const k = page === "O1" ? "osc1" : "osc2", o = s[k];
      const set = (p: Partial<typeof o>) => S({ [k]: { ...o, ...p } } as Partial<typeof s>);
      const base: Knob[] = [
        { label: `${k} gain`, short: "GAIN", value: o.gain, min: 0, max: 1, step: .01, fmt: pct, set: gain => set({ gain }) },
        // O1 carries the pad's root NOTE; O2 keeps its PTCH as the interval to osc 1.
        k === "osc1" ? noteK : { label: `${k} pitch`, short: "PTCH", value: o.coarse, min: -24, max: 24, step: 1, bare: true, fmt: v => `P${st(v)}`, set: coarse => set({ coarse }) },
        { label: `${k} fine`, short: "FINE", value: Math.max(-50, Math.min(50, o.fine)), min: -50, max: 50, step: 1, bare: true, fmt: v => `F${fineSt(v)}`, set: fine => set({ fine }) },
      ];
      if (k === "osc2") base.push({ label: "FM amount", short: "FM", value: s.osc2.fmAmount, min: 0, max: 10, step: .05, fmt: v => v.toFixed(1), set: fmAmount => S({ osc2: { ...s.osc2, fmAmount } }) });
      else base.push({ label: "Noise", short: "NOIZ", value: s.noise, min: 0, max: 1, step: .01, fmt: pct, set: noise => S({ noise }) });
      return base;
    }
    if (page === "FLT") return [
      { label: "Cutoff", short: "CUT", value: s.cutoff, min: 40, max: 16000, step: 1, log: true, fmt: hz, set: cutoff => S({ cutoff }) },
      { label: "Resonance", short: "RES", value: s.res, min: .1, max: 20, step: .1, fmt: v => v.toFixed(1), set: res => S({ res }) },
      // FENV is 0-100% of a 4-octave sweep; FDEC was removed because the FLT ADSR owns the envelope shape.
      { label: "Filter env", short: "FENV", value: Math.max(0, s.filterEnv) / 4, min: 0, max: 1, step: .01, fmt: pct, set: v => S({ filterEnv: v * 4 }) },
    ];
    if (page === "LFO") return lfoPage === "SHP" ? [
      { label: "LFO rate", short: "RATE", value: s.lfo.rate, min: .05, max: 20, step: .05, fmt: v => `${v.toFixed(1)}HZ`, set: rate => S({ lfo: { ...s.lfo, rate } }) },
      { label: "LFO attack", short: "ATK", value: s.lfo.attack ?? 0, min: 0, max: 4, step: .01, fmt: ms, set: attack => S({ lfo: { ...s.lfo, attack } }) },
      { label: "LFO to volume", short: "VOL", value: ld.amp, min: 0, max: 1, step: .01, fmt: pct, set: v => setDest("amp", v) },
      { label: "Dry / wet", short: "WET", value: s.wet, min: 0, max: 1, step: .01, fmt: pct, set: wet => S({ wet }) },
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
    if (o.wave === "additive") return; // additive shows the partial bars instead
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

  const body = (p: import("@/pixel/draw").Px, page: string) => {
    if (page === "O1" || page === "O2") {
      const k = page === "O1" ? "osc1" : "osc2", o = s[k];
      drawWaveIcon(p, o.wave, 2, 11, 22, 12);
      p.text(`${o.wave.slice(0, 5).toUpperCase()} >`, 28, 15);
      if (k === "osc2") { p.box(74, 12, 25, 7); if (s.osc2.mode === "fm") p.invert(75, 13, 23, 5); p.text(s.osc2.mode === "fm" ? "FM" : "MIX", 79, 13, s.osc2.mode !== "fm"); }
      if (o.wave === "additive") {
        // A bounded 16-partial display leaves a clean row for the four knobs below.
        const pl = k === "osc2" ? (s.partials2 ?? s.partials) : s.partials;
        p.box(2, 25, 124, 19, true);
        for (let i = 0; i < 16; i++) { const v = pl[i] ?? 0, bh = Math.round(v * 15); p.rect(4 + i * 7.6, 42 - bh, 4, bh); if (i % 2) p.dot(5 + i * 7.6, 42); }
      } else {
        scope(p, page);
      }
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
      p.text(envPage === "AMP" ? "LEVEL" : `${amount >= 0 ? "+" : ""}${amount.toFixed(1)}`, 3, 11);
      (["AMP", "PIT", "FLT"] as const).forEach((k, i) => { const x = 61 + i * 21; p.box(x, 11, 20, 5); if (k === envPage) p.invert(x + 1, 12, 18, 3); p.text(k, x + 4, 11, k !== envPage); });
    }
  };

  const extra = (page: string) => {
    if (page === "O1" || page === "O2") {
      const k = page === "O1" ? "osc1" : "osc2", o = s[k];
      const waves: (Wave | "additive")[] = ["sine", "triangle", "sawtooth", "square", "additive"];
      const idx = Math.max(0, waves.indexOf(o.wave));
      return <>
        <Tap x={2} y={11} w={60} h={12} label={`${k} waveform: ${o.wave}, tap for next`} onClick={() => S({ [k]: { ...o, wave: waves[(idx + 1) % waves.length] } } as Partial<typeof s>)} />
        {k === "osc2" && <Tap x={72} y={10} w={30} h={11} label={`Osc 2 mode: ${s.osc2.mode}, tap to switch`} pressed={s.osc2.mode === "fm"} onClick={() => S({ osc2: { ...s.osc2, mode: s.osc2.mode === "fm" ? "mix" : "fm" } })} />}
        {o.wave === "additive" && <>
          {/* Each oscillator owns its partial set: osc2 edits partials2 (seeded from partials once). */}
          <BarDraw x={3} y={26} w={122} h={17} values={(k === "osc2" ? (s.partials2 ?? s.partials) : s.partials).slice(0, 16)}
            onChange={partials => S(k === "osc2" ? { partials2: partials } : { partials })} />
          {(k === "osc2" ? (s.partials2 ?? s.partials) : s.partials).slice(0, 16).map((v, i) => <Zone key={i} x={3 + i * 7.6} y={42} w={7} h={2} label={`${k} harmonic ${i + 1}`} value={v} min={0} max={1} step={.01} onChange={nv => { const partials = (k === "osc2" ? (s.partials2 ?? s.partials) : s.partials).slice(); partials[i] = nv; S(k === "osc2" ? { partials2: partials } : { partials }); }} />)}
        </>}
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
      {envPage === "FLT" && <Zone x={2} y={10} w={55} h={7} label="Filter envelope amount" value={Math.max(0, s.filterEnv)} min={0} max={4} step={.04} onChange={filterEnv => S({ filterEnv })} />}
      {(["AMP", "PIT", "FLT"] as const).map((k, i) => <Tap key={k} x={61 + i * 21} y={10} w={20} h={7} label={`${k} envelope`} pressed={envPage === k} onClick={() => setEnvPage(k)} />)}
      <EnvZones env={selectedEnv} set={setSelectedEnv} y0={16} h={27} />
    </>;
    return null;
  };

  return <Panel name={slot.name || "SYN"} pages={PAGES} label="Cyberspace synth" knobs={knobs} body={body} extra={extra} deps={[slot.name, s, envPage, lfoPage]} />;
}
export default memo(CyberspacePanel);
