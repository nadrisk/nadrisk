import { memo } from "react";
import { Tap, Zone } from "@/pixel/PixelScreen";
import { Panel, drawEnvGraph, drawFilterCurve, EnvZones, envKnobs, hz, ms, pct, st, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";
import { drumDefaults, type DrumKind } from "@/audio/voices";

const PAGES = ["SRC", "SHP", "PIT", "FLT", "ENV"] as const;
const KINDS: DrumKind[] = ["kick", "snare", "hat", "clap"];
const KLAB: Record<DrumKind, string> = { kick: "KICK", snare: "SNR", hat: "HAT", clap: "CLAP" };
const f2 = (v: number) => v.toFixed(2);

// DRUMKIT: four drum machines (kick / snare / hat / clap) on a 128x64 1-bit hardware screen.
function DrumkitPanel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const d0 = slot.drum, d = { ...drumDefaults(d0.kind), ...Object.fromEntries(Object.entries(d0).filter(([, v]) => v !== undefined)) } as typeof d0 & ReturnType<typeof drumDefaults>;
  const D = (p: Partial<typeof d0>) => onChange({ drum: { ...d0, ...p } });
  const K = (label: string, short: string, key: keyof typeof d, min: number, max: number, step: number, fmt: (v: number) => string): Knob =>
    ({ label, short, value: d[key] as number, min, max, step, fmt, set: v => D({ [key]: v } as Partial<typeof d0>) });
  const TUNE = K("Tune", "TUNE", "pitch", 20, 1200, 1, hz), SWP = K("Sweep", "SWP", "pitchEnv", -48, 48, 1, st), CTR = K("Contour", "CNTR", "pitchDecay", .003, .5, .001, ms), DRV = K("Drive", "DRV", "drive", 0, 1, .01, pct);

  const knobs = (page: string): Knob[] => {
    if (page === "SRC") {
      if (d.kind === "snare") return [TUNE, SWP, K("Body tone 2", "TON2", "tone2", .5, 3, .01, f2), DRV];
      if (d.kind === "hat") return [TUNE, SWP, K("Spread", "SPRD", "spread", 0, 2, .01, f2), DRV];
      if (d.kind === "clap") return [K("Clap tone", "TONE", "noiseTone", 300, 6000, 10, hz), K("Bursts", "BRST", "bursts", 1, 6, 1, v => String(Math.round(v))), K("Burst gap", "GAP", "burstGap", .002, .03, .001, ms), DRV];
      return [TUNE, SWP, CTR, DRV];
    }
    if (page === "SHP") {
      if (d.kind === "snare") return [K("FM amount", "FM", "fm", 0, 10, .1, v => v.toFixed(1)), K("Noise", "NOIZ", "noise", 0, 1, .01, pct), K("Noise decay", "NDEC", "noiseDecay", .01, 1, .005, ms), K("Noise tone", "NTON", "noiseTone", 200, 12000, 10, hz)];
      if (d.kind === "hat") return [K("Color", "COLR", "noise", 0, 1, .01, pct), K("FM amount", "FM", "fm", 0, 10, .1, v => v.toFixed(1)), K("Ring", "RING", "ring", 0, 1, .01, pct), K("Transient", "TRNS", "transient", 0, 1, .01, pct)];
      if (d.kind === "clap") return [K("Tail", "TAIL", "tail", 0, 1, .01, pct), K("Clap Q", "Q", "tone2", .3, 12, .1, v => v.toFixed(1)), SWP, CTR];
      return [K("FM amount", "FM", "fm", 0, 10, .1, v => v.toFixed(1)), K("FM decay", "FDEC", "fmDecay", .005, 1, .005, ms), K("Transient", "TRNS", "transient", 0, 1, .01, pct), K("Noise", "NOIZ", "noise", 0, 1, .01, pct)];
    }
    if (page === "PIT") return [{ ...SWP, label: "Pitch env amount", short: "AMT" }, K("Pitch env attack", "ATK", "pAtk", 0, .1, .001, ms), { ...CTR, label: "Pitch env decay", short: "DEC" }, K("Pitch env curve", "CRV", "pCurve", 0, 1, .01, pct)];
    if (page === "FLT") return [K("Filter base", "BASE", "fltBase", 20, 8000, 10, hz), K("Filter width", "WDTH", "fltWidth", 0, 10, .1, v => v.toFixed(1)), K("Cutoff", "CUT", "cutoff", 40, 16000, 10, hz), K("Resonance", "RES", "res", .1, 20, .1, v => v.toFixed(1))];
    return envKnobs(d.env, env => D({ env }));
  };

  // Pitch-envelope curve drawn exactly like the engine: attack rise, then curved fall to the end pitch.
  const drawPitch = (p: import("@/pixel/draw").Px, x0: number, y0: number, w: number, h: number) => {
    p.box(x0, y0, w, h); const mid = y0 + Math.floor(h / 2); for (let x = x0 + 2; x < x0 + w - 2; x += 3) p.rect(x, mid, 1, 1);
    const sy = (s: number) => Math.round(mid - Math.max(-1, Math.min(1, s / 48)) * (h / 2 - 2));
    const span = .5, ax = (d.pAtk / span) * (w - 4), dx = Math.max(2, (d.pitchDecay / span) * (w - 4)), k = 1 + d.pCurve * 9;
    let px = x0 + 2, py = sy(d.pEnd);
    const pt = (x: number, y: number) => { p.line(Math.round(px), py, Math.round(x), y); px = x; py = y; };
    if (ax > 0) pt(x0 + 2 + ax, sy(d.pitchEnv)); else py = sy(d.pitchEnv);
    for (let i = 1; i <= 24; i++) { const u = i / 24, sh = 1 - (1 - u) ** k; pt(x0 + 2 + ax + u * dx, sy(d.pitchEnv + (d.pEnd - d.pitchEnv) * sh)); }
    pt(x0 + w - 3, sy(d.pEnd));
  };

  const body = (p: import("@/pixel/draw").Px, page: string) => {
    if (page === "SRC" || page === "SHP") {
      KINDS.forEach((k, i) => { const x = 2 + i * 31; p.box(x, 11, 29, 7); if (k === d.kind) p.invert(x + 1, 12, 27, 5); p.textC(KLAB[k], x + 15, 12, k !== d.kind); });
      if (d.kind === "hat") {
        // Six metallic partials on a log frequency axis; spread and tune move them.
        p.box(2, 20, 124, 25);
        [1, 1.304, 1.466, 1.787, 1.932, 2.536].forEach(r => { const f = d.pitch * r ** d.spread, x = 4 + Math.round(Math.max(0, Math.min(1, Math.log2(f / 20) / 10)) * 118); p.rect(x, 24 + Math.round(d.noise * 8), 2, 19 - Math.round(d.noise * 8)); });
        for (let x = 4; x < 124; x += 2) if (Math.random() < d.noise * .5) p.rect(x, 42, 1, 1);
      } else if (d.kind === "clap") {
        // Burst spikes then the tail.
        p.box(2, 20, 124, 25);
        const nb = Math.round(d.bursts), gx = Math.max(2, Math.round(d.burstGap / .03 * 22));
        for (let i = 0; i < nb; i++) { const x = 6 + i * gx; p.rect(x, 24, 2, 19); }
        const tx = 6 + (nb - 1) * gx + 3, th = Math.round(d.tail * 17), tw = Math.max(6, Math.round(d.env.d / 1 * 80));
        for (let i = 0; i < tw && tx + i < 124; i++) { const hh = Math.round(th * (1 - i / tw) ** 2); p.rect(tx + i, 43 - hh, 1, hh); }
      } else drawPitch(p, 2, 20, 124, 25);
    } else if (page === "PIT") {
      drawPitch(p, 2, 11, 124, 34);
      p.text(`END ${st(d.pEnd)}`, 82, 13);
    } else if (page === "FLT") {
      drawFilterCurve(p, d.filter, d.cutoff, d.res);
      p.text(`${hz(d.fltBase)}-${hz(Math.min(20000, d.fltBase * 2 ** d.fltWidth))}`, 4, 13);
    } else drawEnvGraph(p, d.env);
  };

  const extra = (page: string) => {
    if (page === "SRC" || page === "SHP") return <>
      {KINDS.map((k, i) => <Tap key={k} x={2 + i * 31} y={10} w={29} h={9} label={`Drum type ${k}`} pressed={k === d.kind} onClick={() => D({ kind: k })} />)}
      {d.kind === "clap"
        ? <Zone x={2} y={20} w={124} h={25} horizontal label="Clap decay" value={d.env.d} min={.02} max={1} step={.005} onChange={v => D({ env: { ...d.env, d: v } })} />
        : <Zone x={2} y={20} w={124} h={25} label="Sweep" value={d.pitchEnv} min={-48} max={48} step={1} onChange={pitchEnv => D({ pitchEnv })} />}
    </>;
    if (page === "PIT") return <>
      <Zone x={2} y={10} w={92} h={35} horizontal label="Pitch env decay drag" value={d.pitchDecay} min={.003} max={.5} step={.001} onChange={pitchDecay => D({ pitchDecay })} />
      <Zone x={94} y={10} w={32} h={35} label="Pitch env end" value={d.pEnd} min={-24} max={24} step={1} onChange={pEnd => D({ pEnd })} />
    </>;
    if (page === "FLT") return <Zone x={2} y={10} w={124} h={35} horizontal label="Cutoff drag" value={d.cutoff} min={40} max={16000} step={10} onChange={cutoff => D({ cutoff })} />;
    if (page === "ENV") return <EnvZones env={d.env} set={env => D({ env })} />;
    return null;
  };

  return <Panel name={slot.name || "DRM"} pages={PAGES} label="Drumkit drum" knobs={knobs} body={body} extra={extra} deps={[slot.name, d0]} />;
}
export default memo(DrumkitPanel);
