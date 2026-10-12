import { gatedLoop, pokeAudio, setTransportPlaying } from "@/lib/frameGate";
import AboutSection from "@/components/AboutSection";
import { fxLoad } from "@/audio/effects";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useMidi } from "@/hooks/useMidi";
import type { MutableRefObject } from "react";
import { AudioLines } from "lucide-react";
import { Slider, ResetScope } from "@/components/ui/slider";
import TapeDeck from "./TapeDeck";
import { RATES, type RateName } from "@/audio/arp";
import { useGroovebox, stepAt, ROLLS, type Slot, type RepeatParams } from "@/hooks/useGroovebox";
import type { FxUnit } from "@/audio/effects";
import { MasterScreen, MidiScreen, SeqScreen } from "@/components/HwScreens";
import PatchNode from "./PatchNode";
import SlotEditor from "./SlotEditor";
import DevicePanel from "./DevicePanel";
import FxChain from "./FxChain";
import ArpEditor from "./ArpEditor";
import { HarmonyContext } from "./harmonyKnob";
import { HARMONY_SCALES, phraseSemi } from "@/audio/harmony";
import { NOTE_NAMES } from "@/audio/arp";
import type { ArpParams } from "@/audio/arp";
import Waveform from "./Waveform";
import SetBank from "./SetBank";
import PerformanceRack from "./PerformanceRack";
import { FX_DEFS, MOD_LABEL, modParamsOf } from "@/audio/effects";
import type { StepVal } from "@/hooks/useGroovebox";
import { DisplayThemeContext } from "@/pixel/PixelScreen";
import { DISPLAY_THEMES, nextDisplayTheme, type DisplayTheme } from "@/lib/displayTheme";

// Pads and the sequencer grid are memoized so a sequencer tick never re-renders the editor or
// fx panels, and a pad hit never waits on the sequencer — key for responsive finger drumming.
// Bottom ~12% of a pad reads as silent, top ~8% as full, so a fingertip can reach both ends.
const padYVel = (y: number, b: DOMRect) => Math.round(Math.min(1, Math.max(0, ((1 - (y - b.top) / b.height) - .12) / .8)) * 100) / 100;

