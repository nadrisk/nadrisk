import { useState, useRef, type ReactNode, useEffect, useContext } from "react";
import { createPortal } from "react-dom";
import PixelScreen, { Tap, XYZone, Zone, DisplayThemeContext } from "@/pixel/PixelScreen";
import { textWidth } from "@/pixel/font";
import type { Px } from "@/pixel/draw";
import type { ADSR, FilterKind, Wave } from "@/audio/voices";

export const KX = [16, 48, 80, 112];
export const f01 = (v: number, a: number, b: number) => (v - a) / (b - a || 1);
export const ms = (v: number) => `${Math.round(v * 1000)}MS`;
export const pct = (v: number) => `${Math.round(v * 100)}%`;
export const hz = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${Math.round(v)}`);
export const fineSt = (cents: number) => { const v = Math.round(cents) / 100; return `${v > 0 ? "+" : v < 0 ? "-" : ""}${Math.abs(v).toFixed(2)}`; };
export const st = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v)}ST`;

export type Knob = { label: string; short: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; set: (v: number) => void; log?: boolean; bare?: boolean; /** Double-tap home value. */ reset?: number };

// Measured tab layout: each tab is as wide as its word plus padding, right-aligned with 1px gaps.
export function tabLayout(pages: readonly string[]) {
  const widths = pages.map(pg => textWidth(pg) + 2);
  const total = widths.reduce((a, b) => a + b, 0) + pages.length - 1;
  let x = 128 - total;
  return pages.map((pg, i) => { const t = { pg, x, w: widths[i] }; x += widths[i] + 1; return t; });
}

// Inverted title bar with machine name, live readout and page tabs.
export function compactHeaderText(readout: string, width: number) {
  if (textWidth(readout) <= width) return readout;
  let compact = readout.replace(/(\d{4,})MS$/, (_, ms: string) => `${Number(ms) / 1000}S`).replace(/\s+/g, "");
  // Hard guard: never draw into the first tab.
  while (compact.length && textWidth(compact) > width) compact = compact.slice(0, -1);
  return compact;
}

type HeaderAction = { text: string; label: string; pressed?: boolean; onClick: () => void };
type KnobAction = HeaderAction & { knobLabel: string };
// Shared reference for drawn knobs, their hit containers and keys above them.
export function knobLayout(knobs: Knob[]) {
  return knobs.map((k, i) => ({ knob: k, x: knobs.length < 4 ? 64 - (knobs.length - 1) * 16 + i * 32 : KX[i] }));
}
const KNOB_ACTION_TOP = 39, KNOB_ACTION_HEIGHT = 7;
export function drawHeader(p: Px, name: string, readout: string, pages: readonly string[], page: string, compactReadout = false, action?: HeaderAction) {
  p.invert(0, 0, 128, 9);
  const tabs = tabLayout(pages);
  const contentEnd = (tabs[0]?.x ?? 128) - (action ? textWidth(action.text) + 6 : 0);
  if (compactReadout) {
    const width = contentEnd - 4;
    p.text(readout ? compactHeaderText(readout, width) : name.slice(0, Math.floor((width + 1) / 4)), 2, 2, false);
  } else {
    p.text(name.slice(0, 8), 2, 2, false);
    const maxReadout = Math.max(0, Math.floor((contentEnd - 40) / 4));
    p.text(readout.slice(0, maxReadout), 38, 2, false);
  }
  if (action) {
    const w = textWidth(action.text) + 4;
    p.rect(contentEnd, 1, w, 7, !!action.pressed);
    p.text(action.text, contentEnd + 2, 2, !action.pressed);
  }
  tabs.forEach(({ pg, x, w }) => { if (pg === page) { p.rect(x, 1, w, 7, false); p.text(pg, x + 1, 2); } else p.text(pg, x + 1, 2, false); });
}

export function tabZones(pages: readonly string[], page: string, setPage: (p: string) => void) {
  return tabLayout(pages).map(({ pg, x, w }) => <Tap key={pg} x={x} y={0} w={w} h={9} label={`Page ${pg}`} pressed={pg === page} onClick={() => setPage(pg)} />);
}

