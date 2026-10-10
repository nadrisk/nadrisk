import { memo } from "react";
import { Zone } from "@/pixel/PixelScreen";
import { Panel, drawEnvGraph, drawFilterCurve, EnvZones, envKnobs, hz, pct, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";

const PAGES = ["VOX", "FLT", "ENV"] as const;

// ENSEMBLE: the poly editor as a 128x64 1-bit hardware screen.
function EnsemblePanel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const y = slot.poly;
  const Y = (p: Partial<typeof y>) => onChange({ poly: { ...y, ...p } });

  const knobs = (page: string): Knob[] => {
    if (page === "VOX") return [
      { label: "Poly sub", short: "SUB", value: y.sub, min: 0, max: 1, step: .01, fmt: pct, set: sub => Y({ sub }) },
      { label: "Poly pulse", short: "PLS", value: y.pulse, min: 0, max: 1, step: .01, fmt: pct, set: pulse => Y({ pulse }) },
      { label: "Poly detune", short: "DET", value: y.detune, min: 0, max: 30, step: .1, fmt: v => `${v.toFixed(0)}CT`, set: detune => Y({ detune }) },
      { label: "Poly chorus", short: "CHR", value: y.chorus, min: 0, max: 1, step: .01, fmt: pct, set: chorus => Y({ chorus }) },
    ];
    if (page === "FLT") return [
      { label: "Poly cutoff", short: "CUT", value: y.cutoff, min: 40, max: 16000, step: 10, fmt: hz, set: cutoff => Y({ cutoff }) },
      { label: "Poly resonance", short: "RES", value: y.res, min: 0, max: 8, step: .1, fmt: v => v.toFixed(1), set: res => Y({ res }) },
    ];
    return envKnobs(y.env, env => Y({ env }));
  };

  const body = (p: import("@/pixel/draw").Px, page: string) => {
    if (page === "VOX") {
      p.box(2, 11, 124, 34);
      const spread = 2 + Math.round(y.detune / 30 * 10), chorus = Math.round(y.chorus * 5), pulse = Math.round(y.pulse * 10), sub = Math.round(y.sub * 8);
      for (let i = 0; i < 3; i++) p.box(31 + i * spread - chorus, 27 - i * spread, 34 + (i === 1 ? pulse : 0), 13 + (i === 2 ? sub : 0));
      p.textC("SUB/PULSE  DETUNE/CHORUS", 64, 13);
    } else if (page === "FLT") {
      drawFilterCurve(p, "lowpass", y.cutoff, y.res, 2, 11, 124, 32);
    } else {
      drawEnvGraph(p, y.env);
    }
  };
  const extra = (page: string) => page === "FLT"
    ? <Zone x={2} y={11} w={124} h={32} horizontal label="Poly filter cutoff" value={y.cutoff} min={40} max={16000} step={10} onChange={cutoff => Y({ cutoff })} />
    : page === "ENV" ? <EnvZones env={y.env} set={env => Y({ env })} /> : null;

  return <Panel name={slot.name || "POLY"} pages={PAGES} label="Ensemble poly" knobs={knobs} body={body} extra={extra} deps={[slot.name, y]} />;
}
export default memo(EnsemblePanel);
