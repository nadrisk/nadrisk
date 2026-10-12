import { noteName } from "@/audio/arp";
import { memo } from "react";
import { Tap, Zone } from "@/pixel/PixelScreen";
import { Panel, drawWaveIcon, drawEnvGraph, EnvZones, envKnobs, hz, ms, st, type Knob } from "./pixelScreens";
import { defaultLaser, laserParams, laserPitchAt, type LaserParams } from "@/audio/laser";
import type { Slot } from "@/hooks/useGroovebox";
import { defaultSiren, type Wave } from "@/audio/voices";

const PAGES = ["OSC", "LFO", "SWP"] as const;
const WAVES: Wave[] = ["sine", "triangle", "sawtooth", "square"];

// SIREN: the dub siren editor as a 128x64 1-bit hardware screen.
function SirenPanel({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const z = { ...defaultSiren(), ...slot.siren };
  const Z = (p: Partial<typeof z>) => onChange({ siren: { ...z, ...p } });
  const laser = z.mode === "laser", l = laserParams(z.laser), home = defaultLaser();
  const L = (p: Partial<LaserParams>) => Z({ laser: { ...l, ...p } });
  const modeKey = <Tap x={96} y={11} w={30} h={10} label="Siren mode" pressed={laser} onClick={() => Z({ mode: laser ? "dub" : "laser" })} />;

  if (laser) {
    const laserKnobs = (page: string): Knob[] => {
      if (page === "OSC") return [
        { label: "Note", short: "NOTE", value: slot.note, min: 36, max: 96, step: 1, fmt: v => noteName(Math.round(v)), reset: 48, set: note => onChange({ note }) },
        { label: "Laser detune", short: "DTUN", value: l.detune, min: 0, max: 100, step: 1, fmt: v => `${Math.round(v)}CT`, reset: home.detune, set: detune => L({ detune }) },
        { label: "Laser tone", short: "TONE", value: l.tone, min: 300, max: 12000, step: 10, fmt: hz, log: true, reset: home.tone, set: tone => L({ tone }) },
        { label: "Volume", short: "LEV", value: slot.level, min: 0, max: 100, step: 1, fmt: v => `${v}%`, reset: 75, set: level => onChange({ level }) },
      ];
      if (page === "PEN") return [
        { label: "Laser pitch amount", short: "AMT", value: l.amount, min: -24, max: 24, step: 1, fmt: st, reset: home.amount, set: amount => L({ amount }) },
        { label: "Laser pitch decay", short: "DEC", value: l.decay, min: .005, max: 2, step: .001, fmt: ms, log: true, reset: home.decay, set: decay => L({ decay }) },
        { label: "Laser pitch curve", short: "CRV", value: l.curve, min: .25, max: 6, step: .05, fmt: v => v.toFixed(2), reset: home.curve, set: curve => L({ curve }) },
      ];
      return envKnobs(l.env, env => L({ env }), home.env).map(k => ({ ...k, label: `Laser amp ${k.label}`, log: k.short !== "SUS" }));
    };
    const laserBody = (p: import("@/pixel/draw").Px, page: string) => {
      p.box(96, 11, 30, 10); p.textC("LASER", 111, 14);
      if (page === "OSC") {
        drawWaveIcon(p, l.wave, 2, 11, 22, 10); p.text(l.wave === "square" ? "SQR" : "SAW", 28, 14);
        p.box(2, 23, 124, 19);
        // Three voice lines spread in cents, not an invented output waveform.
        for (const side of [-1, 0, 1]) {
          const x = 64 + Math.round(side * l.detune / 100 * 48);
          p.line(x, 27, x, 38); p.rect(x - 1, 30, 3, 5);
        }
      } else if (page === "PEN") {
        p.text("PITCH ENV", 3, 14); p.box(2, 23, 124, 19);
        for (let x = 4; x < 124; x += 4) p.dot(x, 32);
        const width = 25 + Math.round(Math.log(l.decay / .005) / Math.log(400) * 94);
        let px = 4, py = 32 - Math.round(l.amount / 24 * 7);
        for (let x = 1; x <= 119; x++) {
          const y = 32 - Math.round(laserPitchAt(l.amount, x / width, l.curve) / 24 * 7);
          p.line(px, py, 4 + x, y); px = 4 + x; py = y;
        }
      } else { p.text("AMP ENV", 3, 14); drawEnvGraph(p, l.env, 2, 23, 124, 18); }
    };
    return <Panel key="laser" name={slot.name || "SIRN"} pages={["OSC", "PEN", "AMP"]} label="Laser" knobs={laserKnobs} body={laserBody} extra={page => <>
      {modeKey}
      {page === "OSC" && <Tap x={2} y={11} w={22} h={10} label="Laser wave" pressed={l.wave === "square"} onClick={() => L({ wave: l.wave === "square" ? "sawtooth" : "square" })} />}
      {page === "AMP" && <EnvZones env={l.env} set={env => L({ env })} x0={2} y0={23} w={124} h={18} />}
    </>} deps={[slot.name, slot.note, slot.level, l]} />;
  }

  const knobs = (page: string): Knob[] => {
    if (page === "OSC") return [
      { label: "Tone", short: "TONE", value: z.tone, min: 300, max: 12000, step: 10, fmt: hz, set: tone => Z({ tone }) },
      { label: "Note", short: "NOTE", value: slot.note, min: 36, max: 96, step: 1, fmt: v => noteName(Math.round(v)), set: note => onChange({ note }) },
      { label: "Siren release", short: "REL", value: z.release, min: .02, max: 3, step: .01, fmt: ms, set: release => Z({ release }) },
      { label: "Volume", short: "LEV", value: slot.level, min: 0, max: 100, step: 1, fmt: v => `${v}%`, set: level => onChange({ level }) },
    ];
    if (page === "LFO") return [
      { label: "LFO rate", short: "RATE", value: z.rate, min: .1, max: 20, step: .1, fmt: v => `${v.toFixed(1)}HZ`, set: rate => Z({ rate }) },
      { label: "LFO depth", short: "DPTH", value: z.depth, min: 0, max: 24, step: .5, fmt: st, set: depth => Z({ depth }) },
      { label: "Tone", short: "TONE", value: z.tone, min: 300, max: 12000, step: 10, fmt: hz, set: tone => Z({ tone }) },
      { label: "Siren release", short: "REL", value: z.release, min: .02, max: 3, step: .01, fmt: ms, set: release => Z({ release }) },
    ];
    return [
      { label: "Sweep", short: "SWP", value: z.sweep, min: -24, max: 24, step: 1, fmt: st, set: sweep => Z({ sweep }) },
      { label: "Sweep time", short: "TIME", value: z.sweepTime, min: .05, max: 6, step: .05, fmt: v => `${v.toFixed(1)}S`, set: sweepTime => Z({ sweepTime }) },
      { label: "Siren release", short: "REL", value: z.release, min: .02, max: 3, step: .01, fmt: ms, set: release => Z({ release }) },
      { label: "Volume", short: "LEV", value: slot.level, min: 0, max: 100, step: 1, fmt: v => `${v}%`, set: level => onChange({ level }) },
    ];
  };

  // Oscilloscope trace computed from the current settings so it reacts as the sound is shaped.
  const scope = (p: import("@/pixel/draw").Px, lfo: boolean) => {
    const X0 = 3, W = 122, Y0 = 26, H = 15, mid = Y0 + 7;
    p.box(2, Y0 - 1, 124, H + 2);
    for (let x = X0; x < X0 + W; x += 4) p.dot(x, mid);
    const shape = (w: Wave, ph: number) => { const t = ((ph % 1) + 1) % 1;
      if (w === "sine") return Math.sin(t * Math.PI * 2);
      if (w === "triangle") return 1 - Math.abs(t * 4 - 2);
      if (w === "sawtooth") return t * 2 - 1;
      return t < .5 ? 1 : -1; };
    const cycles = 2 + (slot.note - 36) / 60 * 4, smooth = 1 - Math.min(.92, Math.log(z.tone / 300) / Math.log(40));
    let y = 0, ph = 0, prev: [number, number] | null = null;
    for (let i = 0; i < W; i++) { const t = i / W; let v: number;
      if (lfo) v = shape(z.lfoWave, t * Math.min(6, Math.max(.5, z.rate / 2))) * Math.max(.15, z.depth / 24);
      else { const fm = 1 + shape(z.lfoWave, t * Math.min(6, z.rate / 2)) * z.depth / 48; ph += cycles / W * fm; v = shape(z.wave, ph) * (slot.level / 100 * .6 + .4); }
      y += (v - y) * (lfo ? 1 : 1 - smooth * .85);
      const pt: [number, number] = [X0 + i, mid - Math.round(Math.max(-1, Math.min(1, y)) * 6)];
      if (prev) p.line(prev[0], prev[1], pt[0], pt[1]); prev = pt; }
  };

  const body = (p: import("@/pixel/draw").Px, page: string) => {
    if (page === "OSC" || page === "LFO") {
      const w = page === "OSC" ? z.wave : z.lfoWave;
      drawWaveIcon(p, w, 2, 11, 22, 12);
      p.text(page === "OSC" ? w.slice(0, 5).toUpperCase() : `${w.slice(0, 3).toUpperCase()} ${z.rate.toFixed(1)}HZ`, 28, 15);
      p.box(96, 11, 30, 10); p.textC("DUB", 111, 14);
      scope(p, page === "LFO");
    } else {
      // Sweep arrow graph: pitch rises or falls over sweep time, edge to edge.
      p.box(2, 23, 124, 19);
      const up = z.sweep >= 0, len = Math.max(4, Math.round(z.sweepTime / 6 * 110)), mag = Math.round(Math.abs(z.sweep) / 24 * 24);
      const y0 = up ? 39 : 25, y1 = up ? 39 - Math.min(14, mag) : 25 + Math.min(14, mag);
      p.line(3, y0, 3 + len, y1); p.line(3 + len, y1, 124, y1);
      p.rect(3, y0 - 1, 3, 3); p.rect(2 + len, y1 - 1, 3, 3);
      p.text(`${z.sweep > 0 ? "+" : ""}${Math.round(z.sweep)}ST`, 3, 14);
      p.box(96, 11, 30, 10); p.textC("DUB", 111, 14);
    }
  };

  const extra = (page: string) => {
    if (page === "OSC") return <Zone x={2} y={11} w={22} h={12} label="Siren wave" value={WAVES.indexOf(z.wave)} min={0} max={3} step={1} onChange={v => Z({ wave: WAVES[Math.round(v)] })} />;
    if (page === "LFO") return <Zone x={2} y={11} w={22} h={12} label="Siren LFO wave" value={WAVES.indexOf(z.lfoWave)} min={0} max={3} step={1} onChange={v => Z({ lfoWave: WAVES[Math.round(v)] })} />;
    if (page === "SWP") return <Zone x={2} y={23} w={124} h={19} horizontal label="Sweep time" value={z.sweepTime} min={.05} max={6} step={.05} onChange={sweepTime => Z({ sweepTime })} />;
    return null;
  };

  return <Panel key="dub" name={slot.name || "SIRN"} pages={PAGES} label="Siren" knobs={knobs} body={body} extra={page => <>{extra(page)}{modeKey}</>} deps={[slot.name, slot.note, slot.level, z]} />;
}
export default memo(SirenPanel);
