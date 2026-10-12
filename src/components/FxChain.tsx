import { gatedLoop } from "@/lib/frameGate";
import * as Tone from "tone";
import { memo, useEffect, useRef, useState } from "react";
import { Tap, Zone } from "@/pixel/PixelScreen";
import { Panel, type Knob } from "@/components/pixelScreens";
import { pkey } from "@/components/HwScreens";
import type { Px } from "@/pixel/draw";
import { glyph } from "@/pixel/font";
import { GATE_PRESETS, FX_COST, FX_DEFS, FX_TYPES, MAX_FX_LOAD, SYNC_DIVS, GAIN_ZERO, gainDbToPos, gainPosToDb, makeFx, tremoloShape, fxRate, type FxLevels, type FxType, type FxUnit } from "@/audio/effects";

const NN = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const HEAD_NAMES = ["1", "2", "3", "1+2", "2+3", "1+3", "1+2+3"];
const fmt = (k: string, v: number, p: Record<string, number> = {}) =>
  k === "shape" ? (v < .25 ? "SINE" : v < .75 ? "TRI" : "SQR") + Math.round(v * 100) : k === "focus" ? (Math.abs(v) < .02 ? "BOTH" : `${v > 0 ? "TRN" : "SUS"}${Math.round(Math.abs(v) * 100)}`) : k === "crush" ? `${Math.round(v * 100)}%` : k === "dir" ? (v >= .5 ? "BOOST" : "CUT") : k === "gain" && p.dir !== undefined ? `${v}DB` :
  k === "mode" ? `HEAD ${HEAD_NAMES[Math.round(v)] ?? "1"}` : k === "spring" ? `${Math.round(v * 100)}%` : k === "ping" ? (v >= .5 ? "ON" : "OFF") : k === "hp" ? `${Math.round(v)}HZ` : k === "thresh" ? `${Math.round(v)}DB` : k === "depth" && p.hp !== undefined ? `${Math.round(v * 100)}%` : k === "attack" && p.hp !== undefined ? `${Math.round(v * 1000)}MS` :
  k === "level" ? (() => { const d = gainPosToDb(v); return d === -Infinity ? "-INF" : `${d > 0 ? "+" : ""}${d.toFixed(1)}DB`; })() : k === "note" ? `${NN[Math.round(v) % 12]}${Math.floor(Math.round(v) / 12) - 1}` : k === "fine" ? `${v > 0 ? "+" : ""}${Math.round(v)}CT` : k === "track" ? (v >= .5 ? "ON" : "OFF") : k === "metal" ? `${Math.round(v * 100)}%` : k === "drive" && p.note !== undefined ? `${Math.round(v * 100)}%` :
  k === "preset" ? GATE_PRESETS[Math.round(v)]?.[0] ?? "" : k === "sp" ? ["OFF", "SP12", "MPC60"][Math.round(v)] : k === "amount" || k === "random" ? `${Math.round(v * 100)}%` : k === "lofi" ? (v >= .5 ? "ON" : "OFF") : k === "tight" ? `${Math.round(v * 100)}%` : k === "sync" || k === "modSync" ? SYNC_DIVS[Math.round(v)][0] : k === "modRate" && p.modSync ? "SYNC"
  : k === "trans" ? (Math.abs(v) < .01 ? "0" : `${v < 0 ? "TGT" : "OPN"}${Math.round(Math.abs(v) * 100)}`) : k === "tone" && Math.abs(v) <= 1 ? (Math.abs(v) < .01 ? "FLAT" : `${v < 0 ? "DRK" : "BRT"}${Math.round(Math.abs(v) * 100)}`)
  : k === "decay" ? `${Math.round(v * 1000)}MS` : k === "modRate" ? `${v}HZ` : ["smash", "clip", "modTime", "modTone", "modFb"].includes(k) ? `${Math.round(v * 100)}%` : (k === "rate" || k === "time") && p.sync ? "SYNC"
  : ["reese", "growl", "squelch", "disp"].includes(k) ? `${Math.round(v * 100)}%` : k === "gain" ? `${v > 0 ? "+" : ""}${v}DB` : k === "threshold" || k === "makeup" ? `${v}DB` : k === "ratio" ? `${v}:1` : k === "attack" || k === "release" ? `${Math.round(v * 1000)}MS`
  : k === "speed" || k === "smooth" || k === "mix" || k === "depth" || k === "density" || k === "feedback" || k === "wow" || k === "env" ? `${Math.round(v * 100)}%`
  : k === "tone" || k === "damp" || k === "freq" || (k === "manual" && v > 50) ? `${Math.round(v)}HZ`
  : k === "time" ? `${Math.round(v * 1000)}MS` : k === "rate" ? (v === 0 ? "STATIC" : `${v}HZ`) : k === "size" ? `${v}S` : String(+v.toFixed(2));