const PadGrid = memo(function PadGrid({ slots, selected, padRefs, onHit, onRelease, velMode, onVel }: {
  slots: Slot[]; selected: number; padRefs: MutableRefObject<(HTMLButtonElement | null)[]>; onHit: (i: number) => void; onRelease: (i: number) => void; velMode: boolean; onVel: (i: number, v: number) => void;
}) {
  // With pad repeat on, finger height inside the pad sets velocity (bottom = soft, top = loud), drawn as a fill.
  const setVel = (i: number, v: number) => { const el = padRefs.current[i]; if (!el) return; el.style.setProperty("--vel", String(v)); const n = el.querySelector(".gb-pad-velnum"); if (n) n.textContent = `VEL ${Math.round(v * 127)}`; onVel(i, v); };
  const vel = (i: number, e: React.PointerEvent<HTMLButtonElement>) => { const b = e.currentTarget.getBoundingClientRect(); setVel(i, padYVel(e.clientY, b)); };
  // Touch screens: pads read the raw touch signal (every finger in changedTouches is its own hit), like native
  // drum apps; cancelling the touch also stops iOS gesture recognisers from holding back fast repeated taps.
  // Mouse and pen keep using pointer events below.
  const grid = useRef<HTMLDivElement>(null);
  const live = useRef({ onHit, onRelease, velMode, vel: setVel });
  live.current = { onHit, onRelease, velMode, vel: setVel };
  // Release a pad only when its last finger lifts, so lifting one finger never cuts a newer tap's sound.
  const fingers = useRef<Set<number>[]>(Array.from({ length: 16 }, () => new Set()));
  const up = (i: number, id: number) => { const f = fingers.current[i]; if (!f.delete(id)) return; if (!f.size) onRelease(i); };
  const touchPad = useRef(new Map<number, number>());
  useEffect(() => {
    const el = grid.current; if (!el) return;
    const padOf = (t: Touch) => { const b = (t.target as Element | null)?.closest?.(".gb-pad") as HTMLElement | null; return b ? Number(b.dataset.pad) : -1; };
    const start = (e: TouchEvent) => { if (e.cancelable) e.preventDefault();
      for (const t of Array.from(e.changedTouches)) { const i = padOf(t); if (i < 0) continue; touchPad.current.set(t.identifier, i); fingers.current[i].add(-1 - t.identifier);
        const L = live.current; if (L.velMode) { const b = (el.querySelector(`[data-pad="${i}"]`) as HTMLElement).getBoundingClientRect(), v = padYVel(t.clientY, b); L.vel(i, v); } L.onHit(i); } };
    const move = (e: TouchEvent) => { if (e.cancelable) e.preventDefault(); const L = live.current; if (!L.velMode) return;
      for (const t of Array.from(e.changedTouches)) { const i = touchPad.current.get(t.identifier); if (i === undefined) continue; const b = (el.querySelector(`[data-pad="${i}"]`) as HTMLElement).getBoundingClientRect(); L.vel(i, padYVel(t.clientY, b)); } };
    const end = (e: TouchEvent) => { if (e.cancelable) e.preventDefault();
      for (const t of Array.from(e.changedTouches)) { const i = touchPad.current.get(t.identifier); if (i === undefined) continue; touchPad.current.delete(t.identifier); const f = fingers.current[i]; f.delete(-1 - t.identifier); if (!f.size) live.current.onRelease(i); } };
    el.addEventListener("touchstart", start, { passive: false }); el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end, { passive: false }); el.addEventListener("touchcancel", end, { passive: false });
    return () => { el.removeEventListener("touchstart", start); el.removeEventListener("touchmove", move); el.removeEventListener("touchend", end); el.removeEventListener("touchcancel", end); };
  }, []);

  return <div ref={grid} className={`gb-pads ${velMode ? "vel-mode" : ""}`}>{slots.map((slot, i) => <button key={i} ref={el => (padRefs.current[i] = el)} data-pad={i} onPointerDown={ev => { ev.preventDefault(); if (ev.pointerType === "touch") return; ev.currentTarget.setPointerCapture?.(ev.pointerId); fingers.current[i].add(ev.pointerId); if (velMode) vel(i, ev); onHit(i); }} onPointerMove={ev => { if (velMode && ev.pointerType !== "touch" && ev.buttons) vel(i, ev); }} onPointerUp={ev => up(i, ev.pointerId)} onPointerCancel={ev => up(i, ev.pointerId)} onLostPointerCapture={ev => up(i, ev.pointerId)} onKeyDown={ev => { if ((ev.key === "Enter" || ev.key === " ") && !ev.repeat) { ev.preventDefault(); onHit(i); } }} onKeyUp={ev => { if (ev.key === "Enter" || ev.key === " ") onRelease(i); }} onBlur={() => { if (!fingers.current[i].size) onRelease(i); }} className={`gb-pad ${slot.arp.on ? "has-arp" : ""} ${selected === i ? "selected" : ""} ${slot.mute ? "muted" : ""}`} aria-label={`Play ${slot.name}`}>
    {velMode && <><i className="gb-pad-vel" aria-hidden="true" /><b className="gb-pad-velnum" aria-hidden="true">VEL {Math.round(parseFloat(padRefs.current[i]?.style.getPropertyValue("--vel") || "1") * 127)}</b></>}
    <span className="gb-pad-index">{String(i + 1).padStart(2, "0")}</span><span className="gb-pad-name">{slot.name}</span><span className="gb-pad-kind">{slot.engine === "drum" ? slot.drum.kind : slot.engine === "sampler" ? "smp" : slot.engine === "synth" ? "syn" : slot.engine}</span>
  </button>)}</div>;
});

function RepeatBar({ repeat, onRepeat, rec, onRec, onNew }: { repeat: RepeatParams; onRepeat: (r: RepeatParams) => void; rec: boolean; onRec: (v: boolean) => void; onNew: () => void }) {
  const [sure, setSure] = useState(false);
  useEffect(() => { if (!sure) return; const id = window.setTimeout(() => setSure(false), 3000); return () => window.clearTimeout(id); }, [sure]);
  return <div className="gb-seq-tools gb-repeat">
    <button className={`gb-mute ${sure ? "selected" : ""}`} aria-label="New blank kit" onClick={() => { if (sure) { setSure(false); onNew(); } else setSure(true); }}>{sure ? "SURE?" : "NEW"}</button>
    <button className={`gb-mute ${repeat.on ? "selected" : ""}`} aria-pressed={repeat.on} aria-label="Pad repeat" onClick={() => onRepeat({ ...repeat, on: !repeat.on })}>REPEAT {repeat.on ? "ON" : "OFF"}</button>
    <div className="gb-banks"><button className={`gb-bank ${repeat.on && !repeat.latch ? "active" : ""}`} aria-pressed={repeat.on && !repeat.latch} aria-label="Repeat momentary" onClick={() => onRepeat({ ...repeat, on: true, latch: false })}>MOMENT</button><button className={`gb-bank ${repeat.on && repeat.latch ? "active" : ""}`} aria-pressed={repeat.on && repeat.latch} aria-label="Repeat latch" onClick={() => onRepeat({ ...repeat, on: true, latch: true })}>LATCH</button><button className={`gb-bank ${repeat.roll ? "active" : ""}`} aria-pressed={!!repeat.roll} aria-label="Repeat roll" onClick={() => onRepeat({ ...repeat, roll: !repeat.roll })}>ROLL</button></div>
    <button className="gb-cycle" aria-label="Repeat rate" onClick={() => onRepeat({ ...repeat, rate: cyc(Object.keys(RATES), repeat.rate) as RateName })}>{repeat.rate}</button>
    <button className={`gb-mute gb-rec ${rec ? "selected" : ""}`} aria-pressed={rec} aria-label="Record into sequencer" onClick={() => onRec(!rec)}>● REC</button>
  </div>;
}

