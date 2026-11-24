import { useNoteKnob } from "@/components/harmonyKnob";
import { memo } from "react";
import { Tap, Zone } from "@/pixel/PixelScreen";
import { Panel, drawEnvGraph, drawFilterCurve, EnvZones, envKnobs, hz, pct, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";
import { cleanOf, defaultClean, FILTER_MODELS, modelQ, type CleanParams } from "@/audio/clean";
import { terrainAt } from "@/audio/terrain";

const PAGES = ["TRN", "ORB", "FLT", "ENV"] as const;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const signed = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v * 100)}`;

/** SURF terrain as a dithered 1-bit map with the orbit drawn on top, using the exact math the sound uses. */
export function drawTerrain(p: import("@/pixel/draw").Px, c: CleanParams, x0: number, y0: number, w: number, h: number) {
  const tp = { freq: c.tfreq ?? .25, hold: c.hold ?? 0, snow: c.snow ?? 0, fold: c.fold ?? 0 };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const z = terrainAt(i / (w - 1) * 2 - 1, j / (h - 1) * 2 - 1, tp);
    if ((z + 1) * 8 > BAYER[(j & 3) * 4 + (i & 3)] + .5) p.dot(x0 + i, y0 + j); }
  const cx = c.cx ?? 0, cy = c.cy ?? 0, rad = c.rad ?? .6, ox = x0 + (cx + 1) / 2 * (w - 1), oy = y0 + (cy + 1) / 2 * (h - 1), rx = rad * (w - 1) / 2, ry = rad * (h - 1) / 2;
  for (let k = 0; k < 96; k++) { const a = k / 96 * Math.PI * 2, x = Math.round(ox + rx * Math.cos(a)), y = Math.round(oy + ry * Math.sin(a));
    if (x < x0 || x >= x0 + w || y < y0 || y >= y0 + h) continue; p.dot(x, y, k % 2 === 0); }
  p.rect(Math.round(ox) - 1, Math.round(oy) - 1, 3, 3, false); p.dot(Math.round(ox), Math.round(oy));
}

// TRN: wave-terrain synth (nad-terrain). TRN tunes the surface, ORB the orbit; FLT, ENV match SYN (no MOD page: pitch env, noise and glide are zeroed for TRN).
function TerrainPanel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const c = cleanOf(slot.synth), home = defaultClean();
  const C = (q: Partial<CleanParams>) => onChange({ synth: { ...slot.synth, clean: { ...c, ...q, osc: "terrain" } } });
  const noteK = useNoteKnob(slot, onChange);
  const K = (label: string, short: string, key: "tfreq" | "hold" | "snow" | "fold" | "rad" | "detune" | "sub" | "cutoff" | "res" | "envAmt" | "drive", min: number, max: number, step: number, fmt: (v: number) => string, log = false): Knob =>
    ({ label: `Terrain ${label}`, short, value: c[key] as number, min, max, step, fmt, log, reset: (home[key] as number) ?? ({ tfreq: .25, hold: 0, snow: 0, fold: 0, rad: .6 } as Record<string, number>)[key], set: v => C({ [key]: v }) });
  const knobs = (page: string): Knob[] => {
    if (page === "TRN") return [noteK, K("terrain frequency", "FREQ", "tfreq", 0, 1, .01, pct), K("terrain hold", "HOLD", "hold", -1, 1, .01, signed), K("terrain snow", "SNOW", "snow", 0, 1, .01, pct),
      K("terrain fold", "FOLD", "fold", 0, 1, .01, pct)];
    if (page === "ORB") return [K("orbit size", "SIZE", "rad", .05, 1, .01, pct), K("detune", "DETN", "detune", 0, 1, .01, pct), K("sub", "SUB", "sub", 0, 1, .01, pct)];
    if (page === "FLT") return [K("cutoff", "CUT", "cutoff", 40, 16000, 1, hz, true), K("resonance", "RES", "res", 0, 1, .01, pct), K("filter envelope", "ENV", "envAmt", 0, 1, .01, pct), K("drive", "DRV", "drive", 0, 1, .01, pct)];
    return envKnobs(c.env, env => C({ env }), home.env, 1).map(k => ({ ...k, label: `Terrain ${k.label}` }));
  };
  const body = (p: import("@/pixel/draw").Px, page: string) => {
    if (page === "TRN" || page === "ORB") {
      p.box(2, 11, 124, 34); drawTerrain(p, c, 3, 12, 122, 32);
      p.rect(90, 11, 36, 8, false); p.box(90, 11, 36, 8); p.textC(c.voices === 1 ? "MONO" : `${c.voices} VOX`, 108, 12);
    } else if (page === "FLT") {
      drawFilterCurve(p, "lowpass", c.cutoff, Math.max(...modelQ(c.flt ?? 0, c.res)) * (c.flt === 1 ? 1 + c.res * 8 : 1), 2, 11, 124, 32);
      p.rect(2, 11, 28, 8); p.textC(FILTER_MODELS[c.flt ?? 0], 16, 12, false);
      const xOf = (f: number) => 2 + Math.round(Math.log(Math.min(16000, Math.max(40, f)) / 40) / Math.log(400) * 123);
      if (c.envAmt > 0) { const a = xOf(c.cutoff), b = xOf(c.cutoff * 2 ** (c.envAmt * 5)); p.line(a, 44, b, 44); p.line(b, 42, b, 44); }
      if (c.drive > 0) p.text(`DRV ${Math.round(c.drive * 100)}`, 92, 13);
    } else drawEnvGraph(p, c.env);
  };
  const extra = (page: string) => {
    if (page === "TRN") return <Tap x={90} y={11} w={36} h={8} label="Synth voices: tap to toggle mono or 8 voices" pressed={c.voices === 1} onClick={() => C({ voices: c.voices === 1 ? 8 : 1 })} />;
    if (page === "FLT") return <><Zone x={2} y={11} w={124} h={32} horizontal log label="Synth cutoff drag" value={c.cutoff} min={40} max={16000} step={1} onChange={cutoff => C({ cutoff })} />
      <Tap x={2} y={11} w={28} h={8} label={`Synth filter model ${FILTER_MODELS[c.flt ?? 0]}: tap for next`} onClick={() => C({ flt: ((c.flt ?? 0) + 1) % 4 })} /></>;
    return <EnvZones env={c.env} set={env => C({ env })} max={1} />;
  };
  return <Panel name={slot.name || "TRN"} pages={PAGES} label="Terrain synth" compactReadout knobs={knobs} body={body} extra={extra} deps={[slot.name, c, noteK.value]} />;
}
export default memo(TerrainPanel);
