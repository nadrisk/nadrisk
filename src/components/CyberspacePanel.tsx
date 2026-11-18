import { useNoteKnob } from "@/components/harmonyKnob";
import { memo, useEffect, useState } from "react";
import { basicTable, framePair, loadTable, onTablesChanged, type WtTable } from "@/audio/wavetable";
import { Tap, Zone } from "@/pixel/PixelScreen";
import WavetableView from "./WavetableView";
import { Panel, drawEnvGraph, drawFilterCurve, EnvZones, envKnobs, hz, pct, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";
import { cleanOf, defaultClean, FILTER_MODELS, modelQ, waveMix, WAVE_NAMES, type CleanParams } from "@/audio/clean";

const PAGES = ["OSC", "MOD", "FLT", "ENV"] as const;
/** Table for the screen: BASIC instantly, imported ones once loaded (re-renders when the library changes). */
export function useWavetable(id?: string): WtTable {
  const [t, setT] = useState<WtTable | null>(null);
  useEffect(() => { let live = true; const get = () => { if (id && id !== "basic") loadTable(id).then(x => { if (live) setT(x); }); else setT(null); }; get(); const off = onTablesChanged(get); return () => { live = false; off(); }; }, [id]);
  return t ?? basicTable();
}
export const shape = (k: number, ph: number) => { const t = ph - Math.floor(ph); return k === 0 ? t * 2 - 1 : k === 1 ? (t < .5 ? 1 : -1) : k === 2 ? 1 - Math.abs(t * 4 - 2) : Math.sin(t * Math.PI * 2); };
const waveName = (w: number) => { const i = Math.round(w); return Math.abs(w - i) < .08 ? WAVE_NAMES[i] : `${WAVE_NAMES[Math.floor(w)]}>${WAVE_NAMES[Math.min(3, Math.floor(w) + 1)]}`; };

// SYN: clean OP-1 style synth. Three flat pages, four knobs each, one graphic per page.
function CyberspacePanel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const c = cleanOf(slot.synth), home = defaultClean();
  const C = (q: Partial<CleanParams>) => onChange({ synth: { ...slot.synth, clean: { ...c, ...q } } });
  const noteK = useNoteKnob(slot, onChange);
  const tbl = useWavetable(c.wt), basic = !c.wt || c.wt === "basic", nF = basic ? 4 : tbl.view.length;
  const posName = (w: number) => basic ? waveName(w) : `${Math.round(w / 3 * (nF - 1)) + 1}/${nF}`;
  const K = (label: string, short: string, key: Exclude<keyof CleanParams, "env" | "wt">, min: number, max: number, step: number, fmt: (v: number) => string, log = false): Knob =>
    ({ label: `Synth ${label}`, short, value: c[key], min, max, step, fmt, log, reset: home[key], set: v => C({ [key]: v }) });
  const knobs = (page: string): Knob[] => {
    if (page === "OSC") return [noteK, K("wave", "WAVE", "wave", 0, 3, .001, posName), K("sub", "SUB", "sub", 0, 1, .01, pct), K("detune", "DETN", "detune", 0, 1, .01, pct),
      K("voices", "VOX", "voices", 1, 8, 1, v => (v === 1 ? "MONO" : `${v}V`))];
    if (page === "MOD") return [K("pitch envelope amount", "P.AMT", "pAmt", -24, 24, 1, v => `${v > 0 ? "+" : ""}${Math.round(v)}ST`), K("pitch envelope decay", "P.DEC", "pDec", .002, 1, .001, v => v < 1 ? `${Math.round(v * 1000)}MS` : "1S", true),
      K("noise", "NOIS", "noise", 0, 1, .01, pct), K("glide", "GLID", "glide", 0, .5, .001, v => `${Math.round(v * 1000)}MS`)];
    if (page === "FLT") return [K("cutoff", "CUT", "cutoff", 40, 16000, 1, hz, true), K("resonance", "RES", "res", 0, 1, .01, pct), K("filter envelope", "ENV", "envAmt", 0, 1, .01, pct), K("drive", "DRV", "drive", 0, 1, .01, pct)];
    return envKnobs(c.env, env => C({ env }), home.env).map(k => ({ ...k, label: `Synth ${k.label}` }));
  };
  const body = (p: import("@/pixel/draw").Px, page: string) => {
    if (page === "OSC") {
      p.box(2, 11, 124, 34);
      p.text((basic ? waveName(c.wave) : `${tbl.name.toUpperCase().slice(0, 10)} ${posName(c.wave)}`).slice(0, 18), 4, 13);
      // Voice dots: lit = available voices, one bar = mono.
      if (c.voices === 1) p.text("MONO", 104, 13); else for (let i = 0; i < 8; i++) { if (i < c.voices) p.rect(92 + i * 4, 13, 3, 4); else p.dot(93 + i * 4, 16); }
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
    if (page === "OSC") return <>
      <WavetableView x={4} y={19} w={120} h={25} table={tbl} wave={c.wave} basic={basic} />
      <Zone x={2} y={11} w={124} h={34} horizontal label="Synth wavetable position" value={c.wave} min={0} max={3} step={.001} reset={home.wave} onChange={wave => C({ wave })} />
      <Tap x={90} y={11} w={36} h={8} label="Synth voices: tap to toggle mono or 8 voices" pressed={c.voices === 1} onClick={() => C({ voices: c.voices === 1 ? 8 : 1 })} />
    </>;
    if (page === "FLT") return <><Zone x={2} y={11} w={124} h={32} horizontal log label="Synth cutoff drag" value={c.cutoff} min={40} max={16000} step={1} onChange={cutoff => C({ cutoff })} />
      <Tap x={2} y={11} w={28} h={8} label={`Synth filter model ${FILTER_MODELS[c.flt ?? 0]}: tap for next`} onClick={() => C({ flt: ((c.flt ?? 0) + 1) % 4 })} /></>;
    return <EnvZones env={c.env} set={env => C({ env })} />;
  };
  return <Panel name={slot.name || "SYN"} pages={PAGES} label="Wavetable synth" knobs={knobs} body={body} extra={extra} deps={[slot.name, c, noteK.value, tbl]} />;
}
export default memo(CyberspacePanel);