/** Frequency/pitch knobs (Hz readout over a wide positive range) move perceptually, so each turn covers an equal musical interval. */
export const isLogKnob = (k: Knob) => k.log ?? (k.min > 0 && k.max / k.min >= 8 && /HZ$|\dK$/i.test(k.fmt(k.max)));
export function drawKnobs(p: Px, knobs: Knob[]) {
  knobLayout(knobs).forEach(({ knob: k, x }) => { p.knob(x, 51, isLogKnob(k) ? Math.log(k.value / k.min) / Math.log(k.max / k.min) : f01(k.value, k.min, k.max), 4); p.textC(k.short, x, 58); });
}

export function knobZones(knobs: Knob[], page: string, show: (s: string, knobLabel?: string) => void, action?: KnobAction) {
  return knobLayout(knobs).map(({ knob: k, x }) => {
    const zone = <Zone key={page + k.label} x={x - 15} y={45} w={30} h={19} label={k.label} value={k.value} min={k.min} max={k.max} step={k.step} log={isLogKnob(k)} reset={k.reset} onChange={v => { k.set(v); show(k.short === "NOTE" || k.bare ? k.fmt(v) : `${k.short} ${k.fmt(v)}`, k.label); }} />;
    if (!action || k.label !== action.knobLabel) return zone;
    return <div key={page + k.label} className="px-knob-column" style={{ left: `${(x - 15) / 128 * 100}%`, top: `${KNOB_ACTION_TOP / 64 * 100}%`, width: `${30 / 128 * 100}%`, height: `${(64 - KNOB_ACTION_TOP) / 64 * 100}%` }}>
      <Tap x={0} y={0} w={textWidth(action.text) + 4} h={KNOB_ACTION_HEIGHT} label={action.label} pressed={action.pressed} onClick={action.onClick} />
      {zone}
    </div>;
  });
}

// Stepped ADSR breakpoint graph.
export function drawEnvGraph(p: Px, env: ADSR, x0 = 2, y0 = 11, w = 124, h = 34) {
  const t = env.a + env.d + env.r + .6, X = (v: number) => x0 + Math.round(v / t * (w - 2)), Y = (v: number) => y0 + h - 1 - Math.round(v * (h - 4));
  const pts: [number, number][] = [[X(0), Y(0)], [X(env.a), Y(1)], [X(env.a + env.d), Y(env.s)], [X(env.a + env.d + .6), Y(env.s)], [X(t), Y(0)]];
  for (let x = x0; x < x0 + w; x += 4) p.dot(x, y0 + h);
  pts.slice(1, 4).forEach(([x]) => p.line(x, y0 + 1, x, y0 + h - 1, true));
  for (let i = 0; i < 4; i++) p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
  pts.slice(1, 4).forEach(([x, y]) => p.rect(x - 1, y - 1, 3, 3));
}

export function EnvZones({ env, set, x0 = 2, y0 = 11, w = 124, h = 34 }: { env: ADSR; set: (env: ADSR) => void; x0?: number; y0?: number; w?: number; h?: number }) {
  const t = env.a + env.d + env.r + .6, X = (v: number) => x0 + Math.round(v / t * (w - 2)), Y = (v: number) => y0 + h - 1 - Math.round(v * (h - 4));
  const nodes = [[X(env.a), Y(1)], [X(env.a + env.d), Y(env.s)], [X(env.a + env.d + .6), Y(env.s)]];
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  // Curved, slowed drags: times scale relative to their current value so short times stay fine-grained.
  const tm = (v: number, dx: number, min: number, max: number) => clamp((v + .01) * 2 ** (dx * 1.2) - .01, min, max);
  return <>
    <XYZone x={nodes[0][0] - 6} y={nodes[0][1] - 6} w={12} h={14} label="Drag envelope attack" onDrag={(dx) => set({ ...env, a: tm(env.a, dx, .001, 2) })} />
    <XYZone x={nodes[1][0] - 6} y={nodes[1][1] - 7} w={12} h={14} label="Drag envelope decay and sustain" onDrag={(dx, dy) => set({ ...env, d: tm(env.d, dx, .01, 2), s: clamp(env.s - dy / 3, 0, 1) })} />
    <XYZone x={nodes[2][0] - 6} y={nodes[2][1] - 7} w={12} h={14} label="Drag envelope release" onDrag={(dx) => set({ ...env, r: tm(env.r, dx, .01, 3) })} />
  </>;
}

