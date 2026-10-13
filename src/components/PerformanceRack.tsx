import { Tap, Zone } from "@/pixel/PixelScreen";
import type { Px } from "@/pixel/draw";
import { Panel, type Knob } from "@/components/pixelScreens";
import { ECHO_DIVS, type PerformanceParams } from "@/audio/performance";
import { useEffect, useRef, useState } from "react";

const key = (p: Px, s: string, x: number, y: number, w: number, on: boolean) => { if (on) p.rect(x, y, w, 9); else p.box(x, y, w, 9); p.textC(s, x + w / 2, y + 2, !on); };
const pos = (x: number, y: number, w: number, h: number) => ({ left: `${x / 128 * 100}%`, top: `${y / 64 * 100}%`, width: `${w / 128 * 100}%`, height: `${h / 64 * 100}%` });
const STYLES: PerformanceParams["style"][] = ["sweep", "whiteout", "cyber"];
const CMODES = ["pad", "block", "strum", "arp"] as const;
const DIVS: [number, string][] = [[1, "1/4"], [.5, "1/8"], [.25, "1/16"], [.125, "1/32"]];
const LOOPS = [0, 1, 2, 4, 8];

type PadInfo = { name: string; mute: boolean };
export default function PerformanceRack({ value, onChange, bank, queued, selectBank, pads, toggleMute, unmuteAll }: { value: PerformanceParams; onChange: (p: PerformanceParams) => void; bank: number; queued: number | null; selectBank: (b: number) => void; pads: PadInfo[]; toggleMute: (i: number) => void; unmuteAll: () => void }) {
  const set = (patch: Partial<PerformanceParams>) => onChange({ ...value, ...patch });
  const v = value, dj = v.djSweep ?? 0;
  // Momentary SET flash: every tap bumps the counter so the key lights even when the stored value doesn't change.
  const [flash, setFlash] = useState(0);
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(0), 160); return () => clearTimeout(t); }, [flash]);
  const tapSet = () => { set({ timeHome: v.time }); setFlash(f => f + 1); };
  // Header Reset key retains the momentary drop flash.
  const [dropFlash, setDropFlash] = useState(0);
  useEffect(() => { if (!dropFlash) return; const t = setTimeout(() => setDropFlash(0), 160); return () => clearTimeout(t); }, [dropFlash]);
  // iPhone drops quick taps (double-tap detection, tiny finger slides), so the live strip reads raw touches:
  // each finger toggles once on lift if it moved < 8px. preventDefault stops iOS from also synthesising a click;
  // mouse, keyboard and MIDI (el.click()) still go through onClick.
  const liveRef = useRef<HTMLDivElement>(null);
  // One-tap drop: everything that builds tension snaps back to neutral (master/mix settings untouched).
  const reset = () => { set({ time: v.timeHome ?? 0, tension: 0, mode: 0, offset: 0, loop: 0, djSweep: 0, djRes: 1, echoSend: 0, echoFeedback: .45 }); setDropFlash(f => f + 1); };
  const liveAct = useRef({ toggleMute, selectBank, unmuteAll, perfReset: reset });
  liveAct.current = { toggleMute, selectBank, unmuteAll, perfReset: reset };
  useEffect(() => {
    const el = liveRef.current; if (!el) return;
    const touches = new Map<number, { b: HTMLElement; x: number; y: number }>();
    const keyOf = (t: Touch) => (t.target as Element | null)?.closest?.("[data-mute],[data-bank],[data-mutereset],[data-perfreset]") as HTMLElement | null;
    const start = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) { const b = keyOf(t); if (!b) continue; if (e.cancelable) e.preventDefault(); touches.set(t.identifier, { b, x: t.clientX, y: t.clientY }); b.classList.add("touching"); }
    };
    const move = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) { const s = touches.get(t.identifier); if (s && Math.hypot(t.clientX - s.x, t.clientY - s.y) > 8) { s.b.classList.remove("touching"); touches.delete(t.identifier); } }
    };
    const end = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        const s = touches.get(t.identifier); if (!s) continue; touches.delete(t.identifier); s.b.classList.remove("touching");
        if (e.cancelable) e.preventDefault();
        if (e.type !== "touchend") continue;
        const { mute, bank: bk } = s.b.dataset;
        if (mute !== undefined) liveAct.current.toggleMute(Number(mute)); else if (bk !== undefined) liveAct.current.selectBank(Number(bk)); else if (s.b.dataset.mutereset !== undefined) liveAct.current.unmuteAll(); else if (s.b.dataset.perfreset !== undefined) liveAct.current.perfReset();
      }
    };
    el.addEventListener("touchstart", start, { passive: false }); el.addEventListener("touchmove", move, { passive: true });
    el.addEventListener("touchend", end, { passive: false }); el.addEventListener("touchcancel", end, { passive: false });
    return () => { el.removeEventListener("touchstart", start); el.removeEventListener("touchmove", move); el.removeEventListener("touchend", end); el.removeEventListener("touchcancel", end); };
  }, []);
  const hold =  (mode: number, label: string, x: number, y: number, w: number) => <button key={label} className="px-zone" style={pos(x, y, w, 9)} aria-label={label} aria-pressed={v.mode === mode}
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
  return <div className="gb-perf">
  <Panel name="PERFORM" label="Performance" pages={["FX", "ECO", "SEQ", "HLD"]} deps={[JSON.stringify(v), flash > 0]} knobs={knobs}
    headerAction={{ text: "RESET", label: "Reset performance", pressed: dropFlash > 0, onClick: reset }}
    body={(p, page) => {
      if (page === "FX") {
        // Framed DJ filter response: LP slopes down right of cutoff, HP left of it, resonance bump at cutoff.
        p.box(2, 11, 124, 24);
        const top = 15, bot = 30, x0 = 3, x1 = 124, res = v.djRes ?? 1, bump = Math.min(6, Math.round(res * .7));
        const cx = dj < 0 ? x0 + Math.round((1 + dj) * (x1 - x0)) : x0 + Math.round(dj * (x1 - x0));
        let py = top;
        for (let x = x0; x <= x1; x++) {
          let y = top;
          if (dj !== 0) {
            const d = dj < 0 ? x - cx : cx - x;
            y = d > 0 ? Math.min(bot, top + d / 1.5) : top - Math.max(0, bump - Math.abs(d) / 2);
          }
          y = Math.round(Math.max(12, y)); p.line(x === x0 ? x : x - 1, x === x0 ? y : py, x, y); py = y;
        }
        const f = dj < 0 ? 20000 * (60 / 20000) ** -dj : 20 * (12000 / 20) ** dj, fs = f >= 1000 ? `${(f / 1000).toFixed(1)}K` : `${Math.round(f)}`;
        p.text(dj === 0 ? "OFF" : `${dj < 0 ? "LP" : "HP"} ${fs}`, 5, 20);
        p.text(`T${v.time > 0 ? "+" : v.time < 0 ? "-" : ""}${Math.round(Math.abs(v.time) * 100)}${v.timeHome ? "*" : ""}`, 102, 20);
        // SET sits directly above the T readout and flashes once per press; the * after T shows a stored home.
        if (flash > 0) { p.rect(103, 11, 21, 8); p.text("SET", 107, 12, false); }
        else { p.box(103, 11, 21, 8); p.text("SET", 107, 12); }
        p.rect(3, 37, Math.round(v.tension * 98), 2);
      } else if (page === "ECO") {
        // Echo taps: original hit then repeats spaced by the division, fading with feedback, thinning as tone darkens.
        p.box(2, 11, 124, 30);
        const beat = 24, sp = Math.max(4, Math.round((ECHO_DIVS[v.echoDiv ?? 3]?.[1] ?? .75) * beat)), fb = v.echoFeedback ?? .7, send = v.echoSend ?? 0;
        const dark = 1 - ((v.echoTone ?? 2200) - 400) / 7600;
        for (let x = 4; x < 125; x += 6) p.dot(x, 39); for (let x = 5; x < 125; x += beat) p.rect(x, 38, 1, 2);
        p.rect(5, 16, 3, 21);
        let h = 21 * Math.max(.15, send);
        for (let i = 1, x = 5 + sp; x < 122 && i < 40; i++, x += sp) {
          const hh = Math.max(1, Math.min(21, Math.round(h))), w = i * dark > 1.5 ? 1 : i * dark > .6 ? 2 : 3;
          if (send === 0 || i * dark > 3) p.box(x, 37 - hh, w, hh, true); else p.rect(x, 37 - hh, w, hh);
          h *= fb; if (h < .6) break;
        }
        p.text(ECHO_DIVS[v.echoDiv ?? 3][0], 100, 13);
        if (fb > 1) p.text("SELF", 100, 20);
        if (send === 0) p.text("NO SEND", 40, 13);
      } else if (page === "SEQ") {
        LOOPS.forEach((n, i) => key(p, n ? String(n) : "FULL", 2 + i * 25, 11, 24, v.loop === n));
        DIVS.forEach(([d, s], i) => key(p, s, 2 + i * 31, 22, 30, v.division === d));
        // 16-step strip: loop window solid, outside dotted, offset start marked.
        const len = v.loop || 16, start = ((v.offset % 16) + 16) % 16;
        for (let i = 0; i < 16; i++) {
          const x = 8 + i * 7, inLoop = ((i - start + 16) % 16) < len;
          if (inLoop) p.rect(x, 34, 6, 5); else p.box(x, 34, 6, 5, true);
        }
        const ax = 8 + start * 7 + 2; p.rect(ax, 32, 2, 1); p.dot(ax - 1, 32); p.dot(ax + 2, 32);
      } else {
        key(p, "REV", 1, 11, 30, v.mode === 1); key(p, "STUT", 33, 11, 30, v.mode === 2); key(p, "STOP", 65, 11, 30, v.mode === 3);
        STYLES.forEach((s, i) => key(p, s.slice(0, 5).toUpperCase(), 1 + i * 42, 24, 41, v.style === s));
        CMODES.forEach((m, i) => key(p, m.toUpperCase(), 1 + i * 32, 37, 31, (v.chordMode ?? "pad") === m));
        p.box(2, 49, 124, 14);
        if (v.mode === 1) { p.line(110, 56, 18, 56); p.line(18, 56, 24, 52); p.line(18, 56, 24, 60); p.text("REV", 54, 51); }
        else if (v.mode === 2) { for (let i = 0; i < 8; i++) p.rect(8 + i * 14, 52, 8, 8); }
        else if (v.mode === 3) { p.line(6, 52, 70, 54); p.line(70, 54, 120, 61); p.text("STOP", 96, 51); }
        else p.textC("HOLD A KEY", 64, 54);
      }
    }}
    extra={page => page === "FX" ? <><Zone x={2} y={11} w={124} h={24} horizontal label="DJ filter sweep pad" value={dj} min={-1} max={1} step={.01} onChange={djSweep => set({ djSweep })} /><Tap x={103} y={11} w={21} h={8} label="Set time home" pressed={flash > 0} onClick={tapSet} /></>
    : page === "ECO" ? <Zone x={2} y={11} w={124} h={30} horizontal label="Echo time pad" value={v.echoDiv ?? 3} min={0} max={ECHO_DIVS.length - 1} step={1} onChange={echoDiv => set({ echoDiv })} />
    : page === "SEQ" ? <>
      {LOOPS.map((n, i) => <Tap key={n} x={2 + i * 25} y={11} w={24} h={9} label={n ? `Loop first ${n} steps` : "Loop full"} pressed={v.loop === n} onClick={() => set({ loop: n })} />)}
      {DIVS.map(([d, s], i) => <Tap key={s} x={2 + i * 31} y={22} w={30} h={9} label={`Repeat length ${s}`} pressed={v.division === d} onClick={() => set({ division: d })} />)}
      <Zone x={8} y={32} w={112} h={8} horizontal label="Offset strip" value={v.offset} min={-8} max={8} step={1} onChange={offset => set({ offset })} />
    </> : page === "HLD" ? <>
      {hold(1, "Hold reverse", 1, 11, 30)}{hold(2, "Hold stutter", 33, 11, 30)}{hold(3, "Hold tape stop", 65, 11, 30)}
      {STYLES.map((s, i) => <Tap key={s} x={1 + i * 42} y={24} w={41} h={9} label={`Tension mode ${s}`} pressed={v.style === s} onClick={() => set({ style: s })} />)}
      {CMODES.map((m, i) => <Tap key={m} x={1 + i * 32} y={37} w={31} h={9} label={`Chord performance ${m}`} pressed={(v.chordMode ?? "pad") === m} onClick={() => set({ chordMode: m })} />)}
    </> : null} />
  {/* Live strip: pattern launch (switches on the next bar) and one mute key per pad, same mutes as the mixer. */}
  <div className="gb-perf-live" ref={liveRef}>
    <div className="gb-perf-banks" role="group" aria-label="Performance pattern">
      {["A", "B", "C", "D"].map((n, b) => {
        const active = bank === b, waiting = queued === b;
        return <button key={n} type="button" data-bank={b} aria-label={`Performance pattern ${n}`} aria-pressed={active} title={waiting ? "queued for next bar" : active ? "active" : undefined} className={`${active ? "active" : ""}${waiting ? " queued" : ""}`} onClick={() => selectBank(b)}>{waiting ? `${n}>` : n}</button>;
      })}
    </div>
    <div className="gb-perf-mutes" role="group" aria-label="Pad mutes">
      <div className="gb-perf-mute-grid">
        {pads.map((pd, i) => <button key={i} type="button" data-mute={i} aria-label={`Mute pad ${i + 1}`} aria-pressed={pd.mute} title={`${pd.name || String(i + 1)} · ${pd.mute ? "muted" : "playing"}`} onClick={() => toggleMute(i)}>{i + 1}</button>)}
      </div>
      <button type="button" data-mutereset aria-label="Unmute all pads" className="gb-perf-mutereset" onClick={unmuteAll}>RST</button>
    </div>
  </div>
  </div>;
}
