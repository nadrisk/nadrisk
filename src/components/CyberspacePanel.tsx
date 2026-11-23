import { useNoteKnob } from "@/components/harmonyKnob";
import { memo } from "react";
import { Tap, Zone } from "@/pixel/PixelScreen";
import { Panel, drawEnvGraph, drawFilterCurve, EnvZones, envKnobs, hz, pct, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";
import { cleanOf, defaultClean, FILTER_MODELS, modelQ, type CleanParams } from "@/audio/clean";
import { terrainAt } from "@/audio/terrain";
import { CADENCES, LATTICE_SHAPES, RATES, SURGE_GATES, cadenceOf, type CadenceParams } from "@/audio/cadence";

const PAGES = ["TRN", "ORB", "MOD", "FLT", "ENV"] as const;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const signed = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v * 100)}`;

/** SURF terrain as a dithered 1-bit map with the orbit drawn on top, using the exact math the sound uses. */
export function drawTerrain(p: import("@/pixel/draw").Px, c: CleanParams, x0: number, y0: number, w: number, h: number) {
  const tp = { freq: c.tfreq, hold: c.hold, snow: c.snow, fold: c.fold };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const z = terrainAt(i / (w - 1) * 2 - 1, j / (h - 1) * 2 - 1, tp);
    if ((z + 1) * 8 > BAYER[(j & 3) * 4 + (i & 3)] + .5) p.dot(x0 + i, y0 + j); }
  const ox = x0 + (c.cx + 1) / 2 * (w - 1), oy = y0 + (c.cy + 1) / 2 * (h - 1), rx = c.rad * (w - 1) / 2, ry = c.rad * (h - 1) / 2;
  for (let k = 0; k < 96; k++) { const a = k / 96 * Math.PI * 2, x = Math.round(ox + rx * Math.cos(a)), y = Math.round(oy + ry * Math.sin(a));
    if (x < x0 || x >= x0 + w || y < y0 || y >= y0 + h) continue; p.dot(x, y, k % 2 === 0); }
  p.rect(Math.round(ox) - 1, Math.round(oy) - 1, 3, 3, false); p.dot(Math.round(ox), Math.round(oy));
}

// SYN = SURF wave-terrain synth: TRN tunes the terrain, MOD, FLT, ENV as before.
function CyberspacePanel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const c = cleanOf(slot.synth), home = defaultClean();
  const C = (q: Partial<CleanParams>) => onChange({ synth: { ...slot.synth, clean: { ...c, ...q } } });
  const noteK = useNoteKnob(slot, onChange);
  const K = (label: string, short: string, key: Exclude<keyof CleanParams, "env" | "bpm">, min: number, max: number, step: number, fmt: (v: number) => string, log = false): Knob =>
    ({ label: `Synth ${label}`, short, value: c[key] as number, min, max, step, fmt, log, reset: home[key] as number, set: v => C({ [key]: v }) });
  const cd = cadenceOf(slot.cadence), cdHome = cadenceOf();
  const D = (q: Partial<CadenceParams>) => onChange({ cadence: { ...cd, ...q } });
  const CK = (label: string, short: string, key: "prog" | "horizon" | "rate" | "gate" | "xClk" | "yClk" | "xLen" | "yLen" | "shape", min: number, max: number, fmt: (v: number) => string): Knob =>
    ({ label: `SURF ${label}`, short, value: cd[key], min, max, step: 1, fmt, reset: cdHome[key], set: v => D({ [key]: Math.round(v) }) });
  const knobs = (page: string): Knob[] => {
    if (page === "CAD") return [CK("cadence progression", "PROG", "prog", 0, CADENCES.length - 1, v => String(Math.round(v) + 1)), CK("horizon", "HRZN", "horizon", 1, 4, v => String(Math.round(v))),
      CK("chord rate", "RATE", "rate", 0, RATES.length - 1, v => `${RATES[Math.round(v)] / 4}BT`), CK("surge gate", "SURG", "gate", 0, SURGE_GATES.length - 1, v => SURGE_GATES[Math.round(v)].name)];
    if (page === "LAT") return [CK("lattice x clock", "XCLK", "xClk", 1, 8, v => `/${Math.round(v)}`), CK("lattice x length", "XLEN", "xLen", 1, 4, v => String(Math.round(v))),
      CK("lattice y clock", "YCLK", "yClk", 1, 8, v => `/${Math.round(v)}`), CK("lattice y length", "YLEN", "yLen", 1, 4, v => String(Math.round(v))), CK("lattice shape", "SHPE", "shape", 0, LATTICE_SHAPES.length - 1, v => LATTICE_SHAPES[Math.round(v)])];
    if (page === "TRN") return [noteK, K("terrain frequency", "FREQ", "tfreq", 0, 1, .01, pct), K("terrain hold", "HOLD", "hold", -1, 1, .01, signed), K("terrain snow", "SNOW", "snow", 0, 1, .01, pct),
      K("terrain fold", "FOLD", "fold", 0, 1, .01, pct)];
    if (page === "ORB") return [K("orbit size", "SIZE", "rad", .05, 1, .01, pct), K("detune", "DETN", "detune", 0, 1, .01, pct), K("sub", "SUB", "sub", 0, 1, .01, pct)];
    if (page === "MOD") return [K("pitch envelope amount", "P.AMT", "pAmt", -24, 24, 1, v => `${v > 0 ? "+" : ""}${Math.round(v)}ST`), K("pitch envelope decay", "P.DEC", "pDec", .002, 1, .001, v => v < 1 ? `${Math.round(v * 1000)}MS` : "1S", true),
      K("noise", "NOIS", "noise", 0, 1, .01, pct), K("glide", "GLID", "glide", 0, .5, .001, v => `${Math.round(v * 1000)}MS`)];
    if (page === "FLT") return [K("cutoff", "CUT", "cutoff", 40, 16000, 1, hz, true), K("resonance", "RES", "res", 0, 1, .01, pct), K("filter envelope", "ENV", "envAmt", 0, 1, .01, pct), K("drive", "DRV", "drive", 0, 1, .01, pct)];
    return envKnobs(c.env, env => C({ env }), home.env, 1).map(k => ({ ...k, label: `Synth ${k.label}` }));
  };
  const body = (p: import("@/pixel/draw").Px, page: string) => {
    if (page === "CAD") {
      p.box(2, 11, 124, 34); p.box(2, 11, 30, 8); if (cd.on) p.invert(3, 12, 28, 6); p.textC(cd.on ? "ON" : "OFF", 17, 12, !cd.on);
      p.text(CADENCES[cd.prog].name, 36, 12);
      CADENCES[cd.prog].deg.forEach((_, k) => { const x = 4 + k * 30; p.box(x, 22, 28, 10); if (k < cd.horizon) p.invert(x + 1, 23, 26, 8); p.textC(CADENCES[cd.prog].name.split(" ")[k], x + 14, 24, k >= cd.horizon); });
      SURGE_GATES[cd.gate].g.forEach((g, k) => { const x = 4 + k * 7.5; p.rect(Math.round(x), g ? 36 : 41, 6, g ? 7 : 2); });
    } else if (page === "LAT") {
      p.box(2, 11, 124, 34); p.box(92, 11, 34, 8); p.textC(cd.track === "chord" ? "CHORD" : "ROOT", 109, 12);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const on = x < cd.xLen && y < cd.yLen, px = 30 + x * 15, py = 13 + (3 - y) * 8; p.box(px, py, 13, 7); if (on) p.rect(px + 2, py + 2, 9, 3); }
      p.text(LATTICE_SHAPES[cd.shape], 4, 36);
    } else if (page === "TRN" || page === "ORB") {
      p.box(2, 11, 124, 34); drawTerrain(p, c, 3, 12, 122, 32);
      p.rect(90, 11, 36, 8, false); p.box(90, 11, 36, 8); p.textC(c.voices === 1 ? "MONO" : `${c.voices} VOX`, 108, 12);
    } else if (page === "MOD") {
      p.box(2, 11, 124, 34);
      // Pitch envelope: exponential fall from P.AMT to the note over P.DEC (time axis 0..1 s, log-ish).
      const mid = 28, d = c.pDec ?? .05, amt = c.pAmt ?? 0; let py = mid;
      p.text("PITCH", 4, 13); p.dot(4, mid); for (let x = 4; x < 80; x += 3) p.dot(x, mid);
      for (let x = 0; x < 76; x++) { const tt = (x / 75) ** 2, y = mid - Math.round(amt / 24 * 13 * Math.exp(-tt * 4 / d)); if (x) p.line(3 + x, py, 4 + x, y); py = y; }
      // Noise level column.
      p.text("NOIS", 92, 13); p.box(96, 20, 10, 23); const nh = Math.round((c.noise ?? 0) * 21); if (nh) p.rect(97, 42 - nh, 8, nh);
      p.text("GL", 110, 13); p.box(112, 20, 10, 23); const gh = Math.round(c.glide / .5 * 21); if (gh) p.rect(113, 42 - gh, 8, gh);
    } else if (page === "FLT") {
      drawFilterCurve(p, "lowpass", c.cutoff, Math.max(...modelQ(c.flt ?? 0, c.res)) * (c.flt === 1 ? 1 + c.res * 8 : 1), 2, 11, 124, 32);
      p.rect(2, 11, 28, 8); p.textC(FILTER_MODELS[c.flt ?? 0], 16, 12, false);
      const xOf = (f: number) => 2 + Math.round(Math.log(Math.min(16000, Math.max(40, f)) / 40) / Math.log(400) * 123);
      if (c.envAmt > 0) { const a = xOf(c.cutoff), b = xOf(c.cutoff * 2 ** (c.envAmt * 5)); p.line(a, 44, b, 44); p.line(b, 42, b, 44); }
      if (c.drive > 0) p.text(`DRV ${Math.round(c.drive * 100)}`, 92, 13);
    } else drawEnvGraph(p, c.env);
  };
  const extra = (page: string) => {
    if (page === "CAD") return <Tap x={2} y={11} w={30} h={8} label={`SURF cadence ${cd.on ? "on" : "off"}: tap to toggle`} pressed={cd.on} onClick={() => D({ on: !cd.on })} />;
    if (page === "LAT") return <Tap x={92} y={11} w={34} h={8} label={`SURF lattice track ${cd.track}: tap to toggle chord or root`} pressed={cd.track === "chord"} onClick={() => D({ track: cd.track === "chord" ? "root" : "chord" })} />;
    if (page === "TRN") return <Tap x={90} y={11} w={36} h={8} label="Synth voices: tap to toggle mono or 8 voices" pressed={c.voices === 1} onClick={() => C({ voices: c.voices === 1 ? 8 : 1 })} />;
    if (page === "FLT") return <><Zone x={2} y={11} w={124} h={32} horizontal log label="Synth cutoff drag" value={c.cutoff} min={40} max={16000} step={1} onChange={cutoff => C({ cutoff })} />
      <Tap x={2} y={11} w={28} h={8} label={`Synth filter model ${FILTER_MODELS[c.flt ?? 0]}: tap for next`} onClick={() => C({ flt: ((c.flt ?? 0) + 1) % 4 })} /></>;
    return <EnvZones env={c.env} set={env => C({ env })} max={1} />;
  };
  return <Panel name={slot.name || "SURF"} pages={PAGES} label="SURF terrain synth" compactReadout knobs={knobs} body={body} extra={extra} deps={[slot.name, c, noteK.value, cd]} />;
}
export default memo(CyberspacePanel);
