import { memo, useEffect, useState } from "react";
import { Tap } from "@/pixel/PixelScreen";
import { Panel, type Knob } from "@/components/pixelScreens";
import { pkey } from "@/components/HwScreens";
import type { Px } from "@/pixel/draw";
import { FX_COST, FX_DEFS, FX_TYPES, MAX_FX_LOAD, SYNC_DIVS, makeFx, type FxLevels, type FxType, type FxUnit } from "@/audio/effects";

const fmt = (k: string, v: number, p: Record<string, number> = {}) =>
  k === "sync" || k === "modSync" ? SYNC_DIVS[Math.round(v)][0] : k === "modRate" && p.modSync ? "SYNC"
  : k === "trans" ? (Math.abs(v) < .01 ? "0" : `${v < 0 ? "TGT" : "OPN"}${Math.round(Math.abs(v) * 100)}`) : k === "tone" && Math.abs(v) <= 1 ? (Math.abs(v) < .01 ? "FLAT" : `${v < 0 ? "DRK" : "BRT"}${Math.round(Math.abs(v) * 100)}`)
  : k === "decay" ? `${Math.round(v * 1000)}MS` : k === "modRate" ? `${v}HZ` : ["smash", "clip", "modTime", "modTone", "modFb"].includes(k) ? `${Math.round(v * 100)}%` : (k === "rate" || k === "time") && p.sync ? "SYNC"
  : k === "threshold" || k === "makeup" ? `${v}DB` : k === "ratio" ? `${v}:1` : k === "attack" || k === "release" ? `${Math.round(v * 1000)}MS`
  : k === "speed" || k === "smooth" || k === "mix" || k === "depth" || k === "feedback" || k === "wow" || k === "env" ? `${Math.round(v * 100)}%`
  : k === "tone" || k === "damp" || k === "freq" || (k === "manual" && v > 50) ? `${Math.round(v)}HZ`
  : k === "time" ? `${Math.round(v * 1000)}MS` : k === "rate" ? (v === 0 ? "STATIC" : `${v}HZ`) : k === "size" ? `${v}S` : String(+v.toFixed(2));
const nm = (t: FxType) => FX_DEFS[t].label.replace(/~$/, "").replace(/\./g, " ").toUpperCase();
const short = (k: string) => ({ feedback: "FDBK", threshold: "THR", release: "REL", attack: "ATK", source: "KEY", reduce: "DOWN", manual: "MAN", decay: "DCY", modRate: "RATE", modSync: "SYNC", modTime: "M-TM", modTone: "M-TN", modFb: "M-FB", smash: "SMSH" } as Record<string, string>)[k] ?? k.slice(0, 4).toUpperCase();
const ROWS = 4;

const pv = (p: Record<string, number>, k: string, fallback: number) => p[k] ?? fallback;