// Short screen names; FX_DEFS labels stay unchanged so saved MIDI mappings keep working.
const SHORT_NAME: Partial<Record<FxType, string>> = { reverb: "RVRB", reverseDelay: "RVRS", metal: "METAL", gate: "TRANCE", eq: "EQ" };
const nm = (t: FxType) => SHORT_NAME[t] ?? FX_DEFS[t].label.replace(/~$/, "").replace(/\./g, " ").toUpperCase();
const short = (k: string, t?: FxType) => t === "sidechain" && k === "depth" ? "DUCK" : t === "sidechain" && k === "attack" ? "SMTH" : ({ feedback: "FDBK", threshold: "THR", release: "REL", attack: "ATK", source: "KEY", reduce: "DOWN", manual: "MAN", decay: "DCY", density: "DENS", random: "RND", smash: "SMSH", preset: "PATT", tight: "TGHT", trans: "TIGHT", lofi: "LOFI", amount: "AMT", sp: "SP", track: "TRCK", metal: "METL", reese: "REES", growl: "GRWL", squelch: "SQLC", mode: "HEAD", shape: "SHAP", focus: "FOCS", crush: "CRSH", dir: "DIR", spring: "SPRG", ping: "PING", hp: "HP", thresh: "THRS" } as Record<string, string>)[k] ?? k.slice(0, 4).toUpperCase();
const ROWS = 4;

const pv = (p: Record<string, number>, k: string, fallback: number) => p[k] ?? fallback;

