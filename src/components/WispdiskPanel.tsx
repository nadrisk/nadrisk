import { memo, useState } from "react";
import PixelScreen, { Tap, Zone } from "@/pixel/PixelScreen";
import type { Px } from "@/pixel/draw";
import type { Slot } from "@/hooks/useGroovebox";

type Page = "SMP" | "ENV" | "GRN";
const PAGES: Page[] = ["SMP", "ENV", "GRN"];
const KX = [30, 58, 86, 114];
const f01 = (v: number, a: number, b: number) => (v - a) / (b - a || 1);
const ms = (v: number) => `${Math.round(v * 1000)}MS`, pct = (v: number) => `${Math.round(v * 100)}%`;

// WISPDISK: the sampler editor as a 128x64 1-bit hardware screen.
function WispdiskPanel({ slot, peaks, onChange }: { slot: Slot; peaks: number[] | null; onChange: (p: Partial<Slot>) => void }) {
  const sm = slot.sampler, env = sm.env;
  const M = (p: Partial<typeof sm>) => onChange({ sampler: { ...sm, ...p } });
  const [page, setPage] = useState<Page>("SMP");
  const [readout, setReadout] = useState("");
  const show = (s: string) => setReadout(s);

  type K = { label: string; short: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; set: (v: number) => void };
  const knobs: K[] = page === "SMP" ? [
    { label: "Start", short: "STRT", value: sm.start, min: 0, max: .95, step: .005, fmt: pct, set: start => M({ start }) },
    { label: "Pitch", short: "PTCH", value: sm.pitch, min: -24, max: 24, step: 1, fmt: v => `${v > 0 ? "+" : ""}${v}ST`, set: pitch => M({ pitch }) },
    { label: "Pan", short: "PAN", value: slot.pan, min: -1, max: 1, step: .01, fmt: v => (v === 0 ? "C" : v < 0 ? `L${Math.round(-v * 100)}` : `R${Math.round(v * 100)}`), set: pan => onChange({ pan }) },
    { label: "R", short: "REL", value: env.r, min: .01, max: 3, step: .01, fmt: ms, set: r => M({ env: { ...env, r } }) },
  ] : page === "ENV" ? (["a", "d", "s", "r"] as const).map(k => ({
    label: k.toUpperCase(), short: { a: "ATK", d: "DEC", s: "SUS", r: "REL" }[k], value: env[k], min: k === "a" ? .001 : k === "s" ? 0 : .01, max: k === "s" ? 1 : k === "r" ? 3 : 2, step: k === "a" ? .001 : .01,
    fmt: k === "s" ? pct : ms, set: (v: number) => M({ env: { ...env, [k]: v } }),
  })) : [
    { label: "Position", short: "POS", value: sm.start, min: 0, max: .95, step: .005, fmt: pct, set: start => M({ start }) },
    { label: "Grain size", short: "SIZE", value: sm.grainSize ?? .08, min: .01, max: .4, step: .005, fmt: ms, set: grainSize => M({ grainSize }) },
    { label: "Spray", short: "SPRY", value: sm.spray ?? .1, min: 0, max: 1, step: .01, fmt: pct, set: spray => M({ spray }) },
    { label: "Pitch", short: "PTCH", value: sm.pitch, min: -24, max: 24, step: 1, fmt: v => `${v > 0 ? "+" : ""}${v}ST`, set: pitch => M({ pitch }) },
  ];

  const wave = (p: Px, x0: number, y0: number, w: number, h: number) => {
    const lane = Math.floor(h / 2);
    for (let x = 0; x < w; x++) {
      const v = peaks ? peaks[Math.floor(x / w * peaks.length)] ?? 0 : 0, a = Math.max(0, Math.round(v * (lane / 2 - 1)));
      for (let l = 0; l < 2; l++) { const m = y0 + l * lane + Math.floor(lane / 2); p.rect(x0 + x, m - a, 1, a * 2 + 1); }
    }
    const sx = x0 + Math.round(sm.start * (w - 1));
    for (let y = y0; y < y0 + h; y += 2) p.dot(sx, y);
    p.rect(sx, y0, 3, 1);
  };

  const draw = (p: Px) => {
    // Header: inverted bar, name, page tabs.
    p.invert(0, 0, 128, 9);
    p.text((slot.name || "SMP").slice(0, 8), 2, 2, false);
    p.text(readout.slice(0, 9), 38, 2, false);
    PAGES.forEach((pg, i) => { const x = 81 + i * 15; if (pg === page) { p.rect(x, 1, 14, 7, false); p.text(pg, x + 1, 2); } else p.text(pg, x + 1, 2, false); });
    // Left: level fader.
    p.fader(1, 11, 10, 32, slot.level / 100); p.text("LEV", 0, 46);
    if (page === "SMP") {
      p.box(14, 11, 17, 7); if (sm.reverse) p.invert(15, 12, 15, 5); p.text("REV", 16, 12, !sm.reverse);
      p.box(33, 11, 21, 7); if (sm.loop) p.invert(34, 12, 19, 5); p.text("LOOP", 35, 12, !sm.loop);
      p.box(56, 11, 21, 7, true); p.text(`${sm.pitch > 0 ? "+" : ""}${sm.pitch}`, 59, 12);
      p.text((sm.sampleName || "NO SAMPLE").replace(/\.[a-z0-9]+$/i, "").slice(0, 9), 80, 12);
      p.box(14, 19, 114, 26); wave(p, 15, 20, 112, 24);
    } else if (page === "ENV") {
      const t = env.a + env.d + env.r + .6, X = (v: number) => 14 + Math.round(v / t * 112), Y = (v: number) => 43 - Math.round(v * 30);
      const pts: [number, number][] = [[X(0), Y(0)], [X(env.a), Y(1)], [X(env.a + env.d), Y(env.s)], [X(env.a + env.d + .6), Y(env.s)], [X(t), Y(0)]];
      for (let x = 14; x < 128; x += 4) p.dot(x, 44);
      pts.slice(1, 4).forEach(([x]) => p.line(x, 12, x, 43, true));
      for (let i = 0; i < 4; i++) p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      pts.slice(1, 4).forEach(([x, y]) => p.rect(x - 1, y - 1, 3, 3));
    } else {
      p.box(14, 11, 21, 7); if (sm.grain) p.invert(15, 12, 19, 5); p.text("GRN", 18, 12, !sm.grain);
      p.box(37, 11, 21, 7, !sm.grain); if (sm.freeze) p.invert(38, 12, 19, 5); p.text("FRZ", 41, 12, !sm.freeze);
      p.box(14, 19, 114, 26); wave(p, 15, 20, 112, 24);
      const gw = Math.max(2, Math.round((sm.grainSize ?? .08) / .4 * 30)), sp = Math.round((sm.spray ?? .1) * 20), gx = 15 + Math.round(sm.start * 111);
      p.box(Math.max(15, gx - sp), 20, Math.min(gw + sp * 2, 127 - Math.max(15, gx - sp)), 24, true);
    }
    knobs.forEach((k, i) => { p.knob(KX[i], 51, f01(k.value, k.min, k.max)); p.textC(k.short, KX[i], 59); });
  };

  return <div className="px-panel">
    <PixelScreen label={`Wispdisk sampler screen, page ${page}`} draw={draw} deps={[page, readout, slot.name, slot.level, slot.pan, sm, peaks]}>
      {PAGES.map((pg, i) => <Tap key={pg} x={81 + i * 15} y={0} w={14} h={9} label={`Page ${pg}`} pressed={pg === page} onClick={() => setPage(pg)} />)}
      <Zone x={0} y={10} w={12} h={42} label="Volume" value={slot.level} min={0} max={100} onChange={level => { onChange({ level }); show(`LEV ${level}%`); }} />
      {page === "SMP" && <>
        <Tap x={14} y={10} w={17} h={9} label="Reverse sample" pressed={!!sm.reverse} onClick={() => M({ reverse: !sm.reverse })} />
        <Tap x={33} y={10} w={21} h={9} label="Loop" pressed={sm.loop} onClick={() => M({ loop: !sm.loop })} />
      </>}
      {page === "GRN" && <>
        <Tap x={14} y={10} w={21} h={9} label="Grain mode" pressed={!!sm.grain} onClick={() => M({ grain: !sm.grain })} />
        <Tap x={37} y={10} w={21} h={9} label="Grain freeze" pressed={!!sm.freeze} disabled={!sm.grain} onClick={() => M({ freeze: !sm.freeze })} />
      </>}
      {page !== "ENV" && <Zone x={14} y={19} w={114} h={26} horizontal label="Sample waveform start" value={sm.start} min={0} max={.95} step={.005} onChange={start => { M({ start }); show(`STRT ${pct(start)}`); }} />}
      {knobs.map((k, i) => <Zone key={page + k.label} x={KX[i] - 13} y={44} w={26} h={20} label={k.label} value={k.value} min={k.min} max={k.max} step={k.step} onChange={v => { k.set(v); show(`${k.short} ${k.fmt(v)}`); }} />)}
    </PixelScreen>
  </div>;
}
export default memo(WispdiskPanel);
