import { useNoteKnob } from "@/components/harmonyKnob";
import { noteName } from "@/audio/arp";
import { memo, useRef } from "react";
import type { GetWave } from "./ScopeScreen";
import { reeseVisualLevel } from "@/pixel/reeseWaves";
import { acidParams, defaultAcid, type AcidParams } from "@/audio/acid";
import { drawAcidDisplay } from "@/pixel/acidDisplay";
import { Tap, Zone } from "@/pixel/PixelScreen";
import { Panel, hz, ms, pct, st, type Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";

const PAGES = ["PTCH", "AMP", "WGT"] as const;

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
  const acid = b.mode === "acid";
  const modeKey = <Tap x={96} y={11} w={30} h={10} label="808 mode" pressed={acid} onClick={() => onChange({ bass: { ...b, mode: acid ? "808" : "acid", ...(!acid && !b.acid ? { acid: defaultAcid() } : {}) } })} />;
  const drawMode = (p: import("@/pixel/draw").Px) => { if (acid) { p.rect(96, 11, 30, 10); p.textC("ACID", 111, 14, false); } else { p.box(96, 11, 30, 10); p.textC("808", 111, 14); } };
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
      body={(p, page) => { if (page === "303") { p.box(2, 11, 124, 34); drawAcidDisplay(p, a, visual.current.bucket / 12); }
        else { p.box(2, 11, 124, 34); p.textC(noteK.fmt(slot.note), 48, 17);
          const pc = ((slot.note % 12) + 12) % 12; for (let i = 0; i < 12; i++) { const x = 9 + i * 9; p.box(x, 29, 7, 11); if (i === pc) p.rect(x + 1, 30, 5, 9); }
          drawMode(p); p.rect(3, 12, 30, 10, false); p.box(3, 12, 30, 10); p.textC(a.wave === "square" ? "SQR" : "SAW", 18, 15); } }}
      extra={page => page === "SET" ? <>{modeKey}<Tap x={3} y={12} w={30} h={10} label="Acid waveform" pressed={a.wave === "square"} onClick={() => A({ wave: a.wave === "square" ? "sawtooth" : "square" })} /></> : null} />;
  }

  const knobs = (page: string): Knob[] => {
    if (page === "PTCH") return [
      { label: "Pitch env", short: "PENV", value: b.pitchEnv, min: 0, max: 48, step: 1, reset: 24, fmt: st, set: pitchEnv => B({ pitchEnv }) },
      { label: "Env decay", short: "PDEC", value: b.pitchDecay, min: .005, max: .4, step: .005, reset: .06, fmt: ms, set: pitchDecay => B({ pitchDecay }) },
      noteK,
      { label: "Click", short: "CLK", value: b.click, min: 0, max: 1, step: .01, reset: .3, fmt: pct, set: click => B({ click }) },
    ];
    if (page === "AMP") return [
      { label: "Release", short: "REL", value: b.decay, min: .05, max: 4, step: .01, reset: 1.2, fmt: ms, set: decay => B({ decay }) },
      { label: "Tube drive", short: "DRV", value: b.tube, min: 0, max: 1, step: .01, reset: .25, fmt: pct, set: tube => B({ tube }) },
      { label: "Volume", short: "LEV", value: slot.level, min: 0, max: 100, step: 1, reset: 80, fmt: v => `${v}%`, set: level => onChange({ level }) },
      { label: "Pan", short: "PAN", value: slot.pan, min: -1, max: 1, step: .01, reset: 0, fmt: v => (v === 0 ? "C" : v < 0 ? `L${Math.round(-v * 100)}` : `R${Math.round(v * 100)}`), set: pan => onChange({ pan }) },
    ];
    return [
      { label: "Tube drive", short: "TUBE", value: b.tube, min: 0, max: 1, step: .01, reset: .25, fmt: pct, set: tube => B({ tube }) },
      { label: "Harmonics", short: "HARM", value: b.harmonics, min: 0, max: 1, step: .01, reset: .2, fmt: pct, set: harmonics => B({ harmonics }) },
      { label: "Tone", short: "TONE", value: b.tone, min: 200, max: 16000, step: 10, reset: 2500, fmt: hz, set: tone => B({ tone }) },
      { label: "Volume", short: "LEV", value: slot.level, min: 0, max: 100, step: 1, reset: 80, fmt: v => `${v}%`, set: level => onChange({ level }) },
    ];
  };

  const body = (p: import("@/pixel/draw").Px, page: string) => {
    p.box(2, 11, 124, 34);
    if (page === "PTCH") {
      const dec = Math.max(2, Math.round(b.pitchDecay / .4 * 88)), drop = Math.round(b.pitchEnv / 48 * 24);
      p.line(4, 14, 4 + dec, 14 + drop); p.line(4 + dec, 14 + drop, 96, 14 + drop);
      p.rect(3, 13, 3, 3); p.rect(3 + dec, 13 + drop, 3, 3);
      const value = `+${Math.round(b.pitchEnv)}ST`; p.text(value, 124 - value.length * 4, 36); drawMode(p);
    } else if (page === "AMP") {
      // Release tail graph.
      const rel = Math.max(2, Math.round(b.decay / 4 * 88));
      p.line(4, 14, 4, 14); p.line(4, 14, 4 + rel, 41); p.line(4 + rel, 41, 96, 41);
      const clk = Math.round(b.click * 4);
      for (let i = 0; i < clk; i++) p.dot(6 + i * 2, 16);
      const value = ms(b.decay); p.text(value, 124 - value.length * 4, 36);
    } else {
      // Weight: drive/harmonics/tone bars.
      const bars: [string, number][] = [["TUB", b.tube], ["HRM", b.harmonics], ["TON", b.tone / 16000]];
      bars.forEach(([lb, v], i) => { const x = 26 + i * 34, bh = Math.round(v * 26); p.rect(x, 41 - bh, 14, bh); p.textC(lb, x + 7, 14); });
    }
  };

  const extra = (page: string) => {
    if (page === "PTCH") return <><Zone x={14} y={23} w={114} h={22} horizontal label="Pitch env decay" value={b.pitchDecay} min={.005} max={.4} step={.005} onChange={pitchDecay => B({ pitchDecay })} />{modeKey}</>;
    if (page === "AMP") return <Zone x={14} y={10} w={114} h={35} horizontal label="Release" value={b.decay} min={.05} max={4} step={.01} onChange={decay => B({ decay })} />;
    return null;
  };

  return <Panel name={slot.name || "808"} pages={PAGES} label="Sub808 bass" knobs={knobs} body={body} extra={extra} deps={[slot.name, slot.note, slot.level, slot.pan, b]} />;
}
export default memo(Sub808Panel);