const ANIM: FxType[] = ["tremolo", "vibrato", "chorus", "flanger", "phaser", "reverb", "metal"];
const TAU = Math.PI * 2;
/** Fixed pseudo-random sequence so dot clouds stay put between frames. */
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function drawFxVisual(d: Px, f: FxUnit, levels: FxLevels | null, hist: number[][] = [], t = 0) {
  const p = f.params, type = f.type, hz = ANIM.includes(type) && p.rate !== undefined ? fxRate(p) : 0, ph = hz * t;
  if (type === "metal") {
    // The word itself: NOTE sets letter spacing, DRIVE slices and shears it, FDBK leaves ringing ghost copies; flashes when the input crosses THRS.
    const note = pv(p, "note", 57), drv = pv(p, "drive", .2), fb = pv(p, "feedback", .85), hit = (levels?.input ?? -80) > pv(p, "thresh", -40);
    const gap = Math.round(3 + (84 - note) / 10), word = "METAL", sc = 3, w = word.length * 3 * sc + (word.length - 1) * gap, x0 = Math.round(64 - w / 2), y0 = 26;
    const c = d.c, jit = hit ? 1 : 0;
    for (let s = 0; s < 5; s++) {
      const off = Math.round((rnd(s + Math.floor(t * 8) * jit * 7) - .5) * drv * 14);
      c.save(); c.beginPath(); c.rect(0, y0 + s * sc, 128, sc); c.clip();
      for (let g = hit ? (fb > .9 ? 2 : fb > .5 ? 1 : 0) : 0; g >= 1; g--) if (s % 2) [...word].forEach((ch, k) => d.text(ch, x0 + off + g * (sc + 3) + k * (3 * sc + gap), y0, true, sc));
      [...word].forEach((ch, k) => d.text(ch, x0 + off + k * (3 * sc + gap), y0, true, sc));
      c.restore();
    }
    if (hit) d.box(0, 20, 128, 26);
    return;
  }
  if (type === "gate") {
    const steps = Math.max(1, Math.min(16, Math.round(p.steps ?? 16))), mask = Math.round(p.mask ?? 21845);
    for (let n = 0; n < steps; n++) { const x = Math.floor((128 - steps * 8) / 2) + n * 8; if (mask & (1 << n)) d.rect(x, 25, 7, 12); else d.box(x, 25, 7, 12); }
    d.line(1, 41, 126, 41, true); return;
  }
  if (type === "gain") { const pos = p.level ?? gainDbToPos(pv(p, "gain", 0)), g = gainPosToDb(pos); d.textC(g === -Infinity ? "-INF" : `${g > 0 ? "+" : ""}${g.toFixed(1)} DB`, 64, 24); d.box(4, 33, 120, 9); d.rect(5, 34, Math.round(pos * 118), 7); d.rect(5 + Math.round(GAIN_ZERO * 118), 32, 1, 11); return; }
  d.box(1, 21, 126, 24);
  const yDb = (db: number) => 43 - Math.round(Math.max(0, Math.min(1, (db + 80) / 80)) * 20);
  if (type === "noisegate") {
    // Scrolling detector level (newest on the right); columns where the gate is closing are dotted. Drag the THR line.
    const h = hist.slice(-121), thr = yDb(pv(p, "threshold", -40));
    h.forEach(([lv, g], k) => { const x = 124 - (h.length - 1 - k), y = yDb(lv ?? -80); if (y >= 43) return; if ((g ?? 0) > .5) d.line(x, y, x, 43); else for (let yy = y; yy <= 43; yy += 2) d.rect(x, yy, 1, 1); });
    d.line(2, thr, 125, thr); d.rect(2, thr - 1, 3, 3); d.rect(3, 22, 14, 7, false); d.text("THR", 4, 23);
    return;
  }
  if (type === "drumbus") {
    // Left: incoming level trace. Right: separate meters for TIGHT (transient change), SMSH (gain reduction) and CLIP (saturation drive).
    const h = hist.slice(-66); let py = 43;
    h.forEach(([lv], k) => { const x = 3 + k, y = yDb(lv ?? -80); d.line(x, py, x, y); py = y; });
    const tr = levels?.state?.[0] ?? 0, gr = -(levels?.state?.[1] ?? 0), clip = pv(p, "clip", .3);
    const bar = (x: number, lbl: string, f: number, mid = false) => { d.box(x, 22, 13, 16); const v = Math.max(-1, Math.min(1, f));
      if (mid) { d.line(x + 1, 30, x + 11, 30, true); const hh = Math.round(Math.abs(v) * 7); if (v > 0) d.rect(x + 2, 30 - hh, 9, hh); else d.rect(x + 2, 31, 9, hh); }
      else { const hh = Math.round(Math.max(0, v) * 14); d.rect(x + 2, 37 - hh, 9, hh); } d.textC(lbl, x + 7, 39); };
    bar(72, "TGT", tr / 12, true); bar(90, "SMH", gr / 24); bar(108, "CLP", clip);
    // Heavier processing = thicker frame.
    if ((p.smash ?? 0) + clip > 1.2) d.box(0, 20, 128, 26);
    return;
  }
  if (type === "sidechain") {
    // Envelope dip: flat, then pulled down by DUCK on each key hit (SMOOTH slope), recovering over REL.
    const depth = pv(p, "depth", .8), att = Math.max(1, Math.round(pv(p, "attack", .005) * 400)), rel = Math.max(4, Math.round(pv(p, "release", .2) * 90)), low = 24 + Math.round(depth * 18);
    let px = 3, py = 24;
    for (const x0 of [10, 70]) { d.line(px, py, x0, 24); d.line(x0, 24, x0 + att, low); let qy = low; for (let x = 1; x <= rel && x0 + att + x < 124; x++) { const y = Math.round(low - (low - 24) * (1 - Math.exp(-x / (rel / 3)))); d.line(x0 + att + x - 1, qy, x0 + att + x, y); qy = y; } px = Math.min(124, x0 + att + rel); py = qy; }
    d.line(px, py, 124, 24); d.text(`KEY ${pv(p, "source", 1)}`, 96, 37);
    return;
  }
  if (type === "delay") {
    // Space Echo: three playback heads (lit = active), the tape line, and the spring coil sized by SPRING.
    const on = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [0, 1, 1], [1, 0, 1], [1, 1, 1]][Math.round(pv(p, "mode", 0))] ?? [1, 0, 0];
    d.line(3, 26, 70, 26); d.rect(5, 23, 5, 6);
    on.forEach((v, i) => { const x = 20 + i * 16; if (v) d.rect(x, 22, 10, 8); else d.box(x, 22, 10, 8, true); d.textC(String(i + 1), x + 5, 32); });
    const fb = pv(p, "feedback", .45); for (let i = 0; i < 6; i++) { const h = Math.max(1, Math.round(7 * fb ** i)); d.rect(4 + i * 11, 43 - h, 3, h); }
    const sp = pv(p, "spring", 0), amp = Math.round(1 + sp * 6); let py = 33;
    d.text("SPRG", 78, 23);
    for (let x = 78; x < 124; x++) { const y = 36 + Math.round(Math.sin((x - 78) * 1.4) * amp * (sp > 0 ? 1 : .2)); d.line(x - 1, py, x, y); py = y; }
    return;
  }
  if (type === "bitcrush") {
    // Bits/rate staircase: a sine sampled-and-held every REDUCE pixels and quantised to BITS levels.
    const bits = Math.max(1, Math.round(pv(p, "bits", 6))), hold = Math.max(1, Math.round(pv(p, "reduce", 4) / 2)), lv = Math.min(10, 2 ** Math.min(bits, 4) / 2);
    d.line(3, 33, 124, 33, true); let py = 33, held = 0;
    for (let x = 3; x < 125; x++) { if ((x - 3) % hold === 0) held = Math.round(Math.sin((x - 3) / 121 * Math.PI * 4) * lv) / lv; const y = 33 - Math.round(held * 9); d.line(x - 1, py, x, y); py = y; }
    d.text(`${bits}B /${Math.round(pv(p, "reduce", 4))}`, 4, 23);
  } else if (["saturation", "acid"].includes(type)) {
    const drive = pv(p, "drive", 4), bias = pv(p, "bias", 0); let py = 42;
    for (let x = 3; x < 125; x++) { const input = (x - 64) / 60; const shaped = Math.tanh(input * drive * .35 + bias * .5); const y = 33 - Math.round(shaped * 9); d.line(x - 1, py, x, y); py = y; }
  } else if (type === "reverseDelay") {
    const fb = pv(p, "feedback", .4), taps = 3 + Math.round(fb * 5), gap = Math.max(8, Math.min(20, Math.round(pv(p, "time", .25) * 35)));
    for (let i = 0; i < taps; i++) { const x = type === "reverseDelay" ? 123 - i * gap : 4 + i * gap, h = Math.max(2, Math.round(18 * fb ** i)); d.line(x, 42, x, 42 - h); if (type === "reverseDelay") d.line(x - 3, 42 - h, x, 42); }
  } else if (type === "reverb") {
    // Fixed reflection field: SIZE fills outward, DENS changes spacing, DAMP thins the high region, MIX is the wet bar.
    const size = Math.max(0, Math.min(1, (pv(p, "size", 2.5) - .2) / 7.8)), dens = pv(p, "density", .6), damp = pv(p, "damp", 6000) / 16000, mix = pv(p, "mix", .3);
    const gap = dens > .78 ? 2 : dens > .48 ? 3 : dens > .22 ? 4 : 6, rx = 7 + size * 52, ry = 2 + size * 8;
    for (let y = 23; y <= 41; y += gap) for (let x = 4; x <= 123; x += gap) {
      const nx = Math.abs(x - 64) / rx, ny = Math.abs(y - 32) / ry, inside = nx * nx + ny * ny <= 1;
      const highKeep = y > 31 || rnd(x * 17 + y * 31) < .18 + damp * .82;
      if (inside && highKeep) d.dot(x, y);
    }
    d.rect(3, 43, Math.round(122 * mix), 1);
  } else if (type === "tremolo") {
    // The real gain curve: 1 at the top, 1-DEPTH at the bottom, with SHAPE's waveform and RATE's cycle count.
    const depth = pv(p, "depth", .6), shape = pv(p, "shape", 0), cycles = Math.max(1, Math.min(6, pv(p, "rate", 4) / 2)); let py = 23;
    for (let x = 3; x < 125; x++) { const g = 1 - depth / 2 + depth / 2 * tremoloShape(Math.sin((x - 3) / 122 * Math.PI * 2 * cycles - TAU * ph), shape), y = 43 - Math.round(g * 20); if (x > 3) d.line(x - 1, py, x, y); py = y; }
  } else if (type === "vibrato") {
    // Pitch, not volume: a fixed-height wave whose cycles squeeze and stretch as RATE/DEPTH push the pitch up and down.
    const depth = pv(p, "depth", .4); let acc = 0, py = 33;
    for (let x = 3; x < 125; x++) { acc += .45 * (1 + depth * .7 * Math.sin(TAU * ph - (x - 3) * .05)); const y = 33 + Math.round(Math.sin(acc) * 8); if (x > 3) d.line(x - 1, py, x, y); py = y; }
  } else if (type === "chorus") {
    // Dry line plus two modulated copies, each drifting by DEPTH at RATE with its own phase.
    const depth = pv(p, "depth", .5);
    for (let v = 0; v < 3; v++) { let py = 33; for (let x = 3; x < 125; x++) { const sh = v ? depth * 2.2 * Math.sin(TAU * ph + v * 2.1 + x * .02) : 0, y = 33 + Math.round(Math.sin(x * .12 + sh) * (7 - v)); if (x > 3 && (v === 0 || x % (v + 1))) d.line(x - 1, py, x, y); py = y; } }
  } else if (type === "flanger") {
    // Dry line (dotted) against the delayed copy sliding by MAN +/- DEPTH; FDBK adds comb ripples to the copy.
    const depth = pv(p, "depth", .6), man = pv(p, "manual", 2), fb = pv(p, "feedback", .6), del = man * (1 + depth * .9 * Math.sin(TAU * ph)) * 2;
    let py = 33, qy = 33;
    for (let x = 3; x < 125; x++) { const a = 33 + Math.round(Math.sin(x * .18) * 7), b = 33 + Math.round(Math.sin((x - del) * .18) * 7 + Math.sin((x - del) * 1.1) * fb * 2.5);
      if (x > 3) { if (x % 2) d.line(x - 1, py, x, a); d.line(x - 1, qy, x, b); } py = a; qy = b; }
  } else if (type === "phaser") {
    // Frequency response with three notches (six allpass stages) swept around MAN by RATE/DEPTH; FDBK deepens them.
    const depth = pv(p, "depth", .6), man = pv(p, "manual", 800), fb = pv(p, "feedback", .5), fc = man * 2 ** (depth * 2 * Math.sin(TAU * ph));
    const fx = (x: number) => 20 * Math.pow(1000, (x - 3) / 121); let py = 24;
    for (let x = 3; x < 125; x++) { let g = 0; for (const m of [1, 2.6, 6]) { const oc = Math.log2(fx(x) / (fc * m)); g = Math.max(g, Math.exp(-oc * oc * (6 + fb * 20))); }
      const y = 24 + Math.round(g * (10 + fb * 9)); if (x > 3) d.line(x - 1, py, x, y); py = y; }
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
  } else if (type === "ott") {
    // Outlined stroke-cells stay visible; DEPTH fills the OTT lettering from bottom to top.
    const depth = Math.max(0, Math.min(1, pv(p, "depth", .6))), word = "OTT", cell = 4, glyphW = 3 * cell, gap = 3, width = word.length * glyphW + (word.length - 1) * gap, x0 = Math.round(64 - width / 2), y0 = 22;
    [...word].forEach((ch, ci) => { const g = glyph(ch); for (let k = 0; k < 15; k++) if (g[k] === "1") {
      const row = Math.floor(k / 3), x = x0 + ci * (glyphW + gap) + (k % 3) * cell, y = y0 + row * cell;
      d.box(x, y, cell, cell); if ((5 - row) / 5 <= depth) d.rect(x + 1, y + 1, cell - 2, cell - 2);
    } });
  } else if (type === "compressor") {
    // Transfer curve left, with live pre-effect, gain-change and post-effect meters on the right.
    const thr = pv(p, "threshold", type === "ott" ? -30 : -24);
    const ratio = type === "ott" ? 1 + pv(p, "depth", .6) * 9 : pv(p, "ratio", 4);
    const makeup = pv(p, "makeup", 0), depth = 1;
    const out = (i: number) => i > thr ? thr + (i - thr) / ratio : i;
    const toY = (db: number) => 43 - Math.round((Math.max(-60, Math.min(0, db)) + 60) / 60 * 21), toX = (db: number) => 3 + Math.round((db + 60) / 60 * 66);
    d.line(3, 43, 69, 22, true); let py = toY(out(-60));
    for (let x = 3; x <= 69; x++) { const y = toY(out((x - 3) / 66 * 60 - 60) + makeup); d.line(x - 1, py, x, y); py = y; }
    d.line(toX(thr), 22, toX(thr), 43, true);
    const inDb = levels?.input ?? -60, o = levels?.output ?? -60, gr = Math.max(0, inDb - o);
    const bar = (x: number, lbl: string, f: number, down = false) => { d.box(x, 22, 9, 16); const h = Math.round(Math.max(0, Math.min(1, f)) * 14); if (down) d.rect(x + 1, 23, 7, h); else d.rect(x + 1, 37 - h, 7, h); d.textC(lbl, x + 5, 39); };
    bar(78, "IN", (inDb + 60) / 60); bar(96, "GR", gr / 30, true); bar(114, "OUT", (o + 60) / 60);
  } else if (type === "dyneq") {
    // Flat at rest; the curve is the gain the detector is applying right now (reported by the effect).
    const fx = (x: number) => 20 * Math.pow(1000, (x - 3) / 121), mf = pv(p, "freq", 1000), q = pv(p, "q", 1.5), g = levels?.state?.[0] ?? 0; let py = 33;
    const xOf = (hz: number) => 3 + Math.round(Math.log(hz / 20) / Math.log(1000) * 121), bw = 1 / q, lo = xOf(mf / 2 ** (bw / 2)), hi = xOf(mf * 2 ** (bw / 2));
    d.line(3, 33, 124, 33, true); d.line(lo, 42, hi, 42); d.line(lo, 41, lo, 43); d.line(hi, 41, hi, 43);
    // Boost is drawn solid, cut dotted; flat when nothing triggers.
    for (let x = 3; x < 125; x++) { const oc = Math.log2(fx(x) / mf), y = Math.max(22, Math.min(44, Math.round(33 - g * Math.exp(-oc * oc * q * q * 1.5) * .65))); if (g >= 0 || x % 2) d.line(x - 1, py, x, y); py = y; }
    d.text(`${g > 0 ? "+" : ""}${g.toFixed(1)}`, 100, 23);
    d.text(`KEY ${pv(p, "source", 1)}`, 4, 23);
  } else if (type === "neurobox") {
    const r = pv(p, "reese", .35), g = pv(p, "growl", .4), sq = pv(p, "squelch", .3); let py = 33;
    for (let x = 3; x < 125; x++) { const t = (x - 3) / 122, w = Math.sin(t * Math.PI * 12) + Math.sin(t * Math.PI * 12 * (1 + r * .08)) * r, s = Math.sin(w * (1 + g * 3)) * (1 - sq * .4 + sq * .4 * Math.sin(t * Math.PI * 2)); const y = 33 - Math.round(s * 9); d.line(x - 1, py, x, y); py = y; }
  } else if (type === "spectral" && p.freq === undefined) {
    // Live bands from the effect: level bar height, solid = kept, dotted = removed; THRESH line.
    const st = levels?.state, yOf = (db: number) => 43 - Math.round(Math.max(0, Math.min(1, (db + 80) / 80)) * 20), thr = yOf(pv(p, "thresh", -45));
    for (let b = 0; b < 24; b++) { const x = 4 + b * 5, top = st ? yOf(st[b]) : 43, h = 43 - top; if (h < 1) continue; if ((st?.[24 + b] ?? 0) > .4) d.rect(x, top, 4, h); else d.box(x, top, 4, h, true); if ((st?.[48 + b] ?? 0) > .25) d.rect(x + 1, Math.max(22, top - 2), 2, 1); }
    d.text("TRN", 4, 23);
    d.line(3, thr, 124, thr, true);
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
  const hist = useRef<number[][]>([]);
  const [now, setNow] = useState(0);
  const fCur = fx[Math.min(sel, Math.max(0, fx.length - 1))], animated = !!fCur?.on && ANIM.includes(fCur.type);
  useEffect(() => {
    if (!animated) return; let last = 0;
    // Phase comes from the audio clock so the screen moves at the effect's real rate.
    return gatedLoop(null, (ms: number) => { if (ms - last < 50) return; last = ms; setNow(Tone.getContext().rawContext.currentTime); });
  }, [animated]);
  const i = Math.min(sel, Math.max(0, fx.length - 1)), f = fx[i];
  const set = (p: Partial<FxUnit>) => onChange(fx.map((u, j) => (j === i ? { ...u, ...p } : u)));
  const move = (d: number) => { const j = i + d; if (!f || j < 0 || j >= fx.length) return; const n = [...fx]; [n[i], n[j]] = [n[j], n[i]]; onChange(n); setSel(j); };
  const params = f ? Object.entries(FX_DEFS[f.type].params).filter(([k]) => k !== "mask") as [string, number[]][] : [];
  const pages = Math.max(1, Math.ceil(params.length / 4)), pi = Math.min(pg, pages - 1);
  const top = Math.max(0, Math.min(i - 1, fx.length - ROWS));
  const liveMeter = !!f && ["compressor", "sidechain", "ott", "drumbus", "noisegate", "dyneq", "spectral", "metal"].includes(f.type);
  useEffect(() => {
    if (!f || !liveMeter || !f.on) { setLevels(null); return; }
    hist.current = []; let last = 0, smooth: FxLevels = { input: -60, output: -60 };
    const poll = (now: number) => {
      if (now - last >= 50) {
        const next = getLevels(slotIndex, f.id);
        if (next) {
          const follow = (old: number, value: number) => value > old ? value : old * .78 + value * .22;
          smooth = { input: follow(smooth.input, next.input), output: follow(smooth.output, next.output), state: next.state };
          if (f.type === "noisegate") hist.current.push([next.state?.[0] ?? -80, next.state?.[1] ?? 0]);
          else if (f.type === "drumbus") hist.current.push([next.input]);
          if (hist.current.length > 140) hist.current.shift();
          setLevels(smooth);
        }
        last = now;
      }
    };
    return gatedLoop(null, poll);
  }, [f?.id, f?.on, getLevels, liveMeter, slotIndex]);
  const knobs = (page: string): Knob[] => page !== "EDT" || !f ? [] : params.slice(pi * 4, pi * 4 + 4).map(([k, r]) => ({
    label: `${FX_DEFS[f.type].label} ${k}`, short: short(k, f.type), value: f.params[k] ?? (k === "level" && f.params.gain !== undefined ? gainDbToPos(f.params.gain) : r[0]), min: k === "source" ? 1 : r[1], max: k === "source" ? slots.length : r[2], step: k === "source" ? 1 : r[3],
    fmt: v => (k === "source" ? `${v} ${slots[v - 1] ?? ""}` : fmt(k, v, f.params)), set: v => set({ params: { ...f.params, [k]: v, ...(k === "preset" ? { mask: GATE_PRESETS[Math.round(v)][1], steps: 16 } : {}) } }),
  }));
  const mask = Math.round(f?.params.mask ?? 21845), gsteps = Math.round(f?.params.steps ?? 16);
  const acts: [string, string, number, () => void, boolean][] = [["UP", "Move earlier", 1, () => move(-1), i > 0], ["DN", "Move later", 33, () => move(1), i < fx.length - 1], [f?.on ? "ON" : "BYP", f?.on ? "Bypass effect" : "Enable effect", 65, () => f && set({ on: !f.on }), !!f], ["DEL", "Remove effect", 97, () => onChange(fx.filter((_, j) => j !== i)), !!f]];
  return <div className="gb-fx">
    <Panel name="FX" label="Effects" pages={["LST", "EDT", "ADD"]} deps={[JSON.stringify(fx), i, pi, slotName, load, levels?.input ?? -60, levels?.output ?? -60, levels?.state?.join() ?? "", now]} knobs={knobs}
      body={(p, page) => {
        if (page === "LST") {
          if (!fx.length) p.text(`${slotName} IN > MASTER  EMPTY`.slice(0, 31), 2, 14);
          fx.slice(top, top + ROWS).forEach((u, k) => { const idx = top + k, y = 11 + k * 9, on = idx === i; if (on) p.rect(0, y, 128, 9); p.text(`${idx + 1} ${nm(u.type)}`.slice(0, 27), 3, y + 2, !on); p.text(u.on ? "ON" : "--", 118, y + 2, !on); });
          acts.forEach(([s, , x, , en]) => { p.box(x, 54, 30, 9, !en); p.textC(s, x + 15, 56); });
        } else if (page === "EDT") {
          if (!f) { p.text("NO EFFECT  ADD ONE", 2, 14); return; }
          p.text(`${i + 1} ${nm(f.type)}`.slice(0, 22), 2, 12);
          if (pages > 1) pkey(p, `P${pi + 1}/${pages}`, 100, 10, 27, false);
          drawFxVisual(p, f, levels, hist.current, now);
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
        {f?.type === "noisegate" && <Zone x={1} y={21} w={126} h={24} label="Gate threshold line" value={f.params.threshold ?? -40} min={-80} max={0} step={1} onChange={v => set({ params: { ...f.params, threshold: v } })} />}
        {pages > 1 && <Tap x={100} y={10} w={27} h={9} label="Next parameter page" onClick={() => setPg((pi + 1) % pages)} />}
        {f?.type === "gate" && Array.from({ length: gsteps }, (_, n) => <Tap key={n} x={Math.floor((128 - gsteps * 8) / 2) + n * 8} y={25} w={7} h={12} label={`Gate step ${n + 1}`} pressed={!!(mask & (1 << n))} onClick={() => set({ params: { ...f.params, mask: mask ^ (1 << n) } })} />)}
      </> : <>
        {FX_TYPES.map((t, k) => <Tap key={t} x={1 + (k % 5) * 25} y={10 + Math.floor(k / 5) * 9} w={24} h={9} label={`Add ${FX_DEFS[t].label}`} disabled={load + FX_COST[t] > MAX_FX_LOAD} onClick={() => { if (load + FX_COST[t] > MAX_FX_LOAD) return; onChange([...fx, makeFx(t)]); setSel(fx.length); }} />)}
      </>} />
  </div>;
}

export default memo(FxChain);
