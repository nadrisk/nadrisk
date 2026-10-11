import { memo, useState } from "react";
import PixelScreen, { Tap, Zone } from "@/pixel/PixelScreen";
import { EnvZones } from "./pixelScreens";
import type { Px } from "@/pixel/draw";
import type { Slot } from "@/hooks/useGroovebox";

type Page = "SMP" | "ENV" | "GRN" | "STR";
const PAGES: Page[] = ["SMP", "ENV", "GRN", "STR"];
const KX = [16, 48, 80, 112];
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
  const knobs: K[] = page === "SMP" ? (sm.loop ? [
    { label: "Loop start", short: "L-ST", value: sm.loopStartF ?? sm.start, min: 0, max: .95, step: .005, fmt: pct, set: v => M({ loopStartF: Math.max(v, sm.start), loopEnd: Math.max(sm.loopEnd ?? 1, Math.max(v, sm.start) + .02) }) },
    { label: "Loop end", short: "L-END", value: sm.loopEnd ?? 1, min: .05, max: 1, step: .005, fmt: pct, set: loopEnd => M({ loopEnd: Math.max(loopEnd, (sm.loopStartF ?? sm.start) + .02) }) },
    { label: "Loop crossfade", short: "XFD", value: sm.loopXfade ?? 0, min: 0, max: 1, step: .01, fmt: pct, set: loopXfade => M({ loopXfade }) },
    { label: "Pitch", short: "PTCH", value: sm.pitch, min: -24, max: 24, step: 1, fmt: v => `${v > 0 ? "+" : ""}${v}ST`, set: pitch => M({ pitch }) },
  ] : [
    { label: "Start", short: "STRT", value: sm.start, min: 0, max: .95, step: .005, fmt: pct, set: start => M({ start, end: Math.max(start + .02, sm.end ?? 1) }) },
    { label: "Sample end", short: "END", value: sm.end ?? 1, min: .05, max: 1, step: .005, fmt: pct, set: end => M({ end: Math.max(end, sm.start + .02) }) },
    { label: "Pitch", short: "PTCH", value: sm.pitch, min: -24, max: 24, step: 1, fmt: v => `${v > 0 ? "+" : ""}${v}ST`, set: pitch => M({ pitch }) },
    { label: "Pan", short: "PAN", value: slot.pan, min: -1, max: 1, step: .01, fmt: v => (v === 0 ? "C" : v < 0 ? `L${Math.round(-v * 100)}` : `R${Math.round(v * 100)}`), set: pan => onChange({ pan }) },
  ]) : page === "STR" ? [
    { label: "Stretch time", short: "TIME", value: sm.stretchAmt ?? 1, min: .25, max: 4, step: .01, fmt: v => `X${v.toFixed(2)}`, set: stretchAmt => M({ stretchAmt }) },
    { label: "Stretch grain", short: "GRN", value: sm.stretchGrain ?? .05, min: .01, max: .15, step: .001, fmt: ms, set: stretchGrain => M({ stretchGrain }) },
    { label: "Loop length in beats", short: "BEAT", value: sm.beats ?? 0, min: 0, max: 64, step: 1, fmt: v => v ? `${v}B` : "AUTO", set: beats => M({ beats }) },
    { label: "Slices", short: "SLC", value: sm.slices ?? 0, min: 0, max: 16, step: 1, fmt: v => v > 1 ? `${v}` : "OFF", set: slices => M({ slices }) },
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
      // Reverse mirrors the display so it matches the actual playback direction.
      const idx = sm.reverse ? peaks!.length - 1 - Math.floor(x / w * peaks!.length) : Math.floor(x / w * (peaks?.length ?? 1));
      const v = peaks ? peaks[idx] ?? 0 : 0, a = Math.max(0, Math.round(v * (lane / 2 - 1)));
      const f = x / w, out = !sm.loop && (f < sm.start || f > (sm.end ?? 1));
      for (let l = 0; l < 2; l++) { const m = y0 + l * lane + Math.floor(lane / 2); if (out) { if (x % 2 === 0) for (let yy = m - a; yy <= m + a; yy += 2) p.dot(x0 + x, yy); } else p.rect(x0 + x, m - a, 1, a * 2 + 1); }
    }
    const sx = x0 + Math.round(sm.start * (w - 1));
    for (let y = y0; y < y0 + h; y += 2) p.dot(sx, y);
    p.rect(sx, y0, 3, 1);
    if (!sm.loop && (sm.end ?? 1) < 1) { const ex = x0 + Math.round((sm.end ?? 1) * (w - 1)); for (let y = y0; y < y0 + h; y += 2) p.dot(ex, y); p.rect(ex - 2, y0 + h - 1, 3, 1); }
    if (sm.loop) { const lx = x0 + Math.round((sm.loopStartF ?? sm.start) * (w - 1)); for (let y = y0 + 1; y < y0 + h; y += 2) p.dot(lx, y); p.rect(lx, y0 + h - 1, 3, 1); }
    if (sm.loop) { const ex = x0 + Math.round((sm.loopEnd ?? 1) * (w - 1)); for (let y = y0; y < y0 + h; y += 2) p.dot(ex, y); p.rect(ex - 2, y0 + h - 1, 3, 1); }
  };

  const draw = (p: Px) => {
    // Header: inverted bar, name, page tabs.
    p.invert(0, 0, 128, 9);
    p.text((slot.name || "SMP").slice(0, 8), 2, 2, false);
    p.text(readout.slice(0, 6), 36, 2, false);
    PAGES.forEach((pg, i) => { const x = 68 + i * 15; if (pg === page) { p.rect(x, 1, 14, 7, false); p.text(pg, x + 1, 2); } else p.text(pg, x + 1, 2, false); });
    // Left: level fader.
    if (page === "SMP") {
      p.box(2, 11, 17, 7); if (sm.reverse) p.invert(3, 12, 15, 5); p.text("REV", 4, 12, !sm.reverse);
      p.box(21, 11, 21, 7); if (sm.loop) p.invert(22, 12, 19, 5); p.text("LOOP", 23, 12, !sm.loop);
      { const one = sm.mode === "one"; p.box(44, 11, 21, 7); if (one) p.invert(45, 12, 19, 5); p.text(one ? "ONE" : "ADSR", one ? 48 : 46, 12, !one); }
      p.text((sm.sampleName || "NO SAMPLE").replace(/\.[a-z0-9]+$/i, "").slice(0, 9), 68, 12);
      p.box(2, 19, 124, 26); wave(p, 3, 20, 122, 24);
    } else if (page === "ENV") {
      const t = env.a + env.d + env.r + .6, X = (v: number) => 2 + Math.round(v / t * 122), Y = (v: number) => 43 - Math.round(v * 30);
      const pts: [number, number][] = [[X(0), Y(0)], [X(env.a), Y(1)], [X(env.a + env.d), Y(env.s)], [X(env.a + env.d + .6), Y(env.s)], [X(t), Y(0)]];
      for (let x = 2; x < 126; x += 4) p.dot(x, 44);
      pts.slice(1, 4).forEach(([x]) => p.line(x, 12, x, 43, true));
      for (let i = 0; i < 4; i++) p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      pts.slice(1, 4).forEach(([x, y]) => p.rect(x - 1, y - 1, 3, 3));
    } else if (page === "STR") {
      const amt = sm.stretchAmt ?? 1, n = Math.round(sm.slices ?? 0);
      p.box(2, 11, 21, 7); if (sm.stretch) p.invert(3, 12, 19, 5); p.text("VNT", 6, 12, !sm.stretch);
      p.box(25, 11, 25, 7); if (sm.warp) p.invert(26, 12, 23, 5); p.text("WARP", 28, 12, !sm.warp);
      p.text(sm.warp ? `${sm.beats ? sm.beats + "B" : "AUTO"} BPM` : `X${amt.toFixed(2)}`, 54, 12);
      p.box(2, 19, 124, 26);
      // WARP / slicing view the whole loop; vintage stretch shows its new length (full width = x4).
      const w = sm.warp || n > 1 ? 122 : Math.max(8, Math.round(122 * (sm.stretch ? amt : 1) / 4)); wave(p, 3, 20, w, 24);
      if (n > 1) for (let k = 1; k < n; k++) { const x = 3 + Math.round(k * 122 / n); p.line(x, 20, x, 43, false); p.line(x, 20, x, 23); }
      else if (sm.stretch && !sm.warp) { const step = Math.max(3, Math.round((sm.stretchGrain ?? .05) * 120)); for (let x = 3 + step; x < 3 + w; x += step) p.line(x, 20, x, 22, true); }
      if (!sm.warp && n < 2) for (let x = 3 + Math.round(122 / 4); x < 125; x += 4) p.dot(x, 44);
    } else {
      p.box(2, 11, 21, 7); if (sm.grain) p.invert(3, 12, 19, 5); p.text("GRN", 6, 12, !sm.grain);
      p.box(25, 11, 21, 7, !sm.grain); if (sm.freeze) p.invert(26, 12, 19, 5); p.text("FRZ", 29, 12, !sm.freeze);
      p.box(2, 19, 124, 26); wave(p, 3, 20, 122, 24);
      const gw = Math.max(2, Math.round((sm.grainSize ?? .08) / .4 * 30)), sp = Math.round((sm.spray ?? .1) * 20), gx = 3 + Math.round(sm.start * 121);
      p.box(Math.max(3, gx - sp), 20, Math.min(gw + sp * 2, 125 - Math.max(3, gx - sp)), 24, true);
    }
    knobs.forEach((k, i) => { p.knob(KX[i], 51, f01(k.value, k.min, k.max), 4); p.textC(k.short, KX[i], 58); });
  };

  return <div className="px-panel">
    <PixelScreen label={`Wispdisk sampler screen, page ${page}`} draw={draw} deps={[page, readout, slot.name, slot.level, slot.pan, sm, peaks]}>
      {PAGES.map((pg, i) => <Tap key={pg} x={68 + i * 15} y={0} w={14} h={9} label={`Page ${pg}`} pressed={pg === page} onClick={() => setPage(pg)} />)}
      {page === "SMP" && <>
        <Tap x={2} y={10} w={17} h={9} label="Reverse sample" pressed={!!sm.reverse} onClick={() => M({ reverse: !sm.reverse })} />
        <Tap x={44} y={10} w={21} h={9} label="Sampler one-shot or ADSR mode" pressed={sm.mode === "one"} onClick={() => M({ mode: sm.mode === "one" ? "adsr" : "one" })} />
        <Tap x={21} y={10} w={21} h={9} label="Loop" pressed={sm.loop} onClick={() => M({ loop: !sm.loop })} />
      </>}
      {page === "STR" && <>
        <Tap x={2} y={10} w={21} h={9} label="Vintage stretch" pressed={!!sm.stretch} onClick={() => M({ stretch: !sm.stretch })} />
        <Tap x={25} y={10} w={25} h={9} label="Warp to tempo" pressed={!!sm.warp} onClick={() => M({ warp: !sm.warp })} />
      </>}
      {page === "GRN" && <>
        <Tap x={2} y={10} w={21} h={9} label="Grain mode" pressed={!!sm.grain} onClick={() => M({ grain: !sm.grain })} />
        <Tap x={25} y={10} w={21} h={9} label="Grain freeze" pressed={!!sm.freeze} disabled={!sm.grain} onClick={() => M({ freeze: !sm.freeze })} />
      </>}
      {page !== "ENV" && page !== "STR" && <Zone x={14} y={19} w={114} h={26} horizontal label="Sample waveform start" value={sm.start} min={0} max={.95} step={.005} onChange={start => { M({ start }); show(`STRT ${pct(start)}`); }} />}
      {page === "ENV" && <EnvZones env={env} set={next => M({ env: next })} y0={11} h={34} />}
      {knobs.map((k, i) => <Zone key={page + k.label} x={KX[i] - 15} y={45} w={30} h={18} label={k.label} value={k.value} min={k.min} max={k.max} step={k.step} onChange={v => { k.set(v); show(`${k.short} ${k.fmt(v)}`); }} />)}
    </PixelScreen>
  </div>;
}
export default memo(WispdiskPanel);
