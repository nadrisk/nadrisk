import { memo } from "react";
import { Zone } from "@/pixel/PixelScreen";
import { Panel, drawWaveIcon, hz, ms, st, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";
import { defaultSiren, type Wave } from "@/audio/voices";

const PAGES = ["OSC", "LFO", "SWP"] as const;
const WAVES: Wave[] = ["sine", "triangle", "sawtooth", "square"];

// SIREN: the dub siren editor as a 128x64 1-bit hardware screen.
function SirenPanel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const z = { ...defaultSiren(), ...slot.siren };
  const Z = (p: Partial<typeof z>) => onChange({ siren: { ...z, ...p } });

  const knobs = (page: string): Knob[] => {
    if (page === "OSC") return [
      { label: "Tone", short: "TONE", value: z.tone, min: 300, max: 12000, step: 10, fmt: hz, set: tone => Z({ tone }) },
      { label: "Note", short: "NOTE", value: slot.note, min: 36, max: 96, step: 1, fmt: v => `${Math.round(v)}`, set: note => onChange({ note }) },
      { label: "Siren release", short: "REL", value: z.release, min: .02, max: 3, step: .01, fmt: ms, set: release => Z({ release }) },
      { label: "Volume", short: "LEV", value: slot.level, min: 0, max: 100, step: 1, fmt: v => `${v}%`, set: level => onChange({ level }) },
    ];
    if (page === "LFO") return [
      { label: "LFO rate", short: "RATE", value: z.rate, min: .1, max: 20, step: .1, fmt: v => `${v.toFixed(1)}HZ`, set: rate => Z({ rate }) },
      { label: "LFO depth", short: "DPTH", value: z.depth, min: 0, max: 24, step: .5, fmt: st, set: depth => Z({ depth }) },
      { label: "Tone", short: "TONE", value: z.tone, min: 300, max: 12000, step: 10, fmt: hz, set: tone => Z({ tone }) },
      { label: "Siren release", short: "REL", value: z.release, min: .02, max: 3, step: .01, fmt: ms, set: release => Z({ release }) },
    ];
    return [
      { label: "Sweep", short: "SWP", value: z.sweep, min: -24, max: 24, step: 1, fmt: st, set: sweep => Z({ sweep }) },
      { label: "Sweep time", short: "TIME", value: z.sweepTime, min: .05, max: 6, step: .05, fmt: v => `${v.toFixed(1)}S`, set: sweepTime => Z({ sweepTime }) },
      { label: "Siren release", short: "REL", value: z.release, min: .02, max: 3, step: .01, fmt: ms, set: release => Z({ release }) },
      { label: "Volume", short: "LEV", value: slot.level, min: 0, max: 100, step: 1, fmt: v => `${v}%`, set: level => onChange({ level }) },
    ];
  };

  const body = (p: import("@/pixel/draw").Px, page: string) => {
    if (page === "OSC") {
      drawWaveIcon(p, z.wave, 14, 12, 24, 14);
      p.text(z.wave.slice(0, 5).toUpperCase(), 42, 14);
      p.box(2, 28, 124, 17);
      for (let i = 0; i < 112; i++) { const t = i / 112; let dy = 0;
        if (z.wave === "sine") dy = Math.sin(t * Math.PI * 6);
        else if (z.wave === "triangle") dy = Math.abs((t * 3 % 1) * 4 - 2) - 1;
        else if (z.wave === "sawtooth") dy = (t * 3 % 1) * 2 - 1;
        else dy = (t * 3 % 1) < .5 ? -1 : 1;
        p.dot(15 + i, 36 - Math.round(dy * 6)); }
    } else if (page === "LFO") {
      drawWaveIcon(p, z.lfoWave, 14, 12, 24, 14);
      p.text(`${z.rate.toFixed(1)}HZ`, 42, 14);
      p.box(2, 28, 124, 17);
      const amp = Math.max(1, Math.round(z.depth / 24 * 6));
      for (let i = 0; i < 112; i++) { const t = i / 112; p.dot(15 + i, 36 - Math.round(Math.sin(t * Math.PI * 2 * Math.min(4, z.rate / 2)) * amp)); }
    } else {
      // Sweep arrow graph: pitch rises or falls over sweep time.
      p.box(2, 11, 124, 34);
      const up = z.sweep >= 0, len = Math.max(4, Math.round(z.sweepTime / 6 * 100)), mag = Math.round(Math.abs(z.sweep) / 24 * 24);
      const y0 = up ? 41 : 17, y1 = up ? 41 - mag : 17 + mag;
      p.line(17, y0, 17 + len, y1); p.line(17 + len, y1, 124, y1);
      p.rect(16, y0 - 1, 3, 3); p.rect(16 + len, y1 - 1, 3, 3);
      p.text(`${z.sweep > 0 ? "+" : ""}${Math.round(z.sweep)}ST`, 100, 36);
    }
  };

  const extra = (page: string) => {
    if (page === "OSC") return <Zone x={14} y={11} w={24} h={15} label="Siren wave" value={WAVES.indexOf(z.wave)} min={0} max={3} step={1} onChange={v => Z({ wave: WAVES[Math.round(v)] })} />;
    if (page === "LFO") return <Zone x={14} y={11} w={24} h={15} label="Siren LFO wave" value={WAVES.indexOf(z.lfoWave)} min={0} max={3} step={1} onChange={v => Z({ lfoWave: WAVES[Math.round(v)] })} />;
    if (page === "SWP") return <Zone x={14} y={10} w={114} h={35} horizontal label="Sweep time" value={z.sweepTime} min={.05} max={6} step={.05} onChange={sweepTime => Z({ sweepTime })} />;
    return null;
  };

  return <Panel name={slot.name || "SIRN"} pages={PAGES} label="Siren" knobs={knobs} body={body} extra={extra} deps={[slot.name, slot.note, slot.level, z]} />;
}
export default memo(SirenPanel);
