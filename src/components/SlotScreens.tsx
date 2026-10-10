import { useState } from "react";
import { createPortal } from "react-dom";
import { Tap } from "@/pixel/PixelScreen";
import type { Px } from "@/pixel/draw";
import { Panel, type Knob } from "@/components/pixelScreens";
import { CHORDS, type ChordArp, type ChordPlay } from "@/audio/musical";
import { RATES, type RateName } from "@/audio/arp";
import type { EngineKind, Slot } from "@/hooks/useGroovebox";

const key = (p: Px, s: string, x: number, y: number, w: number, on: boolean) => { if (on) { p.rect(x, y, w, 9); p.text(s, x + Math.round((w - s.length * 4) / 2) + 1, y + 2, false); } else { p.box(x, y, w, 9); p.text(s, x + Math.round((w - s.length * 4) / 2) + 1, y + 2); } };
const ENG: [EngineKind, string][] = [["drum", "DRM"], ["synth", "SYN"], ["sampler", "SMP"], ["poly", "PLY"], ["808", "808"], ["siren", "SRN"]];

function RenameDialog({ value, onClose, onSave }: { value: string; onClose: () => void; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9 \-]/g, "").slice(0, 10);
  const submit = () => { const c = v.trimEnd(); if (c) onSave(c); onClose(); };
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4" onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={e => { e.preventDefault(); submit(); }}
        className="w-full max-w-sm border-4 border-foreground bg-background text-foreground"
        style={{ fontFamily: "Silkscreen, monospace", imageRendering: "pixelated" }}>
        <div className="flex items-center justify-between bg-foreground px-3 py-1 text-background text-sm uppercase tracking-widest">
          <span>Rename slot</span><span>{v.length}/10</span>
        </div>
        <div className="p-4 space-y-4">
          <input autoFocus value={v} maxLength={10} aria-label="Slot name"
            onChange={e => setV(clean(e.target.value))}
            onKeyDown={e => { if (e.key === "Escape") onClose(); }}
            onFocus={e => e.currentTarget.select()}
            className="w-full border-2 border-foreground bg-background px-3 py-2 text-2xl uppercase tracking-[0.2em] text-foreground outline-none caret-foreground focus:bg-foreground/10"
            style={{ fontFamily: "Silkscreen, monospace", borderRadius: 0 }} />
          <div className="grid grid-cols-2 gap-3 text-sm uppercase tracking-widest">
            <button type="button" onClick={onClose} className="border-2 border-foreground py-2 hover:bg-foreground/10">Cancel</button>
            <button type="submit" className="border-2 border-foreground bg-foreground py-2 text-background">OK</button>
          </div>
        </div>
      </form>
    </div>, document.body);
}