function drawFxVisual(d: Px, f: FxUnit, levels: FxLevels | null) {
  const p = f.params, type = f.type;
  if (type === "gate") {
    const steps = Math.max(1, Math.min(16, Math.round(p.steps ?? 16))), mask = Math.round(p.mask ?? 21845);
    for (let n = 0; n < steps; n++) { const x = Math.floor((128 - steps * 8) / 2) + n * 8; if (mask & (1 << n)) d.rect(x, 25, 7, 12); else d.box(x, 25, 7, 12); }
    d.line(1, 41, 126, 41, true); return;
  }
  d.box(1, 21, 126, 24);
  if (["saturation", "acid", "bitcrush"].includes(type)) {
    const drive = pv(p, "drive", type === "bitcrush" ? 6 : 4), bias = pv(p, "bias", 0), bits = pv(p, "bits", 16); let py = 42;
    for (let x = 3; x < 125; x++) { const input = (x - 64) / 60; const shaped = type === "bitcrush" ? Math.round(input * bits) / bits : Math.tanh(input * drive * .35 + bias * .5); const y = 33 - Math.round(shaped * 9); d.line(x - 1, py, x, y); py = y; }
  } else if (["delay", "reverseDelay", "metal"].includes(type)) {
    const fb = pv(p, "feedback", .4), taps = 3 + Math.round(fb * 5), gap = Math.max(8, Math.min(20, Math.round(pv(p, "time", .25) * 35)));
    for (let i = 0; i < taps; i++) { const x = type === "reverseDelay" ? 123 - i * gap : 4 + i * gap, h = Math.max(2, Math.round(18 * fb ** i)); d.line(x, 42, x, 42 - h); if (type === "reverseDelay") d.line(x - 3, 42 - h, x, 42); }
  } else if (type === "reverb") {
    const size = pv(p, "size", 2.5), damp = pv(p, "damp", 6000); let py = 23;
    for (let x = 3; x < 125; x++) { const t = (x - 3) / 122, env = Math.exp(-t * (7 / Math.max(.3, size))), grain = Math.sin(x * .9) * Math.sin(x * 2.3) * env; const y = 33 + Math.round(grain * (damp / 16000 * 10 + 2)); d.line(x - 1, py, x, y); py = y; }
  } else if (["chorus", "flanger", "phaser", "vibrato", "tremolo"].includes(type)) {
    const depth = pv(p, "depth", .5), rate = pv(p, "rate", 1), cycles = Math.max(1, Math.min(5, rate / 2)); let py = 33;
    for (let x = 3; x < 125; x++) { const y = 33 + Math.round(Math.sin((x - 3) / 122 * Math.PI * 2 * cycles) * depth * 9); d.line(x - 1, py, x, y); py = y; }
  } else if (type === "eq") {
    const fx = (x: number) => 20 * Math.pow(1000, (x - 3) / 121);
    const lf = pv(p, "lowFreq", 100), mf = pv(p, "midFreq", 1000), hf = pv(p, "highFreq", 9000), q = pv(p, "q", 1);
    const lg = pv(p, "low", 0), mg = pv(p, "mid", 0), hg = pv(p, "high", 0); let py = 33;
    d.line(3, 33, 124, 33, true);
    for (let x = 3; x < 125; x++) { const fr = fx(x), oc = Math.log2(fr / mf);
      const db = lg / (1 + Math.pow(fr / lf, 2)) + hg / (1 + Math.pow(hf / fr, 2)) + mg * Math.exp(-oc * oc * q * q * 1.5);
      const y = Math.max(22, Math.min(44, Math.round(33 - db * .65))); d.line(x - 1, py, x, y); py = y; }
    const mx = 3 + Math.round(Math.log(mf / 20) / Math.log(1000) * 121); d.line(mx, 42, mx, 44);
  } else if (type === "djfilter") {
    const sw = pv(p, "sweep", 0), w = Math.round(Math.abs(sw) * 58);
    d.text("LP", 4, 25); d.text("HP", 117, 25); d.line(64, 30, 64, 42);
    d.box(4, 32, 120, 9);
    if (sw < 0) d.rect(64 - w, 33, w, 7); else if (sw > 0) d.rect(65, 33, w, 7);
    if (!w) d.textC("FLAT", 64, 25);
    else { const hz = sw < 0 ? 20000 * Math.pow(0.01, -sw) : 20 * Math.pow(100, sw); d.textC(hz >= 1000 ? `${(hz / 1000).toFixed(1)}K` : `${Math.round(hz)}HZ`, 64, 25); }
  } else if (["compressor", "sidechain", "ott", "drumbus", "noisegate"].includes(type)) {
    // Transfer curve left, with live pre-effect, gain-change and post-effect meters on the right.
    const thr = pv(p, "threshold", type === "ott" ? -30 : type === "drumbus" ? -18 : -24);
    const ratio = type === "ott" ? 1 + pv(p, "depth", .6) * 9 : type === "drumbus" ? 1 + pv(p, "drive", 3) / 4 : type === "noisegate" ? 1 : pv(p, "ratio", 4);
    const makeup = pv(p, "makeup", 0), depth = type === "sidechain" ? pv(p, "depth", 1) : 1;
    const out = (i: number) => type === "noisegate" ? (i < thr ? -60 + (1 - pv(p, "range", 0)) * 0 + i * pv(p, "range", 0) : i) : (i > thr ? thr + (i - thr) / ratio : i) * 1;
    const toY = (db: number) => 43 - Math.round((Math.max(-60, Math.min(0, db)) + 60) / 60 * 21), toX = (db: number) => 3 + Math.round((db + 60) / 60 * 66);
    d.line(3, 43, 69, 22, true); let py = toY(out(-60));
    for (let x = 3; x <= 69; x++) { const y = toY(out((x - 3) / 66 * 60 - 60) + makeup); d.line(x - 1, py, x, y); py = y; }
    d.line(toX(thr), 22, toX(thr), 43, true);
    const inDb = levels?.input ?? -60, o = levels?.output ?? -60, gr = Math.max(0, inDb - o);
    const bar = (x: number, lbl: string, f: number, down = false) => { d.box(x, 22, 9, 16); const h = Math.round(Math.max(0, Math.min(1, f)) * 14); if (down) d.rect(x + 1, 23, 7, h); else d.rect(x + 1, 37 - h, 7, h); d.textC(lbl, x + 5, 39); };
    bar(78, "IN", (inDb + 60) / 60); bar(96, "GR", gr / 30, true); bar(114, "OUT", (o + 60) / 60);
  } else if (type === "spectral") {
    // Resonant band-bank curve: 8 log-spaced resonances around FREQ, shaped by PEAK/SPREAD/RES.
    const N = 8, cf = Math.min(16000, Math.max(40, pv(p, "freq", 1200))), res = pv(p, "res", 6), spread = pv(p, "spread", 1), peak = pv(p, "peak", 14);
    const fx = (x: number) => 40 * Math.pow(400, (x - 3) / 121);
    d.line(3, 33, 124, 33, true); let py = 33;
    for (let x = 3; x < 125; x++) {
      const fr = fx(x); let db = 0;
      for (let i = 0; i < N; i++) { const d0 = (i - (N - 1) / 2) / (N / 2), bf = cf * 2 ** (d0 * spread * 2), oc = Math.log2(fr / bf); db += peak * Math.exp(-d0 * d0 * 2.2) / (1 + oc * oc * res * res * .4); }
      const y = Math.max(22, Math.min(44, Math.round(33 - db * .55))); d.line(x - 1, py, x, y); py = y;
    }
    const mx = 3 + Math.round(Math.log(cf / 40) / Math.log(400) * 121); d.line(mx, 42, mx, 44);
  } else {
    const amount = pv(p, "depth", pv(p, "mix", .7)), threshold = pv(p, "threshold", -24); const split = 3 + Math.round((threshold + 60) / 60 * 120);
    d.line(3, 42, split, 42 - Math.round((split - 3) * .15)); d.line(split, 42 - Math.round((split - 3) * .15), 124, 42 - Math.round((split - 3) * .15) - Math.round((124 - split) * .15 * (1 - amount * .8)));
    for (let x = 6; x < 124; x += 9) d.rect(x, 42 - Math.round(amount * ((x % 5) + 4)), 3, Math.round(amount * ((x % 5) + 4)));
  }
}

