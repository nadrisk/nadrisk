import { useNoteKnob } from "@/components/harmonyKnob";
import { memo, useRef, useState } from "react";
import type { GetWave } from "./ScopeScreen";
import { drawReeseWaves, reeseVisualLevel } from "@/pixel/reeseWaves";
import { Tap, Zone } from "@/pixel/PixelScreen";
import { Panel, drawEnvGraph, drawFilterCurve, EnvZones, envKnobs, hz, pct, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";
import { defaultReese, reeseParams, type ReeseParams } from "@/audio/reese";
import { ms } from "./pixelScreens";

const RPAGES = ["RSE", "PIT", "FLT", "ENV"] as const;

const PAGES = ["VOX", "PIT", "FLT", "ENV"] as const;

// ENSEMBLE: the poly editor as a 128x64 1-bit hardware screen.
function EnsemblePanel({ slot, index = 0, getWave, onChange }: { slot: Slot; index?: number; getWave?: GetWave; onChange: (p: Partial<Slot>) => void }) {
  const visual = useRef({ index, buffer: new Float32Array(512), level: 0, bucket: 0 });
  if (visual.current.index !== index) { visual.current.index=index; visual.current.level=0; visual.current.bucket=0; }
  const reactToSound = () => {
    const v=visual.current;
    if (!getWave?.(index,v.buffer)) v.buffer.fill(0);
    v.level=reeseVisualLevel(v.buffer,v.level);
    if (v.level<.015) v.level=0;
    const bucket=Math.round(v.level*12), changed=bucket!==v.bucket;
    v.bucket=bucket; return changed;
  };
  const y = slot.poly;
  const Y = (p: Partial<typeof y>) => onChange({ poly: { ...y, ...p } });
  const [envSel, setEnvSel] = useState<"vol" | "flt">("vol");
  const fenv = y.fenv ?? { a: .01, d: .4, s: .3, r: .5 };
  const curEnv = envSel === "vol" ? y.env : fenv, setEnv = (e: typeof fenv) => envSel === "vol" ? Y({ env: e }) : Y({ fenv: e });

  const noteK = useNoteKnob(slot, onChange);
  const reese = y.mode === "reese", r = reeseParams(y.reese), home = defaultReese();
  const R = (q: Partial<ReeseParams>) => onChange({ poly: { ...y, reese: { ...r, ...q } } });
  const modeKey = <Tap x={96} y={11} w={30} h={10} label="Poly mode" pressed={reese} onClick={() => {
    const mode = reese ? "poly" : "reese";
    onChange({ poly: { ...y, mode, ...(mode === "reese" && !y.reese ? { reese: defaultReese() } : {}) } });
  }} />;
  const drawMode = (p: import("@/pixel/draw").Px) => { if (reese) { p.rect(96, 11, 30, 10); p.textC("REESE", 111, 14, false); } else { p.box(96, 11, 30, 10); p.textC("POLY", 111, 14); } };
  const pitBody = (p: import("@/pixel/draw").Px) => {
    p.box(2, 11, 124, 34); p.textC(noteK.fmt(slot.note), 48, 17);
    const pc = ((slot.note % 12) + 12) % 12; for (let i = 0; i < 12; i++) { const x = 9 + i * 9; p.box(x, 29, 7, 11); if (i === pc) p.rect(x + 1, 30, 5, 9); }
    drawMode(p);
  };
  if (reese) {
    const fenvR = r.fenv, curR = envSel === "vol" ? r.env : fenvR, setR = (e: typeof fenvR) => envSel === "vol" ? R({ env: e }) : R({ fenv: e });
    const rk = (page: string): Knob[] => {
      if (page === "RSE") return [
        { label: "Reese detune", short: "DET", value: r.detune, min: 0, max: 50, step: .1, fmt: v => `${v.toFixed(0)}CT`, reset: home.detune, set: detune => R({ detune }) },
        { label: "Reese drift", short: "DRFT", value: r.drift, min: 0, max: 1, step: .01, fmt: pct, reset: home.drift, set: drift => R({ drift }) },
        { label: "Reese width", short: "WID", value: r.width, min: 0, max: 1, step: .01, fmt: pct, reset: home.width, set: width => R({ width }) },
        { label: "Reese sub", short: "SUB", value: r.sub, min: 0, max: 1, step: .01, fmt: pct, reset: home.sub, set: sub => R({ sub }) },
      ];
      if (page === "PIT") return [noteK, { label: "Reese glide", short: "GLD", value: r.glide, min: 0, max: .5, step: .001, fmt: ms, reset: home.glide, set: glide => R({ glide }) }];
      if (page === "FLT") return [
        { label: "Reese cutoff", short: "CUT", value: r.cutoff, min: 40, max: 16000, step: 1, log: true, fmt: hz, reset: home.cutoff, set: cutoff => R({ cutoff }) },
        { label: "Reese resonance", short: "RES", value: r.res, min: 0, max: 8, step: .1, fmt: v => v.toFixed(1), reset: home.res, set: res => R({ res }) },
        { label: "Reese filter env amount", short: "ENV", value: r.fenvAmt, min: -4, max: 4, step: .1, fmt: v => `${v > 0 ? "+" : ""}${v.toFixed(1)}OC`, reset: 0, set: fenvAmt => R({ fenvAmt }) },
      ];
      return envKnobs(curR, setR, envSel === "vol" ? home.env : home.fenv).map(k => ({ ...k, label: `Reese ${envSel} ${k.label}` }));
    };
    const rb = (p: import("@/pixel/draw").Px, page: string) => {
      if (page === "RSE") {
        p.box(2, 11, 124, 34);
        drawReeseWaves(p,r,visual.current.bucket/12,window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      } else if (page === "PIT") pitBody(p);
      else if (page === "FLT") drawFilterCurve(p, "lowpass", r.cutoff, r.res, 2, 11, 124, 32);
      else { drawEnvGraph(p, curR); ["VOL", "FLT"].forEach((t, k) => { const on = (k ? "flt" : "vol") === envSel, x = 92 + k * 17; if (on) { p.rect(x, 11, 16, 8); p.text(t, x + 2, 12, false); } else { p.box(x, 11, 16, 8); p.text(t, x + 2, 12); } }); }
    };
    const rx = (page: string) => page === "PIT" ? modeKey : page === "FLT"
      ? <Zone x={2} y={11} w={124} h={32} horizontal label="Reese filter cutoff" value={r.cutoff} min={40} max={16000} step={1} log onChange={cutoff => R({ cutoff })} />
      : page === "ENV" ? <><EnvZones env={curR} set={setR} />
        <Tap x={92} y={11} w={16} h={8} label="Poly volume envelope" pressed={envSel === "vol"} onClick={() => setEnvSel("vol")} />
        <Tap x={109} y={11} w={16} h={8} label="Poly filter envelope" pressed={envSel === "flt"} onClick={() => setEnvSel("flt")} /></> : null;
    return <Panel key="reese" name={slot.name || "REESE"} pages={RPAGES} label="Ensemble poly" knobs={rk} body={rb} extra={rx} live={page => page === "RSE" && getWave ? reactToSound : undefined} deps={[index, slot.name, y, envSel]} />;
  }
  const knobs = (page: string): Knob[] => {
    if (page === "VOX") return [
      { label: "Poly sub", short: "SUB", value: y.sub, min: 0, max: 1, step: .01, fmt: pct, set: sub => Y({ sub }) },
      { label: "Poly pulse", short: "PLS", value: y.pulse, min: 0, max: 1, step: .01, fmt: pct, set: pulse => Y({ pulse }) },
      { label: "Poly detune", short: "DET", value: y.detune, min: 0, max: 30, step: .1, fmt: v => `${v.toFixed(0)}CT`, set: detune => Y({ detune }) },
      { label: "Poly chorus", short: "CHR", value: y.chorus, min: 0, max: 1, step: .01, fmt: pct, set: chorus => Y({ chorus }) },
    ];
    if (page === "PIT") return [noteK];
    if (page === "FLT") return [
      { label: "Poly cutoff", short: "CUT", value: y.cutoff, min: 40, max: 16000, step: 1, log: true, fmt: hz, set: cutoff => Y({ cutoff }) },
      { label: "Poly resonance", short: "RES", value: y.res, min: 0, max: 8, step: .1, fmt: v => v.toFixed(1), set: res => Y({ res }) },
      { label: "Poly filter env amount", short: "ENV", value: y.fenvAmt ?? 0, min: -4, max: 4, step: .1, fmt: v => `${v > 0 ? "+" : ""}${v.toFixed(1)}OC`, set: fenvAmt => Y({ fenvAmt }) },
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
    } else if (page === "PIT") pitBody(p); else if (page === "FLT") {
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
  </> : page === "PIT" ? modeKey : page === "FLT"
    ? <Zone x={2} y={11} w={124} h={32} horizontal label="Poly filter cutoff" value={y.cutoff} min={40} max={16000} step={1} log onChange={cutoff => Y({ cutoff })} />
    : page === "ENV" ? <>
      <EnvZones env={curEnv} set={setEnv} />
      <Tap x={92} y={11} w={16} h={8} label="Poly volume envelope" pressed={envSel === "vol"} onClick={() => setEnvSel("vol")} />
      <Tap x={109} y={11} w={16} h={8} label="Poly filter envelope" pressed={envSel === "flt"} onClick={() => setEnvSel("flt")} />
    </> : null;

  return <Panel key="poly" name={slot.name || "POLY"} pages={PAGES} label="Ensemble poly" knobs={knobs} body={body} extra={extra} deps={[slot.name, y, envSel]} />;
}
export default memo(EnsemblePanel);