export function SlotScreen({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const name = slot.name.padEnd(10, " ").slice(0, 10);
  const [renaming, setRenaming] = useState(false);
  const knobs: Knob[] = slot.engine === "sampler" ? [] : [
    { label: "Volume", short: "VOL", value: slot.level, min: 0, max: 100, step: 1, fmt: v => `${v}%`, set: level => onChange({ level }) },
    { label: "Pan", short: "PAN", value: slot.pan, min: -1, max: 1, step: .01, fmt: v => (v === 0 ? "C" : v < 0 ? `L${Math.round(-v * 100)}` : `R${Math.round(v * 100)}`), set: pan => onChange({ pan }) },
  ];
  return <>
    <Panel name="SLOT" label="Slot" pages={["SET"]} deps={[slot.name, slot.engine, slot.mute, slot.choke, slot.level, slot.pan]} knobs={() => knobs}
    body={p => {
      ENG.forEach(([e, s], i) => key(p, s, 1 + i * 21, 11, 21, slot.engine === e));
      p.box(1, 22, 62, 9);
      p.text(name.trimEnd() || "—", 4, 24);
      key(p, slot.mute ? "MUTED" : "MUTE", 64, 22, 31, slot.mute);
      key(p, slot.choke ? `CHK${slot.choke}` : "CHK-", 96, 22, 31, slot.choke > 0);
      if (!knobs.length) p.text("LEVEL ON SMP PAGE", 2, 36);
    }}
    extra={() => <>
      {ENG.map(([e], i) => <Tap key={e} x={1 + i * 21} y={11} w={21} h={9} label={`Instrument ${e}`} pressed={slot.engine === e} onClick={() => onChange({ engine: e })} />)}
      <Tap x={1} y={22} w={62} h={9} label="Rename slot" onClick={() => setRenaming(true)} />
      <Tap x={64} y={22} w={31} h={9} label="Mute" pressed={slot.mute} onClick={() => onChange({ mute: !slot.mute })} />
      <Tap x={96} y={22} w={31} h={9} label="Choke group" onClick={() => onChange({ choke: (slot.choke + 1) % 5 })} />
    </>} />
    {renaming && <RenameDialog value={slot.name} onClose={() => setRenaming(false)} onSave={n => onChange({ name: n })} />}
  </>;
}

const VOI = Object.keys(CHORDS) as (keyof typeof CHORDS)[];
const RT = Object.keys(RATES) as RateName[];
const ORD: ChordArp[] = ["up", "down", "updown", "random"];
const PLAY: ChordPlay[] = ["block", "strum", "arp"];

export function ChordScreen({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const c = slot.chord, set = (x: Partial<Slot["chord"]>) => onChange({ chord: { ...c, ...x } });
  const play = c.play ?? "block", ord = c.arp ?? "up";
  const knobs: Knob[] = [
    { label: "Chord voicing", short: "VOI", value: Math.max(0, VOI.indexOf(c.type)), min: 0, max: VOI.length - 1, step: 1, fmt: v => String(VOI[v]).toUpperCase(), set: v => set({ type: VOI[v] }) },
    { label: "Chord inversion", short: "INV", value: c.inversion, min: 0, max: 2, step: 1, fmt: v => String(v), set: v => set({ inversion: v }) },
    { label: "Strum time", short: "STRM", value: c.strum ?? 30, min: 5, max: 150, step: 1, fmt: v => `${v}MS`, set: v => set({ strum: v }) },
    { label: "Chord arp rate", short: "RATE", value: Math.max(0, RT.indexOf(c.rate ?? "1/16")), min: 0, max: RT.length - 1, step: 1, fmt: v => RT[v], set: v => set({ rate: RT[v] }) },
  ];
  return <Panel name="CHORD" label="Chord pad" pages={["CHD"]} deps={[JSON.stringify(c)]} knobs={() => knobs}
    body={p => {
      key(p, c.on ? "ON" : "OFF", 1, 11, 20, c.on);
      key(p, "SPRD", 23, 11, 22, c.spread);
      PLAY.forEach((m, i) => key(p, m.slice(0, 4).toUpperCase(), 47 + i * 27, 11, 26, play === m));
      p.text(String(c.type).toUpperCase().slice(0, 12), 2, 24);
      p.text(`INV ${c.inversion}`, 52, 24);
      key(p, ord.slice(0, 4).toUpperCase(), 94, 22, 33, play === "arp");
    }}
    extra={() => <>
      <Tap x={1} y={11} w={20} h={9} label="Chord on" pressed={c.on} onClick={() => set({ on: !c.on })} />
      <Tap x={23} y={11} w={22} h={9} label="Chord spread" pressed={c.spread} onClick={() => set({ spread: !c.spread })} />
      {PLAY.map((m, i) => <Tap key={m} x={47 + i * 27} y={11} w={26} h={9} label={`Chord play ${m}`} pressed={play === m} onClick={() => set({ play: m })} />)}
      <Tap x={94} y={22} w={33} h={9} label="Chord arp order" onClick={() => set({ arp: ORD[(ORD.indexOf(ord) + 1) % ORD.length] })} />
    </>} />;
}

export function ChannelEqScreen({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const eq = { q: 1, ...slot.eq }, set = (x: Partial<Slot["eq"]>) => onChange({ eq: { ...eq, ...x } });
  const gainKnobs: Knob[] = [
    { label: "Low 100 Hz EQ", short: "LOW", value: eq.low, min: -15, max: 15, step: .5, fmt: v => `${v > 0 ? "+" : ""}${v}DB`, set: low => set({ low }) },
    { label: "Mid EQ", short: "MID", value: eq.mid, min: -15, max: 15, step: .5, fmt: v => `${v > 0 ? "+" : ""}${v}DB`, set: mid => set({ mid }) },
    { label: "High 9 kHz EQ", short: "HIGH", value: eq.high, min: -15, max: 15, step: .5, fmt: v => `${v > 0 ? "+" : ""}${v}DB`, set: high => set({ high }) },
  ];
  const midKnobs: Knob[] = [
    { label: "Mid frequency", short: "FREQ", value: eq.midFreq, min: 200, max: 6000, step: 10, fmt: v => `${Math.round(v)}HZ`, set: midFreq => set({ midFreq }) },
    { label: "Mid Q", short: "Q", value: eq.q, min: .3, max: 8, step: .1, fmt: v => v.toFixed(1), set: q => set({ q }) },
  ];
  return <Panel name="INSERT" label="Channel EQ insert" pages={["LVL", "MID"]} deps={[eq.low, eq.mid, eq.midFreq, eq.q, eq.high]} knobs={page => page === "LVL" ? gainKnobs : midKnobs}
    body={p => {
      const xOf = (hz: number) => 4 + Math.log10(hz / 20) / 3 * 120;
      const midX = xOf(eq.midFreq), sigma = Math.max(2.5, 18 / Math.sqrt(eq.q)); let px = 4, py = 30;
      for (let x = 4; x <= 124; x++) {
        const lo = eq.low / (1 + Math.exp((x - xOf(100)) / 5));
        const hi = eq.high / (1 + Math.exp((xOf(9000) - x) / 5));
        const mid = eq.mid * Math.exp(-.5 * ((x - midX) / sigma) ** 2);
        const y = Math.max(17, Math.min(43, Math.round(30 - (lo + mid + hi) * .72)));
        p.line(px, py, x, y); px = x; py = y;
      }
      p.line(4, 30, 124, 30, true); p.text("20", 4, 12); p.text(`${eq.midFreq >= 1000 ? `${(eq.midFreq / 1000).toFixed(1)}K` : Math.round(eq.midFreq)}`, Math.max(45, Math.min(94, Math.round(midX - 8))), 12); p.text("20K", 112, 12);
    }} />;
}