export const envKnobs = (env: ADSR, set: (e: ADSR) => void, home?: ADSR): Knob[] => (["a", "d", "s", "r"] as const).map(k => ({
  label: k.toUpperCase(), short: { a: "ATK", d: "DEC", s: "SUS", r: "REL" }[k], value: env[k],
  min: k === "a" ? .001 : k === "s" ? 0 : .01, max: k === "s" ? 1 : k === "r" ? 3 : 2, step: k === "a" ? .001 : .01,
  fmt: k === "s" ? pct : ms, reset: home?.[k], set: (v: number) => set({ ...env, [k]: v }),
}));

// Stepped filter-magnitude curve.
export function drawFilterCurve(p: Px, kind: FilterKind, cutoff: number, res: number, x0 = 2, y0 = 11, w = 124, h = 34) {
  const cx = x0 + Math.round(f01(Math.log(cutoff / 40), 0, Math.log(400)) * (w - 2));
  const top = y0 + Math.floor(h * .46), bot = y0 + h - 2, bump = Math.min(Math.floor(h * .4), Math.round(res / 1.8));
  let prev = -1;
  for (let x = x0; x < x0 + w; x++) {
    let y: number;
    if (kind === "lowpass") y = x < cx ? top : Math.min(bot, top + Math.round((x - cx) / 3));
    else if (kind === "highpass") y = x > cx ? top : Math.min(bot, top + Math.round((cx - x) / 3));
    else if (kind === "bandpass") y = Math.min(bot, top + Math.round(Math.abs(x - cx) / 2));
    else y = Math.abs(x - cx) < 6 ? bot : top; // notch
    if (Math.abs(x - cx) <= 2 && kind !== "notch") y = Math.max(y0, y - bump);
    if (prev >= 0) p.line(x - 1, prev, x, y);
    prev = y;
  }
  p.line(cx, y0, cx, y0 + h, true);
}

// Tiny waveform icon in a box.
export function drawWaveIcon(p: Px, wave: Wave | "additive", x: number, y: number, w = 20, h = 12) {
  p.box(x, y, w, h);
  const mid = y + Math.floor(h / 2);
  for (let i = 1; i < w - 1; i++) {
    const t = i / (w - 1); let dy = 0;
    if (wave === "sine") dy = Math.round(Math.sin(t * Math.PI * 2) * (h / 2 - 2));
    else if (wave === "triangle") dy = Math.round((Math.abs(t * 4 - 2) - 1) * (h / 2 - 2));
    else if (wave === "sawtooth") dy = Math.round((t * 2 - 1) * (h / 2 - 2));
    else if (wave === "square") dy = (t < .5 ? -1 : 1) * (h / 2 - 2);
    else { const bh = Math.round((Math.sin(i * 12.9) * .5 + .5) * (h - 3)); p.rect(x + i, y + h - 2 - bh, 1, bh); continue; }
    p.dot(x + i, mid - dy);
  }
}

// Pixel-style typed value entry (same look as the sample BPM box).
function ValueDialog({ title, value, parse, onClose, onSave }: { title: string; value: string; parse: (t: string) => number | null; onClose: () => void; onSave: (v: number) => void }) {
  const theme = useContext(DisplayThemeContext);
  const [v, setV] = useState(value), [bad, setBad] = useState(false);
  const submit = () => { const n = parse(v); if (n == null) { setBad(true); return; } onSave(n); onClose(); };
  return createPortal(
    <div data-lcd={theme} className="instrument-workspace gb-rename-portal fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4" onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={e => { e.preventDefault(); submit(); }} className="w-full max-w-sm border-4 border-foreground bg-background text-foreground" style={{ fontFamily: "Silkscreen, monospace" }}>
        <div className="bg-foreground px-3 py-1 text-background text-sm uppercase tracking-widest">{title}{bad ? " · ?" : ""}</div>
        <div className="p-4 space-y-4">
          <input autoFocus value={v} maxLength={12} aria-label={`${title} value`} onChange={e => { setV(e.target.value); setBad(false); }}
            onKeyDown={e => { if (e.key === "Escape") onClose(); }} onFocus={e => e.currentTarget.select()}
            className="w-full border-2 border-foreground bg-background px-3 py-2 text-2xl tracking-[0.2em] text-foreground outline-none" style={{ fontFamily: "Silkscreen, monospace", borderRadius: 0 }} />
          <div className="grid grid-cols-2 gap-3 text-sm uppercase tracking-widest">
            <button type="button" onClick={onClose} className="border-2 border-foreground py-2">Cancel</button>
            <button type="submit" className="border-2 border-foreground bg-foreground py-2 text-background">OK</button>
          </div>
        </div>
      </form>
    </div>, document.body);
}

