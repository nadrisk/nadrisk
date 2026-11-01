import { useNoteKnob } from "@/components/harmonyKnob";
import { memo } from "react";
import { Tap, Zone } from "@/pixel/PixelScreen";
import { Panel, drawEnvGraph, drawFilterCurve, EnvZones, envKnobs, hz, pct, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";
import { cleanOf, defaultClean, waveMix, WAVE_NAMES, type CleanParams } from "@/audio/clean";

const PAGES = ["OSC", "FLT", "ENV"] as const;
const shape = (k: number, ph: number) => { const t = ph - Math.floor(ph); return k === 0 ? t * 2 - 1 : k === 1 ? (t < .5 ? 1 : -1) : k === 2 ? 1 - Math.abs(t * 4 - 2) : Math.sin(t * Math.PI * 2); };
const waveName = (w: number) => { const i = Math.round(w); return Math.abs(w - i) < .08 ? WAVE_NAMES[i] : `${WAVE_NAMES[Math.floor(w)]}>${WAVE_NAMES[Math.min(3, Math.floor(w) + 1)]}`; };

// SYN: clean OP-1 style synth. Three flat pages, four knobs each, one graphic per page.
function CyberspacePanel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const c = cleanOf(slot.synth), home = defaultClean();
  const C = (q: Partial<CleanParams>) => onChange({ synth: { ...slot.synth, clean: { ...c, ...q } } });
  const noteK = useNoteKnob(slot, onChange);
  const K = (label: string, short: string, key: Exclude<keyof CleanParams, "env">, min: number, max: number, step: number, fmt: (v: number) => string, log = false): Knob =>
    ({ label: `Synth ${label}`, short, value: c[key], min, max, step, fmt, log, reset: home[key], set: v => C({ [key]: v }) });
  const knobs = (page: string): Knob[] => {
    if (page === "OSC") return [noteK, K("wave", "WAVE", "wave", 0, 3, .01, waveName), K("sub", "SUB", "sub", 0, 1, .01, pct), K("detune", "DETN", "detune", 0, 1, .01, pct),
      K("voices", "VOX", "voices", 1, 8, 1, v => (v === 1 ? "MONO" : `${v}V`))];
    if (page === "FLT") return [K("cutoff", "CUT", "cutoff", 40, 16000, 1, hz, true), K("resonance", "RES", "res", 0, 1, .01, pct), K("filter envelope", "ENV", "envAmt", 0, 1, .01, pct), K("drive", "DRV", "drive", 0, 1, .01, pct)];
    return envKnobs(c.env, env => C({ env }), home.env).map(k => ({ ...k, label: `Synth ${k.label}` }));
  };
  const body = (p: import("@/pixel/draw").Px, page: string) => {
    if (page === "OSC") {
      p.box(2, 11, 124, 34);
      const mix = waveMix(c.wave), mid = 26, cents = c.detune * 28;
      let prev = 0;
      for (let x = 0; x < 120; x++) { const ph = x / 40;
        let v = 0; mix.forEach((w, k) => { if (w > .01) v += w * (shape(k, ph) + shape(k, ph * (1 + cents / 1200 * 6))) / 2; });
        v = v * (1 - c.sub * .35) + c.sub * .35 * Math.sin(ph * Math.PI);
        const y = mid - Math.round(Math.max(-1, Math.min(1, v)) * 12); if (x) p.line(3 + x, prev, 4 + x, y); prev = y; }
      p.text(waveName(c.wave), 4, 13);
      // Voice dots: lit = available voices, one bar = mono.
      if (c.voices === 1) p.text("MONO", 104, 13); else for (let i = 0; i < 8; i++) { if (i < c.voices) p.rect(92 + i * 4, 13, 3, 4); else p.dot(93 + i * 4, 16); }
    } else if (page === "FLT") {
      drawFilterCurve(p, "lowpass", c.cutoff, .707 + c.res * 14, 2, 11, 124, 32);
      const xOf = (f: number) => 2 + Math.round(Math.log(Math.min(16000, Math.max(40, f)) / 40) / Math.log(400) * 123);
      if (c.envAmt > 0) { const a = xOf(c.cutoff), b = xOf(c.cutoff * 2 ** (c.envAmt * 5)); p.line(a, 44, b, 44); p.line(b, 42, b, 44); }
      if (c.drive > 0) p.text(`DRV ${Math.round(c.drive * 100)}`, 92, 13);
    } else drawEnvGraph(p, c.env);
  };
  const extra = (page: string) => {
    if (page === "OSC") return <>
      <Zone x={2} y={11} w={124} h={34} horizontal label="Synth wave morph" value={c.wave} min={0} max={3} step={.01} reset={home.wave} onChange={wave => C({ wave })} />
      <Tap x={90} y={11} w={36} h={8} label="Synth voices: tap to toggle mono or 8 voices" pressed={c.voices === 1} onClick={() => C({ voices: c.voices === 1 ? 8 : 1 })} />
    </>;
    if (page === "FLT") return <Zone x={2} y={11} w={124} h={32} horizontal log label="Synth cutoff drag" value={c.cutoff} min={40} max={16000} step={1} onChange={cutoff => C({ cutoff })} />;
    return <EnvZones env={c.env} set={env => C({ env })} />;
  };
  return <Panel name={slot.name || "SYN"} pages={PAGES} label="Clean synth" knobs={knobs} body={body} extra={extra} deps={[slot.name, c, noteK.value]} />;
}
export default memo(CyberspacePanel);
