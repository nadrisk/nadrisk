import { Tap } from "@/pixel/PixelScreen";
import type { Px } from "@/pixel/draw";
import { Panel, type Knob } from "@/components/pixelScreens";
import { ECHO_DIVS, type PerformanceParams } from "@/audio/performance";

const key = (p: Px, s: string, x: number, y: number, w: number, on: boolean) => { if (on) p.rect(x, y, w, 9); else p.box(x, y, w, 9); p.textC(s, x + w / 2, y + 2, !on); };
const pos = (x: number, y: number, w: number, h: number) => ({ left: `${x / 128 * 100}%`, top: `${y / 64 * 100}%`, width: `${w / 128 * 100}%`, height: `${h / 64 * 100}%` });
const STYLES: PerformanceParams["style"][] = ["sweep", "whiteout", "cyber"];
const CMODES = ["pad", "block", "strum", "arp"] as const;
const DIVS: [number, string][] = [[1, "1/4"], [.5, "1/8"], [.25, "1/16"], [.125, "1/32"]];
const LOOPS = [0, 1, 2, 4, 8];

export default function PerformanceRack({ value, onChange }: { value: PerformanceParams; onChange: (p: PerformanceParams) => void }) {
  const set = (patch: Partial<PerformanceParams>) => onChange({ ...value, ...patch });
  const v = value, dj = v.djSweep ?? 0;
  const hold = (mode: number, label: string, x: number, y: number, w: number) => <button key={label} className="px-zone" style={pos(x, y, w, 9)} aria-label={label} aria-pressed={v.mode === mode}
    onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); set({ mode }); }} onPointerUp={() => set({ mode: 0 })} onPointerCancel={() => set({ mode: 0 })} onLostPointerCapture={() => set({ mode: 0 })}
    onKeyDown={e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); set({ mode }); } }} onKeyUp={() => set({ mode: 0 })} onBlur={() => set({ mode: 0 })} />;
  const knobs = (page: string): Knob[] => page === "FX" ? [
    { label: "Global envelope time", short: "TIME", value: v.time, min: -1, max: 1, step: .01, fmt: x => `${Math.round(x * 100)}%`, set: time => set({ time }) },
    { label: "Tension", short: "TENS", value: v.tension, min: 0, max: 1, step: .01, fmt: x => `${Math.round(x * 100)}%`, set: tension => set({ tension }) },
    { label: "Performance DJ filter", short: "DJ", value: dj, min: -1, max: 1, step: .01, fmt: x => (x === 0 ? "OFF" : x < 0 ? `LP${Math.round(-x * 100)}` : `HP${Math.round(x * 100)}`), set: djSweep => set({ djSweep }) },
    { label: "Performance filter resonance", short: "RES", value: v.djRes ?? 1, min: .1, max: 10, step: .1, fmt: x => x.toFixed(1), set: djRes => set({ djRes }) },
  ] : page === "ECO" ? [
    { label: "Dub echo send", short: "SEND", value: v.echoSend ?? 0, min: 0, max: 1, step: .01, fmt: x => `${Math.round(x * 100)}%`, set: echoSend => set({ echoSend }) },
    { label: "Dub echo feedback", short: "FDBK", value: v.echoFeedback ?? .7, min: 0, max: 1.1, step: .01, fmt: x => `${Math.round(x * 100)}%`, set: echoFeedback => set({ echoFeedback }) },
    { label: "Dub echo time", short: "TIME", value: v.echoDiv ?? 3, min: 0, max: ECHO_DIVS.length - 1, step: 1, fmt: x => ECHO_DIVS[x][0], set: echoDiv => set({ echoDiv }) },
    { label: "Dub echo tone", short: "TONE", value: v.echoTone ?? 2200, min: 400, max: 8000, step: 10, fmt: x => `${Math.round(x)}HZ`, set: echoTone => set({ echoTone }) },
  ] : page === "SEQ" ? [
    { label: "Sequencer offset", short: "OFFS", value: v.offset, min: -8, max: 8, step: 1, fmt: x => `${x > 0 ? "+" : ""}${x}`, set: offset => set({ offset }) },
  ] : [];
  return <Panel name="PERFORM" label="Performance" pages={["FX", "ECO", "SEQ", "HLD"]} deps={[JSON.stringify(v)]} knobs={knobs}
    body={(p, page) => {
      if (page === "FX") {
        // DJ filter curve: LP slopes right, HP slopes left
        const cx = 14 + Math.round((dj + 1) / 2 * 110);
        for (let x = 14; x < 126; x++) { const y = dj === 0 ? 14 : dj < 0 ? (x < cx ? 14 : Math.min(38, 14 + (x - cx) / 2)) : (x > cx ? 14 : Math.min(38, 14 + (cx - x) / 2)); p.dot(x, Math.round(y)); }
        p.text(dj === 0 ? "DJ OFF" : dj < 0 ? "LOWPASS" : "HIGHPASS", 2, 32);
      } else if (page === "ECO") {
        const fb = v.echoFeedback ?? .7; let h = 22;
        for (let i = 0; i < 12 && h >= 1; i++) { p.rect(6 + i * 10, 38 - Math.round(h), 4, Math.round(h)); h *= Math.min(1, fb) * .85 + .05; }
        p.text(ECHO_DIVS[v.echoDiv ?? 3][0], 100, 12);
      } else if (page === "SEQ") {
        LOOPS.forEach((n, i) => key(p, n ? String(n) : "FULL", 1 + i * 18, 11, 17, v.loop === n));
        DIVS.forEach(([d, s], i) => key(p, s, 1 + i * 22, 22, 21, v.division === d));
        p.text(v.loop ? "LOOP WIN" : "OFFSET", 92, 13);
        p.text("CAPT", 92, 24);
        p.textC(`${v.offset > 0 ? "+" : ""}${v.offset} STEPS`, 64, 34);
      } else {
        key(p, "REV", 1, 11, 30, v.mode === 1); key(p, "STUT", 33, 11, 30, v.mode === 2); key(p, "STOP", 65, 11, 30, v.mode === 3); key(p, "RST", 97, 11, 30, false);
        STYLES.forEach((s, i) => key(p, s.slice(0, 5).toUpperCase(), 1 + i * 42, 24, 41, v.style === s));
        CMODES.forEach((m, i) => key(p, m.toUpperCase(), 1 + i * 32, 37, 31, (v.chordMode ?? "pad") === m));
        p.text("HOLD  TENSION  CHORD MODE", 2, 54);
      }
    }}
    extra={page => page === "SEQ" ? <>
      {LOOPS.map((n, i) => <Tap key={n} x={1 + i * 18} y={11} w={17} h={9} label={n ? `Loop first ${n} steps` : "Loop full"} pressed={v.loop === n} onClick={() => set({ loop: n })} />)}
      {DIVS.map(([d, s], i) => <Tap key={s} x={1 + i * 22} y={22} w={21} h={9} label={`Repeat length ${s}`} pressed={v.division === d} onClick={() => set({ division: d })} />)}
    </> : page === "HLD" ? <>
      {hold(1, "Hold reverse", 1, 11, 30)}{hold(2, "Hold stutter", 33, 11, 30)}{hold(3, "Hold tape stop", 65, 11, 30)}
      <Tap x={97} y={11} w={30} h={9} label="Reset performance" onClick={() => set({ time: 0, tension: 0, mode: 0, offset: 0, loop: 0, djSweep: 0, echoSend: 0 })} />
      {STYLES.map((s, i) => <Tap key={s} x={1 + i * 42} y={24} w={41} h={9} label={`Tension mode ${s}`} pressed={v.style === s} onClick={() => set({ style: s })} />)}
      {CMODES.map((m, i) => <Tap key={m} x={1 + i * 32} y={37} w={31} h={9} label={`Chord performance ${m}`} pressed={(v.chordMode ?? "pad") === m} onClick={() => set({ chordMode: m })} />)}
    </> : null} />;
}