// Shared panel shell: screen with header tabs + knob row, body drawn per page.
export function Panel({ name, pages, label, knobs, body, extra, deps, onPage, live, compactReadout = false, parseReadout, headerAction, knobAction }: {
  name: string; pages: readonly string[]; label: string; knobs: (page: string) => Knob[];
  body: (p: Px, page: string) => void; extra?: (page: string) => ReactNode; deps: unknown[]; onPage?: (page: string) => void; live?: (page: string) => (() => boolean) | undefined; compactReadout?: boolean;
  /** Opt-in: double-tapping the header readout of this knob opens typed entry. */
  parseReadout?: (k: Knob) => ((text: string) => number | null) | undefined;
  headerAction?: HeaderAction;
  knobAction?: (page: string) => KnobAction | undefined;
}) {
  const [page, setPage] = useState(pages[0]);
  useEffect(() => { onPage?.(page); }, [page, onPage]);
  const [readout, setReadout] = useState("");
  const [readoutKnob, setReadoutKnob] = useState("");
  const [editing, setEditing] = useState(false);
  const readoutTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastTap = useRef(0);
  useEffect(() => {
    if (!compactReadout) return;
    setReadout(""); setEditing(false);
    return () => clearTimeout(readoutTimer.current);
  }, [page, name, compactReadout]);
  const armTimer = () => { clearTimeout(readoutTimer.current); readoutTimer.current = setTimeout(() => setReadout(""), 1600); };
  const showReadout = (text: string, knobLabel = "") => {
    setReadout(text); setReadoutKnob(knobLabel);
    if (compactReadout) armTimer();
  };
  const ks = knobs(page);
  const action = knobAction?.(page);
  const editKnob = readout ? ks.find(k => k.label === readoutKnob) : undefined;
  const parser = editKnob && parseReadout?.(editKnob);
  const tabX = tabLayout(pages)[0]?.x ?? 128;
  return <div className="px-panel">
    <PixelScreen label={`${label} screen, page ${page}`} live={live?.(page)} deps={[page, readout, compactReadout, headerAction?.pressed, action?.pressed, ...deps]} draw={p => {
      drawHeader(p, name, readout, pages, page, compactReadout, headerAction); body(p, page); drawKnobs(p, ks);
      const anchor = action && knobLayout(ks).find(({ knob }) => knob.label === action.knobLabel);
      if (action && anchor) {
        const w = textWidth(action.text) + 4, x = anchor.x - w / 2;
        if (action.pressed) p.rect(x, KNOB_ACTION_TOP, w, KNOB_ACTION_HEIGHT);
        else p.box(x, KNOB_ACTION_TOP, w, KNOB_ACTION_HEIGHT);
        p.textC(action.text, anchor.x, KNOB_ACTION_TOP + 1, !action.pressed);
      }
    }}>
      {tabZones(pages, page, setPage)}
      {headerAction && <Tap x={tabX - textWidth(headerAction.text) - 6} y={0} w={textWidth(headerAction.text) + 4} h={9} label={headerAction.label} pressed={headerAction.pressed} onClick={headerAction.onClick} />}
      {parser && <Tap x={0} y={0} w={tabX - 1} h={9} label="Type exact value" onClick={() => {
        const now = performance.now();
        if (now - lastTap.current < 400) { lastTap.current = 0; clearTimeout(readoutTimer.current); setEditing(true); } else lastTap.current = now;
      }} />}
      {extra?.(page)}
      {knobZones(ks, page, showReadout, action)}
    </PixelScreen>
    {editing && editKnob && parser && <ValueDialog title={editKnob.label} value={editKnob.fmt(editKnob.value)} parse={parser}
      onClose={() => { setEditing(false); armTimer(); }}
      onSave={v => { const c = Math.min(editKnob.max, Math.max(editKnob.min, v)); editKnob.set(c); setReadout(editKnob.bare ? editKnob.fmt(c) : `${editKnob.short} ${editKnob.fmt(c)}`); }} />}
  </div>;
}
