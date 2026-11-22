import { memo, useContext, useState } from "react";
import { HarmonyContext } from "@/components/harmonyKnob";
import { harmonyOn } from "@/audio/harmony";
import { Tap } from "@/pixel/PixelScreen";
import { Panel, type Knob } from "@/components/pixelScreens";
import { pkey } from "@/components/HwScreens";
import { NOTE_NAMES, RATES, SCALES, degreeCount, midiOf, spreadDeg, noteName, randomizeArp, PHRASE_DIRS, type ArpParams, type PhraseCharacter, type ArpStep, type RateName, type ScaleName } from "@/audio/arp";

type Props = { arp: ArpParams; slotName: string; onChange: (arp: ArpParams) => void; note?: number; onNote?: (n: number) => void; noteOf?: (deg: number) => number; character?: PhraseCharacter };
const RT = Object.keys(RATES) as RateName[];

function ArpEditor({ arp: arp0, slotName, onChange: onArp, note, onNote, noteOf, character }: Props) {
  // The pad NOTE is the phrase root: ROOT/OCT read and write it, so there is one place to set it.
  const arp = note === undefined ? arp0 : { ...arp0, root: note % 12, octave: Math.floor(note / 12) - 1 };
  const onChange = (a: ArpParams) => { if (onNote && note !== undefined && (a.root !== arp.root || a.octave !== arp.octave)) onNote((a.octave + 1) * 12 + a.root); onArp({ ...a, root: a.root, octave: a.octave }); };
  const h = useContext(HarmonyContext), scl = harmonyOn(h) ? h.scale : arp.scale, spr = arp.spread ?? .5;
  const nm = (deg: number) => noteName(noteOf ? noteOf(deg) : midiOf(arp, deg));
  const live = (d: number) => spreadDeg(d, spr);
  const [sel, setSel] = useState(0);
  const set = (p: Partial<ArpParams>) => onChange({ ...arp, ...p });
  const span = degreeCount(scl), si = Math.min(sel, arp.steps - 1), cur = arp.cells[si];
  const setCell = (p: Partial<ArpStep>) => set({ cells: arp.cells.map((c, j) => (j === si ? { ...c, ...p } : c)) });
  const W = Math.floor(128 / arp.steps); const step = arp.mode === "step";
  const dirI = Math.max(0, PHRASE_DIRS.indexOf(arp.dir ?? "fwd")), DIRN = ["UP", "DOWN", "U/D1", "U/D2", "RND"];
  const rateK: Knob = arp.sync
    ? { label: "Phrase rate", short: "RATE", value: RT.indexOf(arp.rate), min: 0, max: RT.length - 1, step: 1, fmt: v => RT[v], set: v => set({ rate: RT[v] }) }
    : { label: "Phrase free time", short: "MS", value: arp.freeMs, min: 40, max: 1000, step: 1, fmt: v => `${v}MS`, set: freeMs => set({ freeMs }) };
  // Two flat pages: RUN (steps + timing), PATT (key, length, looping).
  const knobs = (page: string): Knob[] => page === "RUN" ? [
    { label: "Step pitch", short: "NOTE", value: Math.min(cur.deg, span - 1), min: 0, max: span - 1, step: 1, fmt: v => nm(v), set: deg => setCell({ deg, on: true }) },
    { label: "Step velocity", short: "VEL", value: cur.vel, min: .05, max: 1, step: .01, fmt: v => `${Math.round(v * 126) + 1}`, set: vel => setCell({ vel }) },
    { label: "Step gate", short: "GATE", value: cur.gate, min: .05, max: 1, step: .01, fmt: v => `${Math.round(v * 100)}%`, set: gate => setCell({ gate }) },
    rateK,
    { label: "Phrase glide time", short: "GLID", value: arp.glide ?? 80, min: 10, max: 400, step: 5, fmt: v => `${v}MS`, set: glide => set({ glide }) },
  ] : [
    { label: "Phrase octave", short: "OCT", value: arp.octave, min: 0, max: 6, step: 1, fmt: v => `OCT${Math.round(v)}`, reset: 3, set: octave => set({ octave: Math.round(octave) }) },
    { label: "Phrase spread", short: "SPRD", value: spr, min: 0, max: 1, step: .01, fmt: v => `${Math.round(v * 200)}%`, reset: .5, set: spread => set({ spread }) },
    { label: "Phrase steps", short: "STPS", value: arp.steps, min: 1, max: 16, step: 1, fmt: String, set: steps => set({ steps }) },
    { label: "Phrase direction", short: "DIR", value: dirI, min: 0, max: PHRASE_DIRS.length - 1, step: 1, fmt: v => DIRN[Math.round(v)], reset: 0, set: v => set({ dir: PHRASE_DIRS[Math.round(v)] }) },
  ];
  type Key = [string, string, number, boolean, () => void];
  const keysFor = (page: string): Key[] => page === "RUN" ? [
    // Lit key = phrase on; its label shows the play mode chosen on LOOP (RUN or STEP).
    [arp.on ? (step ? "STEP" : "RUN") : "OFF", "Phrase on", 1, arp.on, () => set({ on: !arp.on })],
    ["RAND", "Randomize phrase", 33, false, () => onChange(randomizeArp(arp, Math.random, character))],
    ["SLIDE", "Step slide", 65, !!cur.slide, () => setCell({ slide: !cur.slide, on: true })],
    [arp.sync ? "SYNC" : "FREE", "Phrase sync", 97, arp.sync, () => set({ sync: !arp.sync })],
  ] : page === "PATT" ? [
    [step ? "STEP" : "RUN", "Phrase play mode", 1, step, () => set({ mode: step ? "run" : "step" })],
    ["CHRD", "Lock phrase to chord notes", 97, !!arp.chordSync, () => set({ chordSync: !arp.chordSync })],
  ] : [];
  return <div className="node-body arp-body">
    <Panel compactReadout name="PHRASE" label="Phrase sequencer" pages={["RUN", "PATT"]} deps={[JSON.stringify(arp), si, slotName, h.key, h.scale]} knobs={knobs}
      body={(p, page) => {
        if (page === "RUN") {
          arp.cells.slice(0, arp.steps).forEach((c, i) => {
            const x = i * W, h = Math.max(1, Math.min(20, Math.round((live(c.deg) + 1) / span * 18)));
            if (i === si) p.box(x, 21, W, 21);
            if (c.on) { p.rect(x + 2, 40 - h, W - 4, h); if (c.slide && i > 0) p.dot(x, 40 - h); } else p.dot(x + Math.floor(W / 2), 39);
          });
          keysFor(page).forEach(([s, , x, on]) => pkey(p, s, x, 11, 30, on));

        } else {
          keysFor(page).forEach(([s, , x, on]) => pkey(p, s, x, 11, 30, on));
          p.text(`${harmonyOn(h) ? `KEY ${NOTE_NAMES[h.key]}` : NOTE_NAMES[arp.root]} ${scl.toUpperCase()} OCT${arp.octave}`.slice(0, 31), 2, 22);
          p.text(`${step ? "EACH HIT: NEXT" : `HOLD ${slotName}`} ${DIRN[dirI]}`.slice(0, 31), 2, 30);
          arp.cells.slice(0, arp.steps).forEach((c, i) => { const x = i * W, hh = Math.max(1, Math.min(8, Math.round((live(c.deg) + 1) / span * 8))); if (c.on) p.rect(x + 1, 43 - hh, W - 2, hh); });
        }
      }}
      extra={page => page === "RUN"
        ? arp.cells.slice(0, arp.steps).map((c, i) => <Tap key={i} x={i * W} y={21} w={W} h={21} label={`Step ${i + 1} ${c.on ? nm(live(c.deg)) : "rest"}`} pressed={i === si} onClick={() => (i === si ? set({ cells: arp.cells.map((x, j) => (j === i ? { ...x, on: !x.on } : x)) }) : setSel(i))} />).concat(keysFor(page).map(([s, l, x, on, fn]) => <Tap key={l} x={x} y={11} w={30} h={9} label={l} pressed={on} onClick={fn} />))
        : keysFor(page).map(([s, l, x, on, fn]) => <Tap key={l} x={x} y={11} w={30} h={9} label={l} pressed={on} onClick={fn} />)} />
  </div>;
}

export default memo(ArpEditor);
