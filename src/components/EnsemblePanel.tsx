import { useNoteKnob } from "@/components/harmonyKnob";
import { memo, useState } from "react";
import { Tap, Zone } from "@/pixel/PixelScreen";
import { Panel, drawEnvGraph, drawFilterCurve, EnvZones, envKnobs, hz, pct, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";

const PAGES = ["VOX", "FLT", "ENV"] as const;

// ENSEMBLE: the poly editor as a 128x64 1-bit hardware screen.
function EnsemblePanel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const y = slot.poly;
  const Y = (p: Partial<typeof y>) => onChange({ poly: { ...y, ...p } });
  const [envSel, setEnvSel] = useState<"vol" | "flt">("vol");
  const fenv = y.fenv ?? { a: .01, d: .4, s: .3, r: .5 };
  const curEnv = envSel === "vol" ? y.env : fenv, setEnv = (e: typeof fenv) => envSel === "vol" ? Y({ env: e }) : Y({ fenv: e });

  const noteK = useNoteKnob(slot, onChange);
  const knobs = (page: string): Knob[] => {
    if (page === "VOX") return [
      { label: "Poly sub", short: "SUB", value: y.sub, min: 0, max: 1, step: .01, fmt: pct, set: sub => Y({ sub }) },
      { label: "Poly pulse", short: "PLS", value: y.pulse, min: 0, max: 1, step: .01, fmt: pct, set: pulse => Y({ pulse }) },
      { label: "Poly detune", short: "DET", value: y.detune, min: 0, max: 30, step: .1, fmt: v => `${v.toFixed(0)}CT`, set: detune => Y({ detune }) },
      { label: "Poly chorus", short: "CHR", value: y.chorus, min: 0, max: 1, step: .01, fmt: pct, set: chorus => Y({ chorus }) },
    ];
    if (page === "FLT") return [
      { label: "Poly cutoff", short: "CUT", value: y.cutoff, min: 40, max: 16000, step: 1, log: true, fmt: hz, set: cutoff => Y({ cutoff }) },
      { label: "Poly resonance", short: "RES", value: y.res, min: 0, max: 8, step: .1, fmt: v => v.toFixed(1), set: res => Y({ res }) },
      { label: "Poly filter env amount", short: "ENV", value: y.fenvAmt ?? 0, min: -4, max: 4, step: .1, fmt: v => `${v > 0 ? "+" : ""}${v.toFixed(1)}OC`, set: fenvAmt => Y({ fenvAmt }) },
      noteK,
    ];
    return envKnobs(curEnv, setEnv);
  };

  const body = (p: import("@/pixel/draw").Px, page: string) => {
    if (page === "VOX") {
      p.box(2, 11, 124, 34);
      // One visual meaning: the three voices separate only as detune increases.
      const spread = 1 + Math.round(y.detune / 30 * 5);
      for (let i = 0; i < 3; i++) p.box(5 + i * spread, 25 - i * spread, 24, 16);
      const bars: [string, number][] = [["SUB", y.sub], ["PLS", y.pulse], ["DET", y.detune / 30], ["CHR", y.chorus]];
      bars.forEach(([label, value], i) => {
        const x = 47 + i * 20, h = Math.round(Math.max(0, Math.min(1, value)) * 22);
        p.textC(label, x + 5, 12); p.box(x, 18, 10, 25, true); p.rect(x + 1, 42 - h, 8, h);
      });
    } else if (page === "FLT") {
      drawFilterCurve(p, "lowpass", y.cutoff, y.res, 2, 11, 124, 32);
      const amt = y.fenvAmt ?? 0; if (amt) { const xOf = (f: number) => 2 + Math.round(Math.log(Math.min(16000, Math.max(40, f)) / 40) / Math.log(400) * 123); const a = xOf(y.cutoff), b = xOf(y.cutoff * 2 ** amt); p.line(Math.min(a, b), 44, Math.max(a, b), 44); p.line(b, 42, b, 44); }
    } else {
      drawEnvGraph(p, curEnv);
      ["VOL", "FLT"].forEach((t, k) => { const on = (k ? "flt" : "vol") === envSel, x = 92 + k * 17; if (on) { p.rect(x, 11, 16, 8); p.text(t, x + 2, 12, false); } else { p.box(x, 11, 16, 8); p.text(t, x + 2, 12); } });
    }
  };
  const extra = (page: string) => page === "VOX" ? <>
    <Zone x={44} y={11} w={16} h={34} label="Poly sub fader" value={y.sub} min={0} max={1} step={.01} onChange={sub => Y({ sub })} />
    <Zone x={64} y={11} w={16} h={34} label="Poly pulse fader" value={y.pulse} min={0} max={1} step={.01} onChange={pulse => Y({ pulse })} />
    <Zone x={84} y={11} w={16} h={34} label="Poly detune fader" value={y.detune} min={0} max={30} step={.1} onChange={detune => Y({ detune })} />
    <Zone x={104} y={11} w={16} h={34} label="Poly chorus fader" value={y.chorus} min={0} max={1} step={.01} onChange={chorus => Y({ chorus })} />
  </> : page === "FLT"
    ? <Zone x={2} y={11} w={124} h={32} horizontal label="Poly filter cutoff" value={y.cutoff} min={40} max={16000} step={1} log onChange={cutoff => Y({ cutoff })} />
    : page === "ENV" ? <>
      <EnvZones env={curEnv} set={setEnv} />
      <Tap x={92} y={11} w={16} h={8} label="Poly volume envelope" pressed={envSel === "vol"} onClick={() => setEnvSel("vol")} />
      <Tap x={109} y={11} w={16} h={8} label="Poly filter envelope" pressed={envSel === "flt"} onClick={() => setEnvSel("flt")} />
    </> : null;

  return <Panel name={slot.name || "POLY"} pages={PAGES} label="Ensemble poly" knobs={knobs} body={body} extra={extra} deps={[slot.name, y, envSel]} />;
}
export default memo(EnsemblePanel);
