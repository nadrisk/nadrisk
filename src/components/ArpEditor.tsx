import { memo, useState } from "react";
import { Tap } from "@/pixel/PixelScreen";
import { Panel, type Knob } from "@/components/pixelScreens";
import { pkey } from "@/components/HwScreens";
import { NOTE_NAMES, RATES, SCALES, degreeCount, midiOf, noteName, phraseOrder, randomizeArp, type ArpParams, type ArpStep, type RateName, type ScaleName } from "@/audio/arp";

type Props = { arp: ArpParams; slotName: string; onChange: (arp: ArpParams) => void };
const SC: ScaleName[] = ["major", "minor", "pent maj", "pent min", "dorian", "phrygian", "lydian", "mixolydian", "harm min", "chromatic"];
const RT = Object.keys(RATES) as RateName[];

function ArpEditor({ arp, slotName, onChange }: Props) {
  const [sel, setSel] = useState(0);
  const set = (p: Partial<ArpParams>) => onChange({ ...arp, ...p });
  const span = degreeCount(arp.scale), si = Math.min(sel, arp.steps - 1), cur = arp.cells[si];
  const setCell = (p: Partial<ArpStep>) => set({ cells: arp.cells.map((c, j) => (j === si ? { ...c, ...p } : c)) });
  const W = Math.floor(128 / arp.steps), lp = arp.loop ?? { where: "first" as const, len: 2, times: 1 }, step = arp.mode === "step";
  const looped = (i: number) => lp.times > 1 && (lp.where === "first" ? i < lp.len : i >= arp.steps - lp.len);
  const knobs = (page: string): Knob[] => page === "SEQ" ? [
    { label: "Step pitch", short: "NOTE", value: Math.min(cur.deg, span - 1), min: 0, max: span - 1, step: 1, fmt: v => noteName(midiOf(arp, v)), set: deg => setCell({ deg, on: true }) },
    { label: "Step velocity", short: "VEL", value: cur.vel, min: .05, max: 1, step: .01, fmt: v => `${Math.round(v * 100)}`, set: vel => setCell({ vel }) },
    { label: "Step gate", short: "GATE", value: cur.gate, min: .05, max: 1, step: .01, fmt: v => `${Math.round(v * 100)}%`, set: gate => setCell({ gate }) },
  ] : page === "LOOP" ? [
    { label: "Phrase loop length", short: "LEN", value: Math.min(lp.len, arp.steps), min: 1, max: Math.min(8, arp.steps), step: 1, fmt: String, set: len => set({ loop: { ...lp, len } }) },
    { label: "Phrase loop times", short: "TIME", value: lp.times, min: 1, max: 4, step: 1, fmt: v => (v <= 1 ? "OFF" : `X${v}`), set: times => set({ loop: { ...lp, times } }) },
  ] : page === "KEY" ? [
    { label: "Phrase root", short: "ROOT", value: arp.root, min: 0, max: 11, step: 1, fmt: v => NOTE_NAMES[v], set: root => set({ root }) },
    { label: "Phrase scale", short: "SCL", value: SC.indexOf(arp.scale), min: 0, max: SC.length - 1, step: 1, fmt: v => SC[v].toUpperCase(), set: v => set({ scale: SC[v] }) },
    { label: "Phrase octave", short: "OCT", value: arp.octave, min: 1, max: 5, step: 1, fmt: String, set: octave => set({ octave }) },
    { label: "Phrase steps", short: "STPS", value: arp.steps, min: 1, max: 16, step: 1, fmt: String, set: steps => set({ steps }) },
  ] : [arp.sync
    ? { label: "Phrase rate", short: "RATE", value: RT.indexOf(arp.rate), min: 0, max: RT.length - 1, step: 1, fmt: v => RT[v], set: v => set({ rate: RT[v] }) }
    : { label: "Phrase free time", short: "MS", value: arp.freeMs, min: 40, max: 1000, step: 1, fmt: v => `${v}MS`, set: freeMs => set({ freeMs }) },
    { label: "Phrase glide time", short: "GLID", value: arp.glide ?? 80, min: 10, max: 400, step: 5, fmt: v => `${v}MS`, set: glide => set({ glide }) }];
  type Key = [string, string, number, boolean, () => void];
  const keysFor = (page: string): Key[] => page === "SEQ" ? [
    // Lit key = phrase on; its label shows the play mode chosen on LOOP (RUN or STEP).
    [arp.on ? (step ? "STEP" : "RUN") : "OFF", "Phrase on", 1, arp.on, () => set({ on: !arp.on })],
    ["RAND", "Randomize phrase", 33, false, () => onChange(randomizeArp(arp))],
    ["SLIDE", "Step slide", 65, !!cur.slide, () => setCell({ slide: !cur.slide, on: true })],
  ] : page === "LOOP" ? [
    [step ? "STEP" : "RUN", "Phrase play mode", 1, step, () => set({ mode: step ? "run" : "step" })],
    [lp.where === "first" ? "FIRST" : "LAST", "Phrase loop position", 33, lp.times > 1, () => set({ loop: { ...lp, where: lp.where === "first" ? "last" : "first" } })],
  ] : page === "KEY" ? []
    : [[arp.sync ? "SYNC" : "FREE", "Phrase sync", 1, arp.sync, () => set({ sync: !arp.sync })]];
  return <div className="node-body arp-body">
    <Panel name="PHRASE" label="Phrase sequencer" pages={["SEQ", "LOOP", "KEY", "TIM"]} deps={[JSON.stringify(arp), si, slotName]} knobs={knobs}
      body={(p, page) => {
        if (page === "SEQ") {
          arp.cells.slice(0, arp.steps).forEach((c, i) => {
            const x = i * W, h = Math.max(1, Math.round((Math.min(c.deg, span - 1) + 1) / span * 18));
            if (i === si) p.box(x, 21, W, 21);
            if (c.on) { p.rect(x + 2, 40 - h, W - 4, h); if (c.slide && i > 0) p.dot(x, 40 - h); } else p.dot(x + Math.floor(W / 2), 39);
            if (looped(i)) p.rect(x + 1, 41, W - 2, 1);
          });
          keysFor(page).forEach(([s, , x, on]) => pkey(p, s, x, 11, 30, on));
          p.text(cur.on ? noteName(midiOf(arp, Math.min(cur.deg, span - 1))) : "REST", 100, 12);
        } else {
          keysFor(page).forEach(([s, , x, on]) => pkey(p, s, x, 11, 30, on));
          if (page === "LOOP") {
            p.text(`${step ? "EACH HIT = NEXT" : "HOLD TO RUN"} ${phraseOrder(arp).length}ST`.slice(0, 31), 2, 24);
            arp.cells.slice(0, arp.steps).forEach((c, i) => { const x = i * W; if (looped(i)) p.rect(x + 1, 33, W - 2, 6); else if (c.on) p.rect(x + 1, 37, W - 2, 2); });
            return;
          }
          p.text(page === "KEY" ? `${NOTE_NAMES[arp.root]} ${arp.scale.toUpperCase()} OCT${arp.octave}` : arp.sync ? `RATE ${arp.rate}` : `FREE ${arp.freeMs}MS`, 2, 25);
          p.text((!arp.on ? "OFF: TURN ON IN SEQ" : step ? "STEP: EACH HIT = NEXT" : `RUN: HOLD ${slotName}`).slice(0, 31), 2, 34);
        }
      }}
      extra={page => page === "SEQ"
        ? arp.cells.slice(0, arp.steps).map((c, i) => <Tap key={i} x={i * W} y={21} w={W} h={21} label={`Step ${i + 1} ${c.on ? noteName(midiOf(arp, Math.min(c.deg, span - 1))) : "rest"}`} pressed={i === si} onClick={() => (i === si ? set({ cells: arp.cells.map((x, j) => (j === i ? { ...x, on: !x.on } : x)) }) : setSel(i))} />).concat(keysFor(page).map(([s, l, x, on, fn]) => <Tap key={l} x={x} y={11} w={30} h={9} label={l} pressed={on} onClick={fn} />))
        : keysFor(page).map(([s, l, x, on, fn]) => <Tap key={l} x={x} y={11} w={30} h={9} label={l} pressed={on} onClick={fn} />)} />
  </div>;
}

export default memo(ArpEditor);
