import { useState, type ReactNode } from "react";
import PixelScreen, { Tap, XYZone, Zone } from "@/pixel/PixelScreen";
import { textWidth } from "@/pixel/font";
import type { Px } from "@/pixel/draw";
import type { ADSR, FilterKind, Wave } from "@/audio/voices";

export const KX = [16, 48, 80, 112];
export const f01 = (v: number, a: number, b: number) => (v - a) / (b - a || 1);
export const ms = (v: number) => `${Math.round(v * 1000)}MS`;
export const pct = (v: number) => `${Math.round(v * 100)}%`;
export const hz = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${Math.round(v)}`);
export const st = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v)}ST`;

export type Knob = { label: string; short: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; set: (v: number) => void };

// Measured tab layout: each tab is as wide as its word plus padding, right-aligned with 1px gaps.
export function tabLayout(pages: readonly string[]) {
  const widths = pages.map(pg => textWidth(pg) + 2);
  const total = widths.reduce((a, b) => a + b, 0) + pages.length - 1;
  let x = 128 - total;
  return pages.map((pg, i) => { const t = { pg, x, w: widths[i] }; x += widths[i] + 1; return t; });
}

// Inverted title bar with machine name, live readout and page tabs.
export function drawHeader(p: Px, name: string, readout: string, pages: readonly string[], page: string) {
  p.invert(0, 0, 128, 9);
  const tabs = tabLayout(pages);
  p.text(name.slice(0, 8), 2, 2, false);
  const maxReadout = Math.max(0, Math.floor((tabs[0].x - 40) / 4));
  p.text(readout.slice(0, maxReadout), 38, 2, false);
  tabs.forEach(({ pg, x, w }) => { if (pg === page) { p.rect(x, 1, w, 7, false); p.text(pg, x + 1, 2); } else p.text(pg, x + 1, 2, false); });
}

export function tabZones(pages: readonly string[], page: string, setPage: (p: string) => void) {
  return tabLayout(pages).map(({ pg, x, w }) => <Tap key={pg} x={x} y={0} w={w} h={9} label={`Page ${pg}`} pressed={pg === page} onClick={() => setPage(pg)} />);
}

export function drawKnobs(p: Px, knobs: Knob[]) {
  knobs.forEach((k, i) => { const x = (knobs.length < 4 ? 64 - (knobs.length - 1) * 16 + i * 32 : KX[i]); p.knob(x, 51, f01(k.value, k.min, k.max), 4); p.textC(k.short, x, 58); });
}

export function knobZones(knobs: Knob[], page: string, show: (s: string) => void) {
  return knobs.map((k, i) => <Zone key={page + k.label} x={(knobs.length < 4 ? 64 - (knobs.length - 1) * 16 + i * 32 : KX[i]) - 15} y={45} w={30} h={19} label={k.label} value={k.value} min={k.min} max={k.max} step={k.step} onChange={v => { k.set(v); show(`${k.short} ${k.fmt(v)}`); }} />);
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
  return <>
    <XYZone x={nodes[0][0] - 6} y={nodes[0][1] - 6} w={12} h={14} label="Drag envelope attack" onDrag={(dx) => set({ ...env, a: clamp(env.a + dx * 2, .001, 2) })} />
    <XYZone x={nodes[1][0] - 6} y={nodes[1][1] - 7} w={12} h={14} label="Drag envelope decay and sustain" onDrag={(dx, dy) => set({ ...env, d: clamp(env.d + dx * 2, .01, 2), s: clamp(env.s - dy, 0, 1) })} />
    <XYZone x={nodes[2][0] - 6} y={nodes[2][1] - 7} w={12} h={14} label="Drag envelope release" onDrag={(dx) => set({ ...env, r: clamp(env.r + dx * 3, .01, 3) })} />
  </>;
}

export const envKnobs = (env: ADSR, set: (e: ADSR) => void): Knob[] => (["a", "d", "s", "r"] as const).map(k => ({
  label: k.toUpperCase(), short: { a: "ATK", d: "DEC", s: "SUS", r: "REL" }[k], value: env[k],
  min: k === "a" ? .001 : k === "s" ? 0 : .01, max: k === "s" ? 1 : k === "r" ? 3 : 2, step: k === "a" ? .001 : .01,
  fmt: k === "s" ? pct : ms, set: (v: number) => set({ ...env, [k]: v }),
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

// Shared panel shell: screen with header tabs + knob row, body drawn per page.
export function Panel({ name, pages, label, knobs, body, extra, deps }: {
  name: string; pages: readonly string[]; label: string; knobs: (page: string) => Knob[];
  body: (p: Px, page: string) => void; extra?: (page: string) => ReactNode; deps: unknown[];
}) {
  const [page, setPage] = useState(pages[0]);
  const [readout, setReadout] = useState("");
  const ks = knobs(page);
  return <div className="px-panel">
    <PixelScreen label={`${label} screen, page ${page}`} deps={[page, readout, ...deps]} draw={p => { drawHeader(p, name, readout, pages, page); body(p, page); drawKnobs(p, ks); }}>
      {tabZones(pages, page, setPage)}
      {extra?.(page)}
      {knobZones(ks, page, setReadout)}
    </PixelScreen>
  </div>;
}
