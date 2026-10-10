import { memo } from "react";
import { Zone } from "@/pixel/PixelScreen";
import { Panel, hz, ms, pct, st, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";

const PAGES = ["PTCH", "AMP", "WGT"] as const;

// SUB808: the 808 editor as a 128x64 1-bit hardware screen.
function Sub808Panel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const b = slot.bass;
  const B = (p: Partial<typeof b>) => onChange({ bass: { ...b, ...p } });

  const knobs = (page: string): Knob[] => {
    if (page === "PTCH") return [
      { label: "Pitch env", short: "PENV", value: b.pitchEnv, min: 0, max: 48, step: 1, fmt: st, set: pitchEnv => B({ pitchEnv }) },
      { label: "Env decay", short: "PDEC", value: b.pitchDecay, min: .005, max: .4, step: .005, fmt: ms, set: pitchDecay => B({ pitchDecay }) },
      { label: "Note", short: "NOTE", value: slot.note, min: 20, max: 60, step: 1, fmt: v => `${Math.round(v)}`, set: note => onChange({ note }) },
      { label: "Click", short: "CLK", value: b.click, min: 0, max: 1, step: .01, fmt: pct, set: click => B({ click }) },
    ];
    if (page === "AMP") return [
      { label: "Release", short: "REL", value: b.decay, min: .05, max: 4, step: .01, fmt: ms, set: decay => B({ decay }) },
      { label: "Click", short: "CLK", value: b.click, min: 0, max: 1, step: .01, fmt: pct, set: click => B({ click }) },
      { label: "Volume", short: "LEV", value: slot.level, min: 0, max: 100, step: 1, fmt: v => `${v}%`, set: level => onChange({ level }) },
      { label: "Pan", short: "PAN", value: slot.pan, min: -1, max: 1, step: .01, fmt: v => (v === 0 ? "C" : v < 0 ? `L${Math.round(-v * 100)}` : `R${Math.round(v * 100)}`), set: pan => onChange({ pan }) },
    ];
    return [
      { label: "Tube drive", short: "TUBE", value: b.tube, min: 0, max: 1, step: .01, fmt: pct, set: tube => B({ tube }) },
      { label: "Harmonics", short: "HARM", value: b.harmonics, min: 0, max: 1, step: .01, fmt: pct, set: harmonics => B({ harmonics }) },
      { label: "Tone", short: "TONE", value: b.tone, min: 200, max: 16000, step: 10, fmt: hz, set: tone => B({ tone }) },
      { label: "Volume", short: "LEV", value: slot.level, min: 0, max: 100, step: 1, fmt: v => `${v}%`, set: level => onChange({ level }) },
    ];
  };

  const body = (p: import("@/pixel/draw").Px, page: string) => {
    p.box(2, 11, 124, 34);
    if (page === "PTCH") {
      const dec = Math.max(2, Math.round(b.pitchDecay / .4 * 100)), drop = Math.round(b.pitchEnv / 48 * 24);
      p.line(4, 14, 4 + dec, 14 + drop); p.line(4 + dec, 14 + drop, 124, 14 + drop);
      p.rect(3, 13, 3, 3); p.rect(3 + dec, 13 + drop, 3, 3);
      p.text(`+${Math.round(b.pitchEnv)}ST`, 100, 36);
    } else if (page === "AMP") {
      // Release tail graph.
      const rel = Math.max(2, Math.round(b.decay / 4 * 110));
      p.line(4, 14, 4, 14); p.line(4, 14, 4 + rel, 41); p.line(4 + rel, 41, 124, 41);
      const clk = Math.round(b.click * 4);
      for (let i = 0; i < clk; i++) p.dot(6 + i * 2, 16);
      p.text(ms(b.decay), 100, 36);
    } else {
      // Weight: drive/harmonics/tone bars.
      const bars: [string, number][] = [["TUB", b.tube], ["HRM", b.harmonics], ["TON", b.tone / 16000]];
      bars.forEach(([lb, v], i) => { const x = 26 + i * 34, bh = Math.round(v * 26); p.rect(x, 41 - bh, 14, bh); p.textC(lb, x + 7, 14); });
    }
  };

  const extra = (page: string) => {
    if (page === "PTCH") return <Zone x={14} y={10} w={114} h={35} horizontal label="Pitch env decay" value={b.pitchDecay} min={.005} max={.4} step={.005} onChange={pitchDecay => B({ pitchDecay })} />;
    if (page === "AMP") return <Zone x={14} y={10} w={114} h={35} horizontal label="Release" value={b.decay} min={.05} max={4} step={.01} onChange={decay => B({ decay })} />;
    return null;
  };

  return <Panel name={slot.name || "808"} pages={PAGES} label="Sub808 bass" knobs={knobs} body={body} extra={extra} deps={[slot.name, slot.note, slot.level, slot.pan, b]} />;
}
export default memo(Sub808Panel);
