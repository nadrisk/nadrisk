import { useNoteKnob } from "@/components/harmonyKnob";
import { noteName } from "@/audio/arp";
import { memo, useRef } from "react";
import type { GetWave } from "./ScopeScreen";
import { drawReeseWaves, reeseVisualLevel } from "@/pixel/reeseWaves";
import { defaultReese, reeseParams, type ReeseParams } from "@/audio/reese";
import { drawFilterCurve } from "./pixelScreens";
import { acidParams, defaultAcid, type AcidParams } from "@/audio/acid";
import { drawAcidDisplay, draw808Display } from "@/pixel/acidDisplay";
import { Tap, Zone } from "@/pixel/PixelScreen";
import { Panel, hz, ms, pct, st, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";

const PAGES = ["PTCH", "BODY"] as const;

// SUB808: the 808 editor as a 128x64 1-bit hardware screen.
function Sub808Panel({ slot, index = 0, getWave, onChange }: { slot: Slot; index?: number; getWave?: GetWave; onChange: (p: Partial<Slot>) => void }) {
  const b = slot.bass;
  const B = (p: Partial<typeof b>) => onChange({ bass: { ...b, ...p } });
  const noteK = useNoteKnob(slot, onChange, 20, 60);
  const visual = useRef({ index, buffer: new Float32Array(512), level: 0, bucket: 0 });
  if (visual.current.index !== index) { visual.current.index = index; visual.current.level = 0; visual.current.bucket = 0; }
  const reactToSound = () => {
    const v = visual.current;
    if (!getWave?.(index, v.buffer)) v.buffer.fill(0);
    v.level = reeseVisualLevel(v.buffer, v.level); if (v.level < .015) v.level = 0;
    const bucket = Math.round(v.level * 12), changed = bucket !== v.bucket; v.bucket = bucket; return changed;
  };
  const acid = b.mode === "acid", reese = b.mode === "reese";
  // BAS mode key cycles 808 > ACID > REESE; the key shows the mode it switches to.
  const next = acid ? "reese" : reese ? "808" : "acid", NEXT = next === "reese" ? "RESE" : next === "acid" ? "ACID" : "808";
  const modeKey = <Tap x={96} y={11} w={30} h={10} label={`Switch bass to ${NEXT}`} pressed={b.mode !== undefined && b.mode !== "808"} onClick={() => onChange({ bass: { ...b, mode: next, ...(next === "acid" && !b.acid ? { acid: defaultAcid() } : {}), ...(next === "reese" && !b.reese ? { reese: defaultReese() } : {}) } })} />;
  const drawMode = (p: import("@/pixel/draw").Px) => { p.rect(96, 11, 30, 10, false); p.box(96, 11, 30, 10); p.textC(NEXT, 111, 14); };
  if (reese) {
    const r = reeseParams(b.reese), rh = defaultReese();
    const Rz = (q: Partial<ReeseParams>) => onChange({ bass: { ...b, reese: { ...r, ...q } } });
    const rk = (label: string, short: string, key: "detune" | "sub" | "glide" | "cutoff" | "res" | "width", min: number, max: number, step: number, fmt: (n: number) => string, log = false): Knob =>
      ({ label: `Reese ${label}`, short, value: r[key], min, max, step, fmt, log, reset: rh[key], set: v => Rz({ [key]: v }) });
    return <Panel key="reese" name={slot.name || "REESE"} label="Bass reese" pages={["OSC", "FLT"]} deps={[index, slot.name, slot.note, b]}
      live={page => page === "OSC" && getWave ? reactToSound : undefined}
      knobs={page => page === "OSC" ? [noteK, rk("detune", "DETN", "detune", 0, 50, .1, v => `${v.toFixed(0)}CT`), rk("sub", "SUB", "sub", 0, 1, .01, pct), rk("glide", "GLID", "glide", 0, .5, .001, ms)]
        : [rk("cutoff", "CUT", "cutoff", 40, 16000, 1, hz, true), rk("resonance", "RES", "res", 0, 8, .1, v => v.toFixed(1)), rk("width", "WID", "width", 0, 1, .01, pct),
          { label: "Reese release", short: "REL", value: r.env.r, min: .01, max: 4, step: .01, fmt: ms, reset: rh.env.r, set: v => Rz({ env: { ...r.env, r: v } }) }]}
      body={(p, page) => { if (page === "OSC") { p.box(2, 11, 124, 34); drawReeseWaves(p, r, visual.current.bucket / 12, window.matchMedia("(prefers-reduced-motion: reduce)").matches); drawMode(p); }
        else drawFilterCurve(p, "lowpass", r.cutoff, r.res, 2, 11, 124, 32); }}
      extra={page => page === "OSC" ? modeKey : <Zone x={2} y={11} w={124} h={32} horizontal log label="Reese cutoff drag" value={r.cutoff} min={40} max={16000} step={1} onChange={cutoff => Rz({ cutoff })} />} />;
  }
  if (acid) {
    const a = acidParams(b.acid), init = defaultAcid();
    const A = (patch: Partial<AcidParams>) => onChange({ bass: { ...b, acid: { ...a, ...patch } } });
    const k = (label: string, short: string, key: Exclude<keyof AcidParams, "wave">, min: number, max: number, step: number, fmt: (n: number) => string, log = false): Knob =>
      ({ label: `Acid ${label}`, short, value: a[key], min, max, step, fmt, log, reset: init[key], set: v => A({ [key]: v }) });
    return <Panel key="acid" name={slot.name || "ACID"} label="Sub808 acid" pages={["303", "SET"]} deps={[index, slot.name, slot.note, b]}
      live={page => page === "303" && getWave ? reactToSound : undefined}
      knobs={page => page === "303" ? [
        k("cutoff", "CUT", "cutoff", 40, 8000, 1, hz, true), k("resonance", "RES", "res", 0, 1, .01, pct),
        k("envelope", "ENV", "envMod", 0, 5, .01, v => `${v.toFixed(1)}OC`), k("decay", "DEC", "decay", .06, 1.5, .001, ms),
      ] : [noteK, k("accent", "ACC", "accent", 0, 1, .01, pct), k("drive", "DRV", "drive", 0, 1, .01, pct)]}
      body={(p, page) => { if (page === "303") { p.box(2, 11, 124, 34); drawAcidDisplay(p, a, visual.current.bucket / 12); drawMode(p); }
        else { p.box(2, 11, 124, 34); p.textC(noteK.fmt(slot.note), 48, 17);
          const pc = ((slot.note % 12) + 12) % 12; for (let i = 0; i < 12; i++) { const x = 9 + i * 9; p.box(x, 29, 7, 11); if (i === pc) p.rect(x + 1, 30, 5, 9); }
          p.rect(3, 12, 30, 10, false); p.box(3, 12, 30, 10); p.textC(a.wave === "square" ? "SQR" : "SAW", 18, 15); } }}
      extra={page => page === "303" ? modeKey : page === "SET" ? <><Tap x={3} y={12} w={30} h={10} label="Acid waveform" pressed={a.wave === "square"} onClick={() => A({ wave: a.wave === "square" ? "sawtooth" : "square" })} /></> : null} />;
  }

  const knobs = (page: string): Knob[] => {
    if (page === "PTCH") return [
      { label: "Pitch env", short: "PENV", value: b.pitchEnv, min: 0, max: 48, step: 1, reset: 24, fmt: st, set: pitchEnv => B({ pitchEnv }) },
      { label: "Env decay", short: "PDEC", value: b.pitchDecay, min: .005, max: .4, step: .005, reset: .06, fmt: ms, set: pitchDecay => B({ pitchDecay }) },
      noteK,
      { label: "Click", short: "CLK", value: b.click, min: 0, max: 1, step: .01, reset: .3, fmt: pct, set: click => B({ click }) },
    ];
    return [
      { label: "Release", short: "DEC", value: b.decay, min: .05, max: 4, step: .01, reset: 1.2, fmt: ms, set: decay => B({ decay }) },
      { label: "Tube drive", short: "DRV", value: b.tube, min: 0, max: 1, step: .01, reset: .25, fmt: pct, set: tube => B({ tube }) },
      { label: "Harmonics", short: "HARM", value: b.harmonics, min: 0, max: 1, step: .01, reset: .2, fmt: pct, set: harmonics => B({ harmonics }) },
      { label: "Tone", short: "TONE", value: b.tone, min: 200, max: 16000, step: 10, reset: 2500, fmt: hz, set: tone => B({ tone }) },
    ];
  };

  const body = (p: import("@/pixel/draw").Px, page: string) => {
    p.box(2, 11, 124, 34);
    if (page === "PTCH") {
      draw808Display(p, b, slot.note, visual.current.bucket / 12); drawMode(p);
    } else {
      // Release tail graph.
      const rel = Math.max(2, Math.round(b.decay / 4 * 88));
      p.line(4, 14, 4, 14); p.line(4, 14, 4 + rel, 41); p.line(4 + rel, 41, 96, 41);
      const clk = Math.round(b.click * 4);
      for (let i = 0; i < clk; i++) p.dot(6 + i * 2, 16);
      const value = ms(b.decay); p.text(value, 124 - value.length * 4, 13);
      // Weight bars beside the tail: drive / harmonics / tone.
      ([["TUB", b.tube], ["HRM", b.harmonics], ["TON", b.tone / 16000]] as [string, number][]).forEach(([lb, v], i) => { const x = 100 + i * 8, bh = Math.round(v * 18); p.rect(x, 41 - bh, 5, bh); });
    }
  };

  const extra = (page: string) => {
    if (page === "PTCH") return <><Zone x={14} y={23} w={114} h={22} horizontal label="Pitch env decay" value={b.pitchDecay} min={.005} max={.4} step={.005} onChange={pitchDecay => B({ pitchDecay })} />{modeKey}</>;
    if (page === "BODY") return <Zone x={14} y={10} w={84} h={35} horizontal label="Release" value={b.decay} min={.05} max={4} step={.01} onChange={decay => B({ decay })} />;
    return null;
  };

  return <Panel name={slot.name || "808"} pages={PAGES} label="Sub808 bass" knobs={knobs} body={body} extra={extra} deps={[index, slot.name, slot.note, slot.level, slot.pan, b]}
    live={page => page === "PTCH" && getWave ? reactToSound : undefined} />;
}
export default memo(Sub808Panel);
