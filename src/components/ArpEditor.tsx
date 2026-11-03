import { memo, useState } from "react";
import { Tap } from "@/pixel/PixelScreen";
import { Panel, type Knob } from "@/components/pixelScreens";
import { pkey } from "@/components/HwScreens";
import { NOTE_NAMES, RATES, SCALES, degreeCount, midiOf, noteName, phraseOrder, randomizeArp, trancePhrase, defaultTrance, TRANCE_PATTERNS, INTV_NAMES, applyEucl, defaultEucl, euclid, type ArpParams, type ArpStep, type RateName, type ScaleName } from "@/audio/arp";

type Props = { arp: ArpParams; slotName: string; onChange: (arp: ArpParams) => void; note?: number; onNote?: (n: number) => void; noteOf?: (deg: number) => number };
const SC: ScaleName[] = ["major", "minor", "pent maj", "pent min", "dorian", "phrygian", "lydian", "mixolydian", "harm min", "chromatic"];
const RT = Object.keys(RATES) as RateName[];

function ArpEditor({ arp: arp0, slotName, onChange: onArp, note, onNote, noteOf }: Props) {
  // The pad NOTE is the phrase root: ROOT/OCT read and write it, so there is one place to set it.
  const arp = note === undefined ? arp0 : { ...arp0, root: note % 12, octave: Math.floor(note / 12) - 1 };
  const onChange = (a: ArpParams) => { if (onNote && note !== undefined && (a.root !== arp.root || a.octave !== arp.octave)) onNote((a.octave + 1) * 12 + a.root); onArp({ ...a, root: a.root, octave: a.octave }); };
  const nm = (deg: number) => noteName(noteOf ? noteOf(deg) : midiOf(arp, deg));
  const [sel, setSel] = useState(0);
  const set = (p: Partial<ArpParams>) => onChange({ ...arp, ...p });
  const span = degreeCount(arp.scale), si = Math.min(sel, arp.steps - 1), cur = arp.cells[si];
  const setCell = (p: Partial<ArpStep>) => set({ cells: arp.cells.map((c, j) => (j === si ? { ...c, ...p } : c)) });
  const W = Math.floor(128 / arp.steps), lp = arp.loop ?? { where: "first" as const, len: 2, times: 1 }, step = arp.mode === "step";
  const looped = (i: number) => lp.times > 1 && (lp.where === "first" ? i < lp.len : i >= arp.steps - lp.len);
  const rateK: Knob = arp.sync
    ? { label: "Phrase rate", short: "RATE", value: RT.indexOf(arp.rate), min: 0, max: RT.length - 1, step: 1, fmt: v => RT[v], set: v => set({ rate: RT[v] }) }
    : { label: "Phrase free time", short: "MS", value: arp.freeMs, min: 40, max: 1000, step: 1, fmt: v => `${v}MS`, set: freeMs => set({ freeMs }) };
  // Three flat pages: RUN (steps + timing), PATT (key, length, looping), TRNC (trance writer).
  const knobs = (page: string): Knob[] => page === "TRNC" ? tranceKnobs : page === "EUCL" ? euclKnobs : page === "RUN" ? [
    { label: "Step pitch", short: "NOTE", value: Math.min(cur.deg, span - 1), min: 0, max: span - 1, step: 1, fmt: v => nm(v), set: deg => setCell({ deg, on: true }) },
    { label: "Step velocity", short: "VEL", value: cur.vel, min: .05, max: 1, step: .01, fmt: v => `${Math.round(v * 100)}`, set: vel => setCell({ vel }) },
    { label: "Step gate", short: "GATE", value: cur.gate, min: .05, max: 1, step: .01, fmt: v => `${Math.round(v * 100)}%`, set: gate => setCell({ gate }) },
    rateK,
    { label: "Phrase glide time", short: "GLID", value: arp.glide ?? 80, min: 10, max: 400, step: 5, fmt: v => `${v}MS`, set: glide => set({ glide }) },
  ] : [
    { label: "Phrase root", short: "ROOT", value: arp.root, min: 0, max: 11, step: 1, fmt: v => NOTE_NAMES[v], set: root => set({ root }) },
    { label: "Phrase scale", short: "SCL", value: SC.indexOf(arp.scale), min: 0, max: SC.length - 1, step: 1, fmt: v => SC[v].toUpperCase(), set: v => set({ scale: SC[v] }) },
    { label: "Phrase octave", short: "OCT", value: arp.octave, min: 0, max: 6, step: 1, fmt: String, set: octave => set({ octave }) },
    { label: "Phrase steps", short: "STPS", value: arp.steps, min: 1, max: 16, step: 1, fmt: String, set: steps => set({ steps }) },
    { label: "Phrase loop times", short: "LOOP", value: lp.times, min: 1, max: 4, step: 1, fmt: v => (v <= 1 ? "OFF" : `X${v}`), set: times => set({ loop: { ...lp, times } }) },
  ];
  const tr = { ...defaultTrance(), ...arp.trance }, trOn = !!arp.trance?.on;
  // TRANCE writes a classic 16-step phrase into the normal cells, so playback and editing stay the same.
  const setTr = (p: Partial<typeof tr>, force = false) => { const next = { ...tr, ...p };
    if (next.on || force) set({ trance: next, cells: trancePhrase(arp.scale, next), steps: 16, sync: true, rate: arp.sync ? arp.rate : "1/16", on: true }); else set({ trance: next }); };
  const tranceKnobs: Knob[] = [
    { label: "Trance pattern", short: "PATT", value: tr.pattern, min: 0, max: TRANCE_PATTERNS.length - 1, step: 1, fmt: v => TRANCE_PATTERNS[Math.round(v)], reset: 0, set: pattern => setTr({ pattern }) },
    { label: "Trance density", short: "DENS", value: tr.density, min: 0, max: 1, step: .01, fmt: v => `${Math.round(v * 100)}%`, reset: 1, set: density => setTr({ density }) },
    { label: "Trance upper note interval", short: "INTV", value: Math.min(3, tr.spread), min: 0, max: 3, step: 1, fmt: v => INTV_NAMES[Math.round(v)], reset: 0, set: spread => setTr({ spread }) },
    { label: "Trance gate", short: "GATE", value: tr.gate, min: .05, max: 1, step: .01, fmt: v => `${Math.round(v * 100)}%`, reset: .5, set: gate => setTr({ gate }) },
  ];
  // EUCL writes which phrase steps play (Bjorklund spread); the step notes stay as they are.
  const eu = { ...defaultEucl(), ...arp.eucl }, euOn = !!arp.eucl?.on;
  const setEu = (p: Partial<typeof eu>) => { const next = { ...eu, ...p }; next.hits = Math.min(next.hits, next.steps); if (next.on) onChange({ ...applyEucl(arp, next), on: true }); else set({ eucl: next }); };
  const euclKnobs: Knob[] = [
    { label: "Euclid hits", short: "HITS", value: eu.hits, min: 0, max: 16, step: 1, fmt: String, reset: 5, set: hits => setEu({ hits }) },
    { label: "Euclid steps", short: "STPS", value: eu.steps, min: 2, max: 16, step: 1, fmt: String, reset: 8, set: steps => setEu({ steps }) },
    { label: "Euclid rotation", short: "ROTN", value: eu.rot, min: 0, max: 15, step: 1, fmt: String, reset: 0, set: rot => setEu({ rot }) },
    { label: "Euclid gate", short: "GATE", value: eu.gate, min: .05, max: 1, step: .01, fmt: v => `${Math.round(v * 100)}%`, reset: .5, set: gate => setEu({ gate }) },
  ];
  type Key = [string, string, number, boolean, () => void];
  const keysFor = (page: string): Key[] => page === "RUN" ? [
    // Lit key = phrase on; its label shows the play mode chosen on LOOP (RUN or STEP).
    [arp.on ? (step ? "STEP" : "RUN") : "OFF", "Phrase on", 1, arp.on, () => set({ on: !arp.on })],
    ["RAND", "Randomize phrase", 33, false, () => onChange(randomizeArp(arp))],
    ["SLIDE", "Step slide", 65, !!cur.slide, () => setCell({ slide: !cur.slide, on: true })],
    [arp.sync ? "SYNC" : "FREE", "Phrase sync", 97, arp.sync, () => set({ sync: !arp.sync })],
  ] : page === "PATT" ? [
    [step ? "STEP" : "RUN", "Phrase play mode", 1, step, () => set({ mode: step ? "run" : "step" })],
    [lp.where === "first" ? "FIRST" : "LAST", "Phrase loop position", 33, lp.times > 1, () => set({ loop: { ...lp, where: lp.where === "first" ? "last" : "first" } })],
    [`LEN${Math.min(lp.len, arp.steps)}`, "Phrase loop length, tap for next", 65, lp.times > 1, () => set({ loop: { ...lp, len: (Math.min(lp.len, Math.min(8, arp.steps)) % Math.min(8, arp.steps)) + 1 } })],
  ] : page === "TRNC" ? [
    [trOn ? "ON" : "OFF", "Trance mode", 1, trOn, () => trOn ? setTr({ on: false }) : setTr({ on: true }, true)],
    ["GEN", "Write trance phrase", 33, false, () => setTr({}, true)],
  ] : page === "EUCL" ? [
    [euOn ? "ON" : "OFF", "Euclid mode", 1, euOn, () => setEu({ on: !euOn })],
  ] : [];
  return <div className="node-body arp-body">
    <Panel name="PHRASE" label="Phrase sequencer" pages={["RUN", "PATT", "TRNC", "EUCL"]} deps={[JSON.stringify(arp), si, slotName]} knobs={knobs}
      body={(p, page) => {
        if (page === "RUN") {
          arp.cells.slice(0, arp.steps).forEach((c, i) => {
            const x = i * W, h = Math.max(1, Math.round((Math.min(c.deg, span - 1) + 1) / span * 18));
            if (i === si) p.box(x, 21, W, 21);
            if (c.on) { p.rect(x + 2, 40 - h, W - 4, h); if (c.slide && i > 0) p.dot(x, 40 - h); } else p.dot(x + Math.floor(W / 2), 39);
            if (looped(i)) p.rect(x + 1, 41, W - 2, 1);
          });
          keysFor(page).forEach(([s, , x, on]) => pkey(p, s, x, 11, 30, on));

        } else {
          keysFor(page).forEach(([s, , x, on]) => pkey(p, s, x, 11, 30, on));
          if (page === "EUCL") {
            // Pulse ring: every step is a dot on the circle, hits are filled squares, the phrase start is marked.
            const ring = euclid(eu.hits, eu.steps, eu.rot), cx = 96, cy = 31, R = 12;
            p.text(`E(${Math.min(eu.hits, eu.steps)},${eu.steps})`, 34, 12); p.text(euOn ? "LIVE" : "OFF", 2, 24); p.text(`ROT ${eu.rot}`, 2, 32);
            ring.forEach((on, i) => { const a = -Math.PI / 2 + i / ring.length * Math.PI * 2, x = Math.round(cx + Math.cos(a) * R), y = Math.round(cy + Math.sin(a) * R); if (on) p.rect(x - 1, y - 1, 3, 3); else p.dot(x, y); if (i === 0) p.line(cx, cy, x, y, true); });
            p.text(`${Math.min(eu.hits, eu.steps)}/${eu.steps}`, 50, 32);
            return;
          }
          if (page === "TRNC") {
            p.text(`${TRANCE_PATTERNS[Math.round(tr.pattern)]} ${trOn ? "LIVE" : "OFF"}`, 68, 12);
            arp.cells.slice(0, arp.steps).forEach((c, i) => { const x = i * W, h = Math.max(1, Math.round((Math.min(c.deg, span - 1) + 1) / span * 16)); if (c.on) p.rect(x + 2, 40 - Math.round(h * c.gate) , W - 4, Math.max(1, Math.round(h * c.gate))); else p.dot(x + Math.floor(W / 2), 39); });
            return;
          }
          p.text(`${NOTE_NAMES[arp.root]} ${arp.scale.toUpperCase()} OCT${arp.octave}`.slice(0, 31), 2, 22);
          p.text(`${step ? "EACH HIT: NEXT" : `HOLD ${slotName}`} ${phraseOrder(arp).length}ST`.slice(0, 31), 2, 30);
          arp.cells.slice(0, arp.steps).forEach((c, i) => { const x = i * W; if (looped(i)) p.rect(x + 1, 38, W - 2, 5); else if (c.on) p.rect(x + 1, 41, W - 2, 2); });
        }
      }}
      extra={page => page === "RUN"
        ? arp.cells.slice(0, arp.steps).map((c, i) => <Tap key={i} x={i * W} y={21} w={W} h={21} label={`Step ${i + 1} ${c.on ? nm(Math.min(c.deg, span - 1)) : "rest"}`} pressed={i === si} onClick={() => (i === si ? set({ cells: arp.cells.map((x, j) => (j === i ? { ...x, on: !x.on } : x)) }) : setSel(i))} />).concat(keysFor(page).map(([s, l, x, on, fn]) => <Tap key={l} x={x} y={11} w={30} h={9} label={l} pressed={on} onClick={fn} />))
        : keysFor(page).map(([s, l, x, on, fn]) => <Tap key={l} x={x} y={11} w={30} h={9} label={l} pressed={on} onClick={fn} />)} />
  </div>;
}

export default memo(ArpEditor);
