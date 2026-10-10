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
  const setChar = (next: number) => { const a = [...name]; a[cur] = CH[(next + CH.length) % CH.length]; onChange({ name: a.join("").trimEnd() }); };
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
      key(p, "<", 2, 34, 14, false); key(p, name[cur] === " " ? "SPC" : name[cur], 18, 34, 26, true); key(p, ">", 46, 34, 14, false);
      p.text(`CHAR ${cur + 1}/10`, 66, 36);
      if (!knobs.length) p.text("LEVEL ON SMP PAGE", 2, 50);
    }}
    extra={() => <>
      {ENG.map(([e], i) => <Tap key={e} x={1 + i * 21} y={11} w={21} h={9} label={`Instrument ${e}`} pressed={slot.engine === e} onClick={() => onChange({ engine: e })} />)}
      {[...name].map((_, i) => <Tap key={i} x={1 + i * 6} y={22} w={6} h={9} label={`Name character ${i + 1}`} pressed={i === cur} onClick={() => setCur(i)} />)}
      <Tap x={2} y={34} w={14} h={9} label="Previous name letter" onClick={() => setChar(ci - 1)} />
      <Zone x={18} y={34} w={26} h={9} label="Name letter" value={ci} min={0} max={CH.length - 1} step={1} horizontal onChange={setChar} />
      <Tap x={46} y={34} w={14} h={9} label="Next name letter" onClick={() => setChar(ci + 1)} />
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
  return <Panel name="INSERT" label="Channel EQ insert" pages={["GAIN", "MID"]} deps={[eq.low, eq.mid, eq.midFreq, eq.q, eq.high]} knobs={page => page === "GAIN" ? gainKnobs : midKnobs}
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
      p.line(4, 30, 124, 30, true); p.text("20", 4, 12); p.text(`${eq.midFreq >= 1000 ? `${(eq.midFreq / 1000).toFixed(1)}K` : Math.round(eq.midFreq)}`, Math.max(45, Math.min(98, Math.round(midX - 8))), 12); p.text("20K", 112, 12);
    }} />;
}
