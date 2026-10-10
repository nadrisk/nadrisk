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
      // Voice-stack icon: three offset squares, then sub/pulse bars.
      p.box(14, 11, 114, 34);
      for (let i = 0; i < 3; i++) p.box(18 + i * 3, 14 - i * 2 + 4, 12, 9);
      const bars: [string, number][] = [["SUB", y.sub], ["PLS", y.pulse], ["CHR", y.chorus], ["DET", y.detune / 30]];
      bars.forEach(([lb, v], i) => { const x = 42 + i * 22, bh = Math.round(v * 24); p.rect(x, 41 - bh, 10, bh); p.textC(lb, x + 5, 14); });
    } else {
      drawEnvGraph(p, y.env);
    }
  };

  const extra = (page: string) => page === "VOX"
    ? <Zone x={14} y={10} w={114} h={35} horizontal label="Poly cutoff" value={y.cutoff} min={40} max={16000} step={10} onChange={cutoff => Y({ cutoff })} />
    : null;

  return <Panel name={slot.name || "POLY"} pages={PAGES} label="Ensemble poly" knobs={knobs} body={body} extra={extra} deps={[slot.name, y]} />;
}
export default memo(EnsemblePanel);