function FxChain({ slotIndex, slotName, slots, fx, onChange, getLevels, load }: { load: number; slotIndex: number; slots: string[]; slotName: string; fx: FxUnit[]; onChange: (fx: FxUnit[]) => void; getLevels: (slot: number, id: number) => FxLevels | null }) {
  const [sel, setSel] = useState(0);
  const [pg, setPg] = useState(0);
  const [levels, setLevels] = useState<FxLevels | null>(null);
  const i = Math.min(sel, Math.max(0, fx.length - 1)), f = fx[i];
  const set = (p: Partial<FxUnit>) => onChange(fx.map((u, j) => (j === i ? { ...u, ...p } : u)));
  const move = (d: number) => { const j = i + d; if (!f || j < 0 || j >= fx.length) return; const n = [...fx]; [n[i], n[j]] = [n[j], n[i]]; onChange(n); setSel(j); };
  const params = f ? Object.entries(FX_DEFS[f.type].params).filter(([k]) => k !== "mask") as [string, number[]][] : [];
  const pages = Math.max(1, Math.ceil(params.length / 4)), pi = Math.min(pg, pages - 1);
  const top = Math.max(0, Math.min(i - 1, fx.length - ROWS));
  const liveMeter = !!f && ["compressor", "sidechain", "ott", "drumbus", "noisegate"].includes(f.type);
  useEffect(() => {
    if (!f || !liveMeter || !f.on) { setLevels(null); return; }
    let frame = 0, last = 0, smooth: FxLevels = { input: -60, output: -60 };
    const poll = (now: number) => {
      if (now - last >= 50) {
        const next = getLevels(slotIndex, f.id);
        if (next) {
          const follow = (old: number, value: number) => value > old ? value : old * .78 + value * .22;
          smooth = { input: follow(smooth.input, next.input), output: follow(smooth.output, next.output) };
          setLevels(smooth);
        }
        last = now;
      }
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, [f?.id, f?.on, getLevels, liveMeter, slotIndex]);
  const knobs = (page: string): Knob[] => page !== "EDT" || !f ? [] : params.slice(pi * 4, pi * 4 + 4).map(([k, r]) => ({
    label: `${FX_DEFS[f.type].label} ${k}`, short: short(k), value: f.params[k] ?? r[0], min: k === "source" ? 1 : r[1], max: k === "source" ? slots.length : r[2], step: k === "source" ? 1 : r[3],
    fmt: v => (k === "source" ? `${v} ${slots[v - 1] ?? ""}` : fmt(k, v, f.params)), set: v => set({ params: { ...f.params, [k]: v } }),
  }));
  const mask = Math.round(f?.params.mask ?? 21845), gsteps = Math.round(f?.params.steps ?? 16);
  const acts: [string, string, number, () => void, boolean][] = [["UP", "Move earlier", 1, () => move(-1), i > 0], ["DN", "Move later", 33, () => move(1), i < fx.length - 1], [f?.on ? "ON" : "BYP", f?.on ? "Bypass effect" : "Enable effect", 65, () => f && set({ on: !f.on }), !!f], ["DEL", "Remove effect", 97, () => onChange(fx.filter((_, j) => j !== i)), !!f]];
  return <div className="gb-fx">
    <Panel name="FX" label="Effects" pages={["LST", "EDT", "ADD"]} deps={[JSON.stringify(fx), i, pi, slotName, load, levels?.input ?? -60, levels?.output ?? -60]} knobs={knobs}
      body={(p, page) => {
        if (page === "LST") {
          if (!fx.length) p.text(`${slotName} IN > MASTER  EMPTY`.slice(0, 31), 2, 14);
          fx.slice(top, top + ROWS).forEach((u, k) => { const idx = top + k, y = 11 + k * 9, on = idx === i; if (on) p.rect(0, y, 128, 9); p.text(`${idx + 1} ${nm(u.type)}`.slice(0, 27), 3, y + 2, !on); p.text(u.on ? "ON" : "--", 118, y + 2, !on); });
          acts.forEach(([s, , x, , en]) => { p.box(x, 54, 30, 9, !en); p.textC(s, x + 15, 56); });
        } else if (page === "EDT") {
          if (!f) { p.text("NO EFFECT  ADD ONE", 2, 14); return; }
          p.text(`${i + 1} ${nm(f.type)}`.slice(0, 22), 2, 12);
          if (pages > 1) pkey(p, `P${pi + 1}/${pages}`, 100, 10, 27, false);
          drawFxVisual(p, f, levels);
        } else {
          // Effects that would overheat the groovebox are drawn dotted and can't be added.
          FX_TYPES.forEach((t, k) => { const x = 1 + (k % 5) * 25, y = 10 + Math.floor(k / 5) * 9, ok = load + FX_COST[t] <= MAX_FX_LOAD; p.box(x, y, 24, 9, !ok); p.textC(nm(t).slice(0, 5), x + 12, y + 2); });
          const lw = Math.round(Math.min(1, load / MAX_FX_LOAD) * 90); p.text(load > MAX_FX_LOAD ? "OVER" : load + 1 > MAX_FX_LOAD ? "FULL" : "LOAD", 1, 57); p.box(30, 56, 92, 7); p.rect(31, 57, lw, 5);
        }
      }}
      extra={page => page === "LST" ? <>
        {fx.slice(top, top + ROWS).map((u, k) => <Tap key={u.id} x={0} y={11 + k * 9} w={128} h={9} label={`Select effect ${top + k + 1} ${FX_DEFS[u.type].label}`} pressed={top + k === i} onClick={() => setSel(top + k)} />)}
        {acts.map(([s, l, x, fn, en]) => <Tap key={s + l} x={x} y={54} w={30} h={9} label={l} disabled={!en} onClick={fn} />)}
      </> : page === "EDT" ? <>
        {pages > 1 && <Tap x={100} y={10} w={27} h={9} label="Next parameter page" onClick={() => setPg((pi + 1) % pages)} />}
        {f?.type === "gate" && Array.from({ length: gsteps }, (_, n) => <Tap key={n} x={Math.floor((128 - gsteps * 8) / 2) + n * 8} y={25} w={7} h={12} label={`Gate step ${n + 1}`} pressed={!!(mask & (1 << n))} onClick={() => set({ params: { ...f.params, mask: mask ^ (1 << n) } })} />)}
      </> : <>
        {FX_TYPES.map((t, k) => <Tap key={t} x={1 + (k % 5) * 25} y={10 + Math.floor(k / 5) * 9} w={24} h={9} label={`Add ${FX_DEFS[t].label}`} disabled={load + FX_COST[t] > MAX_FX_LOAD} onClick={() => { if (load + FX_COST[t] > MAX_FX_LOAD) return; onChange([...fx, makeFx(t)]); setSel(fx.length); }} />)}
      </>} />
  </div>;
}

export default memo(FxChain);
