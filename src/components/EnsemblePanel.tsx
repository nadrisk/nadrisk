import { memo } from "react";
import { Zone } from "@/pixel/PixelScreen";
import { Panel, drawEnvGraph, envKnobs, hz, pct, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";

const PAGES = ["VOX", "ENV"] as const;

// ENSEMBLE: the poly editor as a 128x64 1-bit hardware screen.
function EnsemblePanel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const y = slot.poly;
  const Y = (p: Partial<typeof y>) => onChange({ poly: { ...y, ...p } });

  const knobs = (page: string): Knob[] => {
    if (page === "VOX") return [
      { label: "Poly cutoff", short: "CUT", value: y.cutoff, min: 40, max: 16000, step: 10, fmt: hz, set: cutoff => Y({ cutoff }) },
      { label: "Poly res", short: "RES", value: y.res, min: 0, max: 8, step: .1, fmt: v => v.toFixed(1), set: res => Y({ res }) },
      { label: "Poly detune", short: "DET", value: y.detune, min: 0, max: 30, step: .1, fmt: v => `${v.toFixed(0)}CT`, set: detune => Y({ detune }) },
      { label: "Poly chorus", short: "CHR", value: y.chorus, min: 0, max: 1, step: .01, fmt: pct, set: chorus => Y({ chorus }) },
    ];
    return envKnobs(y.env, env => Y({ env }));
  };

  const body = (p: import("@/pixel/draw").Px, page: string) => {
    if (page === "VOX") {
      // Voice-stack icon: the three squares spread apart as detune rises.
      p.box(2, 11, 124, 34);
      const spread = 1 + Math.round(y.detune / 30 * 6);
      for (let i = 0; i < 3; i++) p.box(5 + i * spread, 24 - i * spread, 22, 16);
      bars.forEach(([lb, v], i) => { const x = 46 + i * 20, bh = Math.round(Math.max(0, Math.min(1, v)) * 24); p.box(x, 17, 10, 25, true); p.rect(x, 42 - bh, 10, bh); p.textC(lb, x + 5, 12); });
    } else {
      drawEnvGraph(p, y.env);
    }
  };
  const bars: [string, number][] = [["SUB", y.sub], ["PLS", y.pulse], ["CHR", y.chorus], ["DET", y.detune / 30]];

  const extra = (page: string) => page === "VOX" ? <>
    <Zone x={44} y={11} w={14} h={33} label="Poly sub" value={y.sub} min={0} max={1} step={.01} onChange={sub => Y({ sub })} />
    <Zone x={64} y={11} w={14} h={33} label="Poly pulse" value={y.pulse} min={0} max={1} step={.01} onChange={pulse => Y({ pulse })} />
    <Zone x={84} y={11} w={14} h={33} label="Poly chorus bar" value={y.chorus} min={0} max={1} step={.01} onChange={chorus => Y({ chorus })} />
    <Zone x={104} y={11} w={14} h={33} label="Poly detune bar" value={y.detune} min={0} max={30} step={.1} onChange={detune => Y({ detune })} />
  </> : null;

  return <Panel name={slot.name || "POLY"} pages={PAGES} label="Ensemble poly" knobs={knobs} body={body} extra={extra} deps={[slot.name, y]} />;
}
export default memo(EnsemblePanel);
