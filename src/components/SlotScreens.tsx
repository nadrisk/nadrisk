import { useState } from "react";
import { Tap, Zone } from "@/pixel/PixelScreen";
import type { Px } from "@/pixel/draw";
import { Panel, type Knob } from "@/components/pixelScreens";
import { CHORDS, type ChordArp, type ChordPlay } from "@/audio/musical";
import { RATES, type RateName } from "@/audio/arp";
import type { EngineKind, Slot } from "@/hooks/useGroovebox";

const key = (p: Px, s: string, x: number, y: number, w: number, on: boolean) => { if (on) { p.rect(x, y, w, 9); p.text(s, x + Math.round((w - s.length * 4) / 2) + 1, y + 2, false); } else { p.box(x, y, w, 9); p.text(s, x + Math.round((w - s.length * 4) / 2) + 1, y + 2); } };
const ENG: [EngineKind, string][] = [["drum", "DRM"], ["synth", "SYN"], ["sampler", "SMP"], ["poly", "PLY"], ["808", "808"], ["siren", "SRN"]];
const CH = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-";

export function SlotScreen({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const [cur, setCur] = useState(0);
  const name = slot.name.padEnd(10, " ").slice(0, 10);
  const ci = Math.max(0, CH.indexOf(name[cur]));
  const knobs: Knob[] = slot.engine === "sampler" ? [] : [
    { label: "Volume", short: "VOL", value: slot.level, min: 0, max: 100, step: 1, fmt: v => `${v}%`, set: level => onChange({ level }) },
    { label: "Pan", short: "PAN", value: slot.pan, min: -1, max: 1, step: .01, fmt: v => (v === 0 ? "C" : v < 0 ? `L${Math.round(-v * 100)}` : `R${Math.round(v * 100)}`), set: pan => onChange({ pan }) },
  ];
  return <Panel name="SLOT" label="Slot" pages={["SET"]} deps={[slot.name, slot.engine, slot.mute, slot.choke, slot.level, slot.pan, cur]} knobs={() => knobs}
    body={p => {
      ENG.forEach(([e, s], i) => key(p, s, 1 + i * 21, 11, 21, slot.engine === e));
      [...name].forEach((c, i) => { const x = 2 + i * 6; if (i === cur) { p.rect(x - 1, 22, 6, 9); p.text(c, x, 24, false); } else p.text(c, x, 24); });
      key(p, slot.mute ? "MUTED" : "MUTE", 64, 22, 30, slot.mute);
      key(p, slot.choke ? `CHK${slot.choke}` : "CHK-", 96, 22, 31, slot.choke > 0);
      if (!knobs.length) p.text("LEVEL ON SMP PAGE", 2, 50);
    }}
    extra={() => <>
      {ENG.map(([e], i) => <Tap key={e} x={1 + i * 21} y={11} w={21} h={9} label={`Instrument ${e}`} pressed={slot.engine === e} onClick={() => onChange({ engine: e })} />)}
      {[...name].map((_, i) => <Tap key={i} x={1 + i * 6} y={22} w={6} h={9} label={`Name character ${i + 1}`} pressed={i === cur} onClick={() => setCur(i)} />)}
      <Zone x={0} y={32} w={62} h={10} label="Name letter" value={ci} min={0} max={CH.length - 1} horizontal onChange={v => { const a = [...name]; a[cur] = CH[v]; onChange({ name: a.join("").trimEnd() }); }} />
      <Tap x={64} y={22} w={30} h={9} label="Mute" pressed={slot.mute} onClick={() => onChange({ mute: !slot.mute })} />
      <Tap x={96} y={22} w={31} h={9} label="Choke group" onClick={() => onChange({ choke: (slot.choke + 1) % 5 })} />
    </>} />;
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
  const eq = slot.eq, set = (x: Partial<Slot["eq"]>) => onChange({ eq: { ...eq, ...x } });
  const knobs: Knob[] = [
    { label: "Low 100 Hz EQ", short: "LOW", value: eq.low, min: -15, max: 15, step: .5, fmt: v => `${v > 0 ? "+" : ""}${v}DB`, set: low => set({ low }) },
    { label: "Mid EQ", short: "MID", value: eq.mid, min: -15, max: 15, step: .5, fmt: v => `${v > 0 ? "+" : ""}${v}DB`, set: mid => set({ mid }) },
    { label: "Mid frequency", short: "FREQ", value: eq.midFreq, min: 200, max: 6000, step: 10, fmt: v => `${Math.round(v)}HZ`, set: midFreq => set({ midFreq }) },
    { label: "High 9 kHz EQ", short: "HIGH", value: eq.high, min: -15, max: 15, step: .5, fmt: v => `${v > 0 ? "+" : ""}${v}DB`, set: high => set({ high }) },
  ];
  return <Panel name="INSERT" label="Channel EQ insert" pages={["EQ"]} deps={[eq.low, eq.mid, eq.midFreq, eq.high]} knobs={() => knobs}
    body={p => {
      const gains = [eq.low, eq.mid, eq.high], centers = [20, 65, 111]; let px = 5, py = 29;
      for (let x = 5; x < 124; x++) { let y = 29; centers.forEach((c, i) => { y -= gains[i] * Math.max(0, 1 - Math.abs(x - c) / 25) * .65; }); p.line(px, py, x, Math.max(12, Math.min(41, Math.round(y)))); px = x; py = Math.max(12, Math.min(41, Math.round(y))); }
      p.line(4, 29, 124, 29, true); p.text("100", 4, 12); p.text(`${Math.round(eq.midFreq)}`, 50, 12); p.text("9K", 112, 12);
    }} />;
}
