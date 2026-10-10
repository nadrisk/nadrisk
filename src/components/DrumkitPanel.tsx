import { memo } from "react";
import { Tap, Zone } from "@/pixel/PixelScreen";
import { Panel, drawEnvGraph, drawFilterCurve, envKnobs, hz, ms, pct, st, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";

const PAGES = ["DRM", "TN", "FLT", "ENV"] as const;
const KINDS = ["kick", "snare", "hat"] as const;

// DRUMKIT: the drum editor as a 128x64 1-bit hardware screen.
function DrumkitPanel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const d = slot.drum;
  const D = (p: Partial<typeof d>) => onChange({ drum: { ...d, ...p } });

  const knobs = (page: string): Knob[] => {
    if (page === "DRM") return [
      { label: "Pitch", short: "PTCH", value: d.pitch, min: 20, max: 1200, step: 1, fmt: hz, set: pitch => D({ pitch }) },
      { label: "Pitch env", short: "PENV", value: d.pitchEnv, min: 0, max: 48, step: 1, fmt: st, set: pitchEnv => D({ pitchEnv }) },
      { label: "Env decay", short: "PDEC", value: d.pitchDecay, min: .005, max: .5, step: .005, fmt: ms, set: pitchDecay => D({ pitchDecay }) },
      { label: "Noise", short: "NOIZ", value: d.noise, min: 0, max: 1, step: .01, fmt: pct, set: noise => D({ noise }) },
    ];
    if (page === "TN") return [
      { label: "FM", short: "FM", value: d.fm, min: 0, max: 10, step: .1, fmt: v => v.toFixed(1), set: fm => D({ fm }) },
      { label: "FM ratio", short: "RATO", value: d.fmRatio, min: .25, max: 8, step: .01, fmt: v => v.toFixed(2), set: fmRatio => D({ fmRatio }) },
      { label: "Ring mod", short: "RING", value: d.ring, min: 0, max: 1, step: .01, fmt: pct, set: ring => D({ ring }) },
      { label: "Ring freq", short: "RFRQ", value: d.ringFreq, min: 20, max: 5000, step: 1, fmt: hz, set: ringFreq => D({ ringFreq }) },
    ];
    if (page === "FLT") return [
      { label: "Cutoff", short: "CUT", value: d.cutoff, min: 40, max: 16000, step: 10, fmt: hz, set: cutoff => D({ cutoff }) },
      { label: "Resonance", short: "RES", value: d.res, min: .1, max: 20, step: .1, fmt: v => v.toFixed(1), set: res => D({ res }) },
      { label: "Filter env", short: "FENV", value: d.filterEnv, min: -4, max: 4, step: .1, fmt: v => `${v > 0 ? "+" : ""}${v.toFixed(1)}`, set: filterEnv => D({ filterEnv }) },
      { label: "Env decay", short: "FDEC", value: d.filterDecay, min: .005, max: 1, step: .005, fmt: ms, set: filterDecay => D({ filterDecay }) },
    ];
    return envKnobs(d.env, env => D({ env }));
  };

  const body = (p: import("@/pixel/draw").Px, page: string) => {
    if (page === "DRM") {
      // Pitch-envelope arrow graph: start pitch falls to base pitch.
      p.box(14, 11, 114, 34);
      const y0 = 14, y1 = 41, x0 = 17, x1 = 124;
      const dec = Math.max(2, Math.round(d.pitchDecay / .5 * 90));
      p.line(x0, y0, x0 + dec, y1); p.line(x0 + dec, y1, x1, y1);
      p.rect(x0 - 1, y0 - 1, 3, 3); p.rect(x0 + dec - 1, y1 - 1, 3, 3);
      p.text(d.kind.toUpperCase().slice(0, 3), 100, 14);
      KINDS.forEach((k, i) => { const x = 17 + i * 22; p.box(x, 36, 20, 7); if (k === d.kind) p.invert(x + 1, 37, 18, 5); p.text(k.slice(0, 3).toUpperCase(), x + 2, 37, k !== d.kind); });
    } else if (page === "TN") {
      // FM/ring amount meters.
      p.box(14, 11, 114, 34);
      const bars: [string, number][] = [["FM", d.fm / 10], ["RAT", d.fmRatio / 8], ["RNG", d.ring], ["FRQ", d.ringFreq / 5000]];
      bars.forEach(([lb, v], i) => { const x = 20 + i * 28, bh = Math.round(v * 26); p.rect(x, 41 - bh, 12, bh); p.textC(lb, x + 6, 14); });
    } else if (page === "FLT") {
      drawFilterCurve(p, d.filter, d.cutoff, d.res);
      p.text(d.filter.slice(0, 2).toUpperCase(), 16, 13);
    } else {
      drawEnvGraph(p, d.env);
    }
  };

  const extra = (page: string) => {
    if (page === "DRM") return <>
      {KINDS.map((k, i) => <Tap key={k} x={17 + i * 22} y={35} w={20} h={9} label={`Drum type ${k}`} pressed={k === d.kind} onClick={() => D({ kind: k })} />)}
      <Zone x={14} y={10} w={80} h={25} horizontal label="Pitch env decay" value={d.pitchDecay} min={.005} max={.5} step={.005} onChange={pitchDecay => D({ pitchDecay })} />
    </>;
    if (page === "FLT") return <Zone x={14} y={10} w={114} h={35} horizontal label="Cutoff" value={d.cutoff} min={40} max={16000} step={10} onChange={cutoff => D({ cutoff })} />;
    return null;
  };

  return <Panel name={slot.name || "DRM"} pages={PAGES} label="Drumkit drum" knobs={knobs} body={body} extra={extra} deps={[slot.name, d]} />;
}
export default memo(DrumkitPanel);
