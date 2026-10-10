import { memo } from "react";
import { Zone } from "@/pixel/PixelScreen";
import { Panel, drawEnvGraph, drawFilterCurve, drawWaveIcon, envKnobs, f01, hz, ms, pct, st, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";
import type { Wave } from "@/audio/voices";

const PAGES = ["O1", "O2", "FLT", "LFO", "ENV"] as const;

// CYBERSPACE: the synth editor as a 128x64 1-bit hardware screen.
function CyberspacePanel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const s = slot.synth;
  const S = (p: Partial<typeof s>) => onChange({ synth: { ...s, ...p } });

  const knobs = (page: string): Knob[] => {
    if (page === "O1" || page === "O2") {
      const k = page === "O1" ? "osc1" : "osc2", o = s[k];
      const set = (p: Partial<typeof o>) => S({ [k]: { ...o, ...p } } as Partial<typeof s>);
      const base: Knob[] = [
        { label: `${k} gain`, short: "GAIN", value: o.gain, min: 0, max: 1, step: .01, fmt: pct, set: gain => set({ gain }) },
        { label: `${k} pitch`, short: "PTCH", value: o.coarse, min: -24, max: 24, step: 1, fmt: st, set: coarse => set({ coarse }) },
        { label: `${k} fine`, short: "FINE", value: o.fine, min: -50, max: 50, step: 1, fmt: v => `${Math.round(v)}CT`, set: fine => set({ fine }) },
      ];
      if (k === "osc2") base.push({ label: "FM amount", short: "FM", value: s.osc2.fmAmount, min: 0, max: 10, step: .05, fmt: v => v.toFixed(1), set: fmAmount => S({ osc2: { ...s.osc2, fmAmount } }) });
      else base.push({ label: "Noise", short: "NOIZ", value: s.noise, min: 0, max: 1, step: .01, fmt: pct, set: noise => S({ noise }) });
      return base;
    }
    if (page === "FLT") return [
      { label: "Cutoff", short: "CUT", value: s.cutoff, min: 40, max: 16000, step: 10, fmt: hz, set: cutoff => S({ cutoff }) },
      { label: "Resonance", short: "RES", value: s.res, min: .1, max: 20, step: .1, fmt: v => v.toFixed(1), set: res => S({ res }) },
      { label: "Filter env", short: "FENV", value: s.filterEnv, min: -4, max: 4, step: .1, fmt: v => `${v > 0 ? "+" : ""}${v.toFixed(1)}`, set: filterEnv => S({ filterEnv }) },
      { label: "Env decay", short: "FDEC", value: s.filterDecay, min: .005, max: 2, step: .005, fmt: ms, set: filterDecay => S({ filterDecay }) },
    ];
    if (page === "LFO") return [
      { label: "LFO rate", short: "RATE", value: s.lfo.rate, min: .05, max: 20, step: .05, fmt: v => `${v.toFixed(1)}HZ`, set: rate => S({ lfo: { ...s.lfo, rate } }) },
      { label: "LFO depth", short: "DPTH", value: s.lfo.depth, min: 0, max: 1, step: .01, fmt: pct, set: depth => S({ lfo: { ...s.lfo, depth } }) },
      { label: "Dry / wet", short: "WET", value: s.wet, min: 0, max: 1, step: .01, fmt: pct, set: wet => S({ wet }) },
      { label: "Pitch env", short: "PENV", value: s.pitchEnv, min: -24, max: 24, step: 1, fmt: st, set: pitchEnv => S({ pitchEnv }) },
    ];
    return envKnobs(s.env, env => S({ env }));
  };

  const body = (p: import("@/pixel/draw").Px, page: string) => {
    if (page === "O1" || page === "O2") {
      const k = page === "O1" ? "osc1" : "osc2", o = s[k];
      drawWaveIcon(p, o.wave, 14, 12, 24, 14);
      p.text(o.wave.slice(0, 5).toUpperCase(), 42, 14);
      if (k === "osc2") { p.box(42, 22, 25, 7); if (s.osc2.mode === "fm") p.invert(43, 23, 23, 5); p.text(s.osc2.mode.toUpperCase(), 45, 23, s.osc2.mode !== "fm"); }
      if (k === "osc1" && o.wave === "additive") {
        // A bounded 16-partial display leaves a clean row for the four knobs below.
        p.box(13, 17, 114, 25, true);
        for (let i = 0; i < 16; i++) { const v = s.partials[i] ?? 0, bh = Math.round(v * 20); p.rect(15 + i * 7, 40 - bh, 4, bh); if (i % 2) p.dot(16 + i * 7, 40); }
      } else {
        // Big stepped waveform preview.
        p.box(14, 28, 114, 17);
        for (let i = 0; i < 112; i++) {
          const t = i / 112; let dy = 0;
          if (o.wave === "sine") dy = Math.sin(t * Math.PI * 4);
          else if (o.wave === "triangle") dy = Math.abs(t * 4 - 2) - 1;
          else if (o.wave === "sawtooth") dy = t * 2 - 1;
          else dy = t < .5 ? -1 : 1;
          p.dot(15 + i, 36 - Math.round(dy * 6));
        }
      }
    } else if (page === "FLT") {
      drawFilterCurve(p, s.filter, s.cutoff, s.res);
      p.text(s.filter.slice(0, 2).toUpperCase(), 16, 13);
    } else if (page === "LFO") {
      drawWaveIcon(p, s.lfo.wave, 14, 12, 24, 14);
      p.text(s.lfo.target.toUpperCase().slice(0, 5), 42, 14);
      // LFO cycle preview with depth-scaled amplitude.
      p.box(14, 28, 114, 17);
      const amp = Math.max(1, Math.round(s.lfo.depth * 6));
      for (let i = 0; i < 112; i++) { const t = i / 112; p.dot(15 + i, 36 - Math.round(Math.sin(t * Math.PI * 2) * amp)); }
    } else {
      drawEnvGraph(p, s.env);
    }
  };

  const extra = (page: string) => {
    if (page === "O1" || page === "O2") {
      const k = page === "O1" ? "osc1" : "osc2", o = s[k];
      const waves: (Wave | "additive")[] = k === "osc1" ? ["sine", "triangle", "sawtooth", "square", "additive"] : ["sine", "triangle", "sawtooth", "square"];
      const idx = Math.max(0, waves.indexOf(o.wave as Wave));
      return <>
        <Zone x={14} y={11} w={24} h={15} label={`${k} waveform`} value={idx} min={0} max={waves.length - 1} step={1} onChange={v => { const set = { [k]: { ...o, wave: waves[Math.round(v)] } } as Partial<typeof s>; S(set); }} />
        {k === "osc2" && <Zone x={42} y={21} w={25} h={9} label="Osc 2 mode" value={s.osc2.mode === "fm" ? 1 : 0} min={0} max={1} step={1} onChange={v => S({ osc2: { ...s.osc2, mode: v >= .5 ? "fm" : "mix" } })} />}
        {k === "osc1" && o.wave === "additive" && s.partials.slice(0, 16).map((v, i) => (
          <Zone key={i} x={14 + i * 7} y={18} w={6} h={23} label={`Harmonic ${i + 1}`} value={v} min={0} max={1} step={.01}
            onChange={nv => { const partials = s.partials.slice(); partials[i] = nv; S({ partials }); }} />
        ))}
      </>;
    }
    if (page === "FLT") return <Zone x={14} y={10} w={114} h={35} horizontal label="Cutoff" value={s.cutoff} min={40} max={16000} step={10} onChange={cutoff => S({ cutoff })} />;
    if (page === "LFO") return <Zone x={14} y={11} w={24} h={15} label="LFO waveform" value={["sine", "triangle", "sawtooth", "square"].indexOf(s.lfo.wave)} min={0} max={3} step={1} onChange={v => S({ lfo: { ...s.lfo, wave: (["sine", "triangle", "sawtooth", "square"] as Wave[])[Math.round(v)] } })} />;
    return null;
  };

  return <Panel name={slot.name || "SYN"} pages={PAGES} label="Cyberspace synth" knobs={knobs} body={body} extra={extra} deps={[slot.name, s]} />;
}
export default memo(CyberspacePanel);