/** Targets a row can modulate: filter cutoff, pitch (for glides), and the params of each effect on that pad. */
const targetsOf = (slot: Slot) => [["off", "no mod"], ["cutoff", "cutoff"], ...(slot.engine === "drum" || slot.engine === "poly" ? [] : [["pitch", "pitch"]]),
  ...slot.fx.flatMap(f => modParamsOf(f.type).map(k => [`${f.id}:${k}`, `${FX_DEFS[f.type].label.replace("~", "")} ${MOD_LABEL[k] ?? k}`]))];

type View = "note" | "mod" | "vel" | "chance" | "roll";
const StepGrid = memo(function StepGrid({ pattern, lengths, slots, selected, step, bank, view, vel, chance, ratchet, offset, loop, onToggle, onSelect, onLength, onValue, onRow, onModTarget }: {
  pattern: StepVal[][]; lengths: number[]; slots: Slot[]; selected: number; step: number; bank: number; view: View; vel: number[][]; chance: number[][]; ratchet: number[][]; offset: number; loop: number; onToggle: (r: number, c: number) => void; onSelect: (i: number) => void; onLength: (r: number, len: number) => void; onValue: (view: View, r: number, c: number, v: number) => void; onRow: (view: View, r: number, v: number) => void; onModTarget: (r: number, t: string) => void;
}) {
  // Relative drag: tap sets the value at tap height, then the whole drag distance refines it (1% per 2px).
  const dragRef = useRef<{ r: number; c: number; y: number; v0: number } | null>(null);
  // Unlit/NOTE taps toggle on pointer-up within 8px, so iOS scroll-cancelled clicks can't swallow them; one touch toggles once.
  const tapRef = useRef<{ id: number; x: number; y: number; k: string } | null>(null);
  const lastToggle = useRef({ k: "", t: 0 });
  const toggle = (r: number, c: number) => { const k = `${r}:${c}`, t = performance.now(); if (lastToggle.current.k === k && t - lastToggle.current.t < 150) return; lastToggle.current = { k, t }; onToggle(r, c); };
  const lastTap = useRef<{ k: string; t: number }>({ k: "", t: 0 });
  const [readout, setReadout] = useState<{ text: string; x: number; y: number } | null>(null);
  const fmtV = (r: number, v: number) => view === "roll" ? `ROLL X${ROLLS[Math.round(v * (ROLLS.length - 1))]}` : `${view === "chance" ? "CHNC" : view.toUpperCase()} ${String(r + 1).padStart(2, "0")} ${Math.round(v * 100)}%`;
  const apply = (r: number, c: number, v: number, e: { clientX: number; clientY: number }) => { const q = Math.round(Math.min(1, Math.max(0, v)) * 100) / 100; onValue(view, r, c, q); setReadout({ text: fmtV(r, q), x: e.clientX, y: e.clientY }); return q; };
  const down = (r: number, c: number, e: React.PointerEvent<HTMLButtonElement>) => {
    const k = `${r}:${c}`, now = performance.now();
    if (lastTap.current.k === k && now - lastTap.current.t < 300) { lastTap.current = { k: "", t: 0 }; dragRef.current = null; apply(r, c, view === "mod" ? .5 : view === "roll" ? 0 : 1, e); return; }
    lastTap.current = { k, t: now };
    const b = e.currentTarget.getBoundingClientRect();
    const v0 = apply(r, c, 1 - (e.clientY - b.top) / b.height, e);
    dragRef.current = { r, c, y: e.clientY, v0 };
  };
  const move = (e: React.PointerEvent<HTMLButtonElement>) => { const d = dragRef.current; if (!d || !e.buttons) return; apply(d.r, d.c, d.v0 + (d.y - e.clientY) / 200, e); };
  const up = () => { dragRef.current = null; setTimeout(() => setReadout(null), 600); };
  return <div className="gb-seq-workspace">
    {readout && <div className="gb-step-readout" style={{ left: readout.x, top: readout.y }}>{readout.text}</div>}
    <div className={`gb-seq-grid ${view !== "note" ? "is-mod" : ""} view-${view}`}>{pattern.map((row, r) => { const len = lengths[r], cur = step < 0 ? -1 : stepAt(step, len, loop, offset), lane = slots[r].mods?.[bank], opts = targetsOf(slots[r]), tv = lane?.on && opts.some(o => o[0] === lane.target) ? lane.target : "off";
    const loopStart = ((offset % len) + len) % len, inWin = (c: number) => !loop || loop >= len || ((c - loopStart + len) % len) < loop;
    return <div key={r} className={`gb-row ${selected === r ? "selected" : ""}`}>
    <button className="gb-row-label" onClick={() => onSelect(r)}>{slots[r].name || String(r + 1).padStart(2, "0")}</button>
    <button className="gb-cycle" aria-label={`${slots[r].name} loop length`} onClick={() => onLength(r, (len % 16) + 1)} onContextMenu={e => { e.preventDefault(); onLength(r, len > 1 ? len - 1 : 16); }}>{len}</button>
{view === "vel" || view === "chance" || view === "roll" ? (() => { const lit = row.map((v, c) => (v ? c : -1)).filter(c => c >= 0), vals = lit.map(c => view === "roll" ? Math.max(0, ROLLS.indexOf(ratchet[r]?.[c] ?? 1)) / (ROLLS.length - 1) : (view === "vel" ? vel : chance)[r]?.[c] ?? 1), rv = vals.length ? Math.max(...vals) : 1;
      const setX = (e: React.PointerEvent<HTMLButtonElement>) => { const b = e.currentTarget.getBoundingClientRect(); onRow(view, r, Math.min(1, Math.max(0, (e.clientX - b.left) / b.width))); };
      return <button className="gb-cycle gb-row-fader" aria-label={`${slots[r].name} row ${view === "chance" ? "chance" : view === "vel" ? "velocity" : "roll"}`} style={{ touchAction: "none", position: "relative", overflow: "hidden" }}
        onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setX(e); }} onPointerMove={e => { if (e.buttons) setX(e); }}
        onDoubleClick={() => onRow(view, r, view === "roll" ? 0 : 1)}>
        <i style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${rv * 100}%`, background: "hsl(var(--foreground))", mixBlendMode: "difference" }} />
        <span style={{ position: "relative", mixBlendMode: "difference", color: "hsl(var(--foreground))" }}>{view === "roll" ? `X${ROLLS[Math.round(rv * (ROLLS.length - 1))]}` : `${Math.round(rv * 100)}%`}</span></button>; })() :     <button className={`gb-cycle ${tv !== "off" ? "on" : ""}`} aria-label={`${slots[r].name} modulation target`} onClick={() => onModTarget(r, cyc(opts.map(o => o[0]), tv))}>{(opts.find(o => o[0] === tv)?.[1] ?? "off").slice(0, 10)}</button>}
    {row.map((v, c) => { const off = c >= len, tieNext = !off && c + 1 < len && row[c + 1] >= 2 && v !== 0, label = v >= 2 ? "tie" : v === 1 ? "hit" : "off";
      const val = view === "roll" ? Math.max(0, ROLLS.indexOf(ratchet[r]?.[c] ?? 1)) / (ROLLS.length - 1) : view === "vel" ? vel[r]?.[c] ?? 1 : view === "chance" ? chance[r]?.[c] ?? 1 : lane?.values[c] ?? .5;
      const drag2 = view === "mod" ? v !== 0 && tv !== "off" : view !== "note" && v === 1;
      return <button key={c} disabled={off} aria-label={`${slots[r].name} step ${c + 1} ${label}${drag2 ? (view === "roll" ? ` roll x${ratchet[r]?.[c] ?? 1}` : ` ${view} ${Math.round(val * 100)}%`) : ""}`}
        onPointerDown={ev => { if (drag2) { ev.preventDefault(); ev.currentTarget.setPointerCapture(ev.pointerId); down(r, c, ev); } else tapRef.current = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, k: `${r}:${c}` }; }}
        onClick={ev => { if (!drag2 && ev.detail === 0) toggle(r, c); }}
        onPointerMove={ev => { if (drag2) move(ev); }}
        onPointerUp={ev => { if (drag2) return up(); const t = tapRef.current; tapRef.current = null; if (t && t.id === ev.pointerId && t.k === `${r}:${c}` && Math.hypot(ev.clientX - t.x, ev.clientY - t.y) < 8) toggle(r, c); }}
        onPointerCancel={ev => { if (!drag2) { const t = tapRef.current; tapRef.current = null; if (t && t.id === ev.pointerId && Math.hypot(ev.clientX - t.x, ev.clientY - t.y) < 8) toggle(r, c); } else up(); }}
        onKeyDown={ev => { if (drag2 && (ev.key === "ArrowUp" || ev.key === "ArrowDown")) { ev.preventDefault(); onValue(view, r, c, Math.min(1, Math.max(0, val + (ev.key === "ArrowUp" ? .05 : -.05)))); } }}
        className={`gb-step ${v === 1 ? "on" : v >= 2 ? "tie" : ""} ${tieNext ? "tie-next" : ""} ${off ? "disabled" : ""} ${!off && !inWin(c) ? "out-loop" : ""} ${c === cur ? "current" : ""} ${c % 4 === 0 ? "beat" : ""} ${c > 0 && c % 4 === 0 ? "group" : ""} ${drag2 ? "mod" : ""}`}>
        {drag2 && <i className="gb-step-fill" style={{ height: `${val * 100}%` }} />}
        {drag2 && view !== "roll" && <b className="gb-step-val">{Math.round(val * 100)}</b>}
        {drag2 && view === "roll" && <b className="gb-step-roll">X{ratchet[r]?.[c] ?? 1}</b>}
        {view === "note" && v === 1 && (ratchet[r]?.[c] ?? 1) > 1 && <b className="gb-step-roll">{ratchet[r]?.[c]}</b>}
        {view === "note" && v === 1 && ((vel[r]?.[c] ?? 1) < .99 || (chance[r]?.[c] ?? 1) < .99) && <i className="gb-step-dot" />}
      </button>; })}
  </div>; })}</div>
  </div>;
});

const SEGS = 10, FLOOR = -48;
const Mixer = memo(function Mixer({ slots, selected, onLevel, onMute, onSolo, onClearSolo, onSelect, getLevels }: {
  getLevels: () => number[] | null;
  slots: Slot[]; selected: number; onLevel: (i: number, v: number) => void; onMute: (i: number) => void; onSolo: (i: number) => void; onClearSolo: () => void; onSelect: (i: number) => void;
}) {
  const [page, setPage] = useState(0);
  const anySolo = slots.some(s => s.solo);
  const start = page * 8;
  // Live post-fader dB meters: polled each frame and written straight to the DOM so playback never re-renders the mixer.
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const hold = Array(16).fill(-Infinity), held = Array(16).fill(0), disp = Array(16).fill(-Infinity);
    const poll = () => {
      const lv = getLevels(), el = root.current;
      if (lv && el) el.querySelectorAll<HTMLElement>("[data-ch]").forEach(strip => {
        const i = +strip.dataset.ch!, v = lv[i] ?? -Infinity;
        disp[i] = v > disp[i] ? v : Math.max(v, disp[i] - 0.8);
        if (v >= hold[i]) { hold[i] = v; held[i] = 45; } else if (--held[i] < 0) hold[i] = Math.max(-Infinity, hold[i] - 1);
        const seg = (d: number) => Number.isFinite(d) ? Math.ceil(Math.max(0, Math.min(1, (d - FLOOR) / -FLOOR)) * SEGS) : 0;
        const on = seg(disp[i]), pk = seg(hold[i]);
        strip.querySelectorAll("i").forEach((c, n) => { c.className = n < on ? (n >= SEGS - 1 ? "on clip" : "on") : n === pk - 1 ? "on" : ""; });
        const t = strip.querySelector<HTMLElement>(".gb-strip-val"); if (t) { const s = Number.isFinite(hold[i]) && hold[i] > FLOOR ? (hold[i] >= 0 ? "CLIP" : hold[i].toFixed(0)) : "-INF"; if (t.textContent !== s) t.textContent = s; }
      });
    };
    return gatedLoop(root.current, poll);
  }, [getLevels]);
  return <div className={`gb-mixer-workspace mixer-page-${page}`} ref={root}>
    <div className="gb-mixer-head"><span>MIXER / {page ? "09–16" : "01–08"}</span><div><button aria-pressed={page === 0} onClick={() => setPage(0)}>A 01–08</button><button aria-pressed={page === 1} onClick={() => setPage(1)}>B 09–16</button><button disabled={!anySolo} onClick={onClearSolo}>CLR SOLO</button></div></div>
    <div className="gb-mixer">{slots.map((s, i) => <div key={i} data-ch={i} className={`gb-strip gb-strip-page-${Math.floor(i / 8)} ${selected === i ? "selected" : ""} ${s.mute || (anySolo && !s.solo) ? "silent" : ""}`}>
      <span className="gb-strip-index">{String(i + 1).padStart(2, "0")}</span><span className="gb-strip-val" title="Peak dBFS">-INF</span>
      <div className="gb-meter" aria-hidden="true">{Array.from({ length: SEGS }, (_, n) => <i key={n} />)}</div>
      <Slider orientation="vertical" aria-label={`${s.name} volume`} min={0} max={100} value={[s.level]} onValueChange={([v]) => onLevel(i, v)} className="gb-vslider" />
      <div className="gb-strip-btns">
        <button className={`gb-ms ${s.mute ? "m-on" : ""}`} aria-pressed={s.mute} aria-label={`Mute ${s.name}`} onClick={() => onMute(i)}>M</button>
        <button className={`gb-ms ${s.solo ? "s-on" : ""}`} aria-pressed={s.solo} aria-label={`Solo ${s.name}`} onClick={() => onSolo(i)}>S</button>
      </div>
      <button className="gb-strip-name" aria-pressed={selected === i} onClick={() => onSelect(i)}>{s.name || String(i + 1).padStart(2, "0")}</button>
    </div>)}</div>
  </div>;
});
const DESKTOP_MQ = "(min-width: 1024px) and (pointer: fine)";
const UTILITIES = ["fx", "phrase", "seq", "mixer", "master", "perf", "tape", "sets", "midi"] as const;
type Utility = typeof UTILITIES[number];
const UTILITY_LABELS: Record<Utility, string> = { fx: "FX", phrase: "PHRASE", seq: "SEQ", mixer: "MIX", master: "MASTER", perf: "PERF", tape: "TAPE", sets: "MEM", midi: "MIDI" };
function cyc<T>(list: readonly T[], cur: T): T { return list[(list.indexOf(cur) + 1) % list.length]; }

export default function Groovebox({ theme, onThemeChange }: { theme: DisplayTheme; onThemeChange: (theme: DisplayTheme) => void }) {
  const g = useGroovebox();
  const rootRef = useRef<HTMLElement>(null);
  const gHit = g.hit;
  const hit = useCallback((...args: Parameters<typeof gHit>) => { pokeAudio(); return gHit(...args); }, [gHit]) as typeof gHit;
  useEffect(() => { setTransportPlaying(g.playing); }, [g.playing]);
  // Mount only the layout actually shown, so hidden desktop/phone trees don't run duplicate monitors.
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP_MQ).matches);
  useEffect(() => { const m = window.matchMedia(DESKTOP_MQ), on = () => setDesktop(m.matches); m.addEventListener("change", on); return () => m.removeEventListener("change", on); }, []);
  const midi = useMidi(rootRef, hit, g.release);
  const pf = g.performance, setPf = (p: Partial<typeof pf>) => g.setPerformance({ ...pf, ...p });
  const s = g.slots[g.selected];
  const onFx = useCallback((fx: FxUnit[]) => g.updateSelected({ fx }), [g.updateSelected]);
  const [view, setView] = useState<View>("note");
  const [about, setAbout] = useState(false);
  const [desktopView, setDesktopView] = useState<"devices" | "sequence">("devices");
  useEffect(() => { if (!about) return; const k = (e: KeyboardEvent) => { if (e.key === "Escape") setAbout(false); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [about]);
  const onArp = useCallback((arp: ArpParams) => g.updateSelected({ arp }), [g.updateSelected]);
  const onRow = useCallback((v: View, r: number, x: number) => { if (v === "roll") g.setRowValue("ratchet", r, ROLLS[Math.round(x * (ROLLS.length - 1))]); else if (v === "vel" || v === "chance") g.setRowValue(v, r, Math.round(x * 100) / 100); }, [g.setRowValue]);
  const onValue = useCallback((v: View, r: number, c: number, x: number) => { if (v === "mod") g.setModValue(r, c, x); else if (v === "roll") g.setStepValue("ratchet", r, c, ROLLS[Math.round(x * (ROLLS.length - 1))]); else if (v === "vel" || v === "chance") g.setStepValue(v, r, c, x); }, [g.setModValue, g.setStepValue]);
  const tapSource = useCallback(async () => { const e = await g.ensure(); return { ctx: e.ctx, node: e.performance.output }; }, [g.ensure]);
  const [utility, setUtility] = useState<Utility>(() => { try { const v = localStorage.getItem("nadrisk.utility.v1") as Utility | null; return v && UTILITIES.includes(v) ? v : "fx"; } catch { return "fx"; } });
  useEffect(() => { try { localStorage.setItem("nadrisk.utility.v1", utility); } catch { /* private mode */ } }, [utility]);

  const seqPerformancePanel = <div className="gb-seq-perf"><div className="gb-seq-controls"><SeqScreen bank={g.bank} queued={g.queued} selectBank={g.selectBank} view={view} setView={v => setView(v as View)} copy={g.copyBank} random={g.randomizePattern} clear={g.clearPattern} reset={g.resetAll} playing={g.playing} onPlay={g.togglePlay} paused={g.paused} onPause={g.togglePause} undo={g.undo} redo={g.redo} canUndo={g.canUndo} canRedo={g.canRedo} /></div><div className="gb-seq-performance"><PerformanceRack value={g.performance} onChange={g.setPerformance} bank={g.bank} queued={g.queued} selectBank={g.selectBank} pads={g.slots.map(x => ({ name: x.name, mute: x.mute }))} toggleMute={g.toggleMute} unmuteAll={g.unmuteAll} /></div><div className="gb-seq-grid"><StepGrid offset={pf.offset} loop={pf.loop} bank={g.bank} view={view} vel={g.vel} chance={g.chance} ratchet={g.ratchet} onValue={onValue} onRow={onRow} onModTarget={g.setModTarget} pattern={g.pattern} lengths={g.lengths} onLength={g.setTrackLength} slots={g.slots} selected={g.selected} step={g.step} onToggle={g.toggleStep} onSelect={g.setSelected} /></div></div>;
  const utilityPanels: Record<Utility, JSX.Element> = {
    fx: <FxChain slotIndex={g.selected} slots={g.slots.map(x => x.name)} slotName={s.name} fx={s.fx} onChange={onFx} getLevels={g.getFxLevels} load={fxLoad(g.slots.map(x => x.fx))} />,
    phrase: <ArpEditor arp={s.arp} slotName={s.name} onChange={onArp} {...(s.engine === "drum" || s.engine === "siren" ? {} : { note: s.note, onNote: (note: number) => g.updateSelected({ note }), noteOf: (deg: number) => s.note + phraseSemi(g.harmony, s.note, s.arp.scale, deg) })} />,
    seq: seqPerformancePanel,
    mixer: <Mixer slots={g.slots} selected={g.selected} onLevel={g.setLevel} onMute={g.toggleMute} onSolo={g.toggleSolo} onClearSolo={g.clearSolo} onSelect={g.setSelected} getLevels={g.getChannelLevels} />,
    master: <div className="node-body"><MasterScreen playing={g.playing} step={g.step} onPlay={g.togglePlay} bpm={g.bpm} setBpm={g.setBpm} volume={g.volume} setVolume={g.setVolume} eco={g.eco} setEco={g.setEco} latency={g.latency} pf={pf} setPf={setPf} meter={g.meter} resetMeter={g.resetMeter} getMasterDyn={g.getMasterDyn} /><div className="scope-node gb-scope"><Waveform analyser={g.engine.current?.analyser ?? null} playing={!!g.engine.current} eco={g.eco} theme={theme} /></div></div>,
    perf: seqPerformancePanel,
    tape: <TapeDeck getSource={tapSource} playing={g.playing} step={g.step} bpm={g.bpm} onPlay={g.togglePlay} />,
    midi: <div className="node-body gb-midi" data-midi-ui><MidiScreen devices={midi.devices} learn={midi.learn} target={midi.target} mapCount={Object.keys(midi.maps).length} status={midi.status} connect={midi.connect} setLearn={midi.setLearn} canUnmap={!!midi.target && Object.values(midi.maps).includes(midi.target)} unmap={() => midi.target && midi.unmap(midi.target)} clear={midi.clear} /></div>,
    sets: <SetBank getSet={g.getSet} applySet={g.applySet} />,
  };
  const compactUtilities: Utility[] = ["phrase", "master", "tape", "sets", "midi"];
  const compactAt = compactUtilities.indexOf(utility);
  const utilityContent = compactAt < 0 ? utilityPanels[utility] : <div className="gb-compact-stack">{[0, 1, 2].map(offset => { const key = compactUtilities[(compactAt + offset) % compactUtilities.length]; return <section className="gb-compact-module" key={key}><header>{UTILITY_LABELS[key]}</header>{utilityPanels[key]}</section>; })}</div>;
  const desktopDevices = <div className="gb-device-surface">
    <DevicePanel className="gb-device-module device-fx" label="FX">{utilityPanels.fx}</DevicePanel>
    <DevicePanel className="gb-device-module device-master" label="Master">{utilityPanels.master}</DevicePanel>
    <DevicePanel className="gb-device-module device-memory" label="Memory">{utilityPanels.sets}</DevicePanel>
    <DevicePanel className="gb-device-module device-phrase" label="Phrase">{utilityPanels.phrase}</DevicePanel>
    <DevicePanel className="gb-device-module device-tape" label="Tape">{utilityPanels.tape}</DevicePanel>
    <DevicePanel className="gb-device-module device-midi" label="MIDI">{utilityPanels.midi}</DevicePanel>
    <section className="gb-device-mixer">{utilityPanels.mixer}</section>
  </div>;

  return <HarmonyContext.Provider value={g.harmony}><DisplayThemeContext.Provider value={theme}><section id="groovebox" ref={rootRef} data-lcd={theme} className={`instrument-workspace ${midi.learn ? "midi-learn" : ""}`} aria-label="Nadrisk groovebox">{about && <div className="about-overlay" role="dialog" aria-modal="true" aria-label="About Nadrisk" onClick={e => { if (e.target === e.currentTarget) setAbout(false); }}><div className="about-dialog"><AboutSection /><button className="gb-cycle about-close" aria-label="Close about" onClick={() => setAbout(false)}>CLOSE</button></div></div>}
    <div className="workspace-heading"><span><span className="status-dot" /> NAD_RACK.nad</span><span className="gb-heading-tools"><button className="gb-cycle" aria-label={g.playing ? "Pause transport" : "Play transport"} aria-pressed={g.playing} onClick={g.togglePlay}>{g.playing ? "■ STOP" : "▶ PLAY"}</button><span className="gb-cycle" aria-hidden>{g.bpm} BPM</span><button className="gb-cycle" aria-label="Global tune down" onClick={() => g.setTune(Math.max(-12, g.tune - 1))}>−</button><button className="gb-cycle" aria-label="Global tune reset" title="Double-tap to reset" onDoubleClick={() => g.setTune(0)}>TUNE {g.tune > 0 ? "+" : ""}{g.tune}</button><button className="gb-cycle" aria-label="Global tune up" onClick={() => g.setTune(Math.min(12, g.tune + 1))}>+</button><button className="gb-cycle" aria-label="Global key" title="Tap: next key · moves every pitched pad" onClick={() => g.setHarmony({ ...g.harmony, key: (g.harmony.key + 1) % 12 })}>KEY {NOTE_NAMES[g.harmony.key]}</button><button className="gb-cycle" aria-label="Global scale" aria-pressed={g.harmony.scale !== "off"} onClick={() => g.setHarmony({ ...g.harmony, scale: HARMONY_SCALES[(HARMONY_SCALES.indexOf(g.harmony.scale) + 1) % HARMONY_SCALES.length] })}>SCL {g.harmony.scale.toUpperCase()}</button><button className="gb-cycle" aria-label="Display theme" onClick={() => onThemeChange(nextDisplayTheme(theme))}>DISP: {DISPLAY_THEMES.find(([value]) => value === theme)?.[1]}</button><button className="gb-cycle" aria-label="About" aria-pressed={about} onClick={() => setAbout(true)}>ABOUT</button></span><span className="workspace-index">01 / GROOVEBOX</span></div>
    <div className="gb-fixed-layout">
      <PatchNode label="PADS 4X4" tag="INSTRUMENT RACK" className="gb-rack">
      <RepeatBar repeat={g.repeat} onRepeat={g.setRepeat} rec={g.rec} onRec={g.setRec} onNew={g.newBlank} />
      <PadGrid slots={g.slots} selected={g.selected} padRefs={g.padRefs} onHit={hit} onRelease={g.release} velMode={g.repeat.on} onVel={g.setPadVel} />
      {(g.repeat.on || g.rec) && <span className="patch-small gb-seq-hint">{g.rec ? (g.playing ? "recording · hits snap to the nearest 1/16 step" : "press play to record into the sequencer") : "slide your finger up / down a pad to change repeat velocity"}</span>}
      </PatchNode>
      <div className={`gb-workspaces utility-active-${utility} ${utility === "seq" ? "seq-wide" : ""}`}>
        <PatchNode label={`SLOT ${String(g.selected + 1).padStart(2, "0")} ${s.engine.toUpperCase()}`} tag="INSTRUMENT" className="gb-editor gb-workspace-panel">
          <ResetScope.Provider value={`slot${g.selected}`}><SlotEditor slot={s} peaks={g.peaks[g.selected]} onChange={g.updateSelected} onLoad={g.loadSelected} onLoadId={g.loadSelectedId} onLoadFolder={g.loadFolder} /></ResetScope.Provider>
        </PatchNode>
        <div className="gb-desktop-views">
          <nav className="gb-view-switch" aria-label="Desktop workspace view"><button aria-pressed={desktopView === "devices"} onClick={() => setDesktopView("devices")}>DEVICES</button><button aria-pressed={desktopView === "sequence"} onClick={() => setDesktopView("sequence")}>SEQ / PERF</button></nav>
          {desktop && desktopView === "devices" && <div className="gb-desktop-view active">{desktopDevices}</div>}
          {desktop && desktopView === "sequence" && <div className="gb-desktop-view active">{seqPerformancePanel}</div>}
        </div>
        <PatchNode label={UTILITY_LABELS[utility]} tag="UTILITY" className="gb-utility gb-workspace-panel gb-mobile-utility">
          <nav className="gb-utility-nav" aria-label="Utility workspace">{UTILITIES.map(k => <button key={k} aria-pressed={utility === k} onClick={() => setUtility(k)}>{UTILITY_LABELS[k]}</button>)}</nav>
          {!desktop && <div className={`gb-utility-body utility-${utility}`}>{utilityContent}</div>}
        </PatchNode>
      </div>
    </div>
    <div className="workspace-footer"><span><AudioLines size={13} />{g.error || (g.rec && g.playing ? "● RECORDING INTO PATTERN" : g.queued != null ? `PATTERN ${"ABCD"[g.queued]} QUEUED · NEXT BAR` : g.playing ? "SEQUENCER RUNNING" : "TAP A PAD OR PRESS PLAY")}</span><span>DRUM / SYNTH / SAMPLER <span className="footer-separator">/</span> WEB AUDIO</span><span className="workspace-index">NADRISK © 2026</span></div>
  </section></DisplayThemeContext.Provider></HarmonyContext.Provider>;
}
