import type { Bank, Slot, StepVal } from "@/hooks/useGroovebox";
import { setSpan, spanOf } from "./noteSpan";
import { shiftRow } from "./rowShift";
import { detectRole } from "./patternGen";
import { harmonyOn, snapNote, type Harmony } from "./harmony";

/** One press = one job: face in, a few staged edits, laugh + face out. */
export const MONKE = { enterMs: 600, exitMs: 700, editGapMs: 550, minEdits: 6, maxEdits: 9 } as const;
export type MonkeKind = "pickup" | "ghost" | "flam" | "swell" | "push" | "roll" | "octave" | "slide" | "space" | "answer" | "hold" | "fill" | "starter" | "chop" | "shift";
export type MonkeOp = { row: number; column: number; kind: MonkeKind; apply: (bank: Bank, slots: Slot[]) => { bank: Bank; slots: Slot[] } };
type Role = "kick" | "snare" | "hat" | "bass" | "melodic" | "perc";

export function monkeRole(slot: Slot): Role {
  const r = detectRole(slot as never);
  if (r === "kick" || r === "snare") return r;
  if (r === "hat" || r === "open") return "hat";
  if (r === "perc" || slot.engine === "drum" || slot.engine === "idm") return "perc";
  return slot.engine === "808" || /BASS|BAS|SUB|ACID|REESE|808/.test((slot.name ?? "").toUpperCase()) ? "bass" : "melodic";
}
/** Beat 1 for every track, plus snare backbeats: never removed or moved. */
export const isAnchor = (role: Role, c: number) => c % 16 === 0 || (role === "snare" && c % 8 === 4) || (role === "kick" && c % 4 === 0);

const lenOf = (b: Bank, r: number) => Math.min(b.lengths[r] ?? 16, b.steps ?? 16, b.pattern[r]?.length ?? 16);
const setRow = (b: Bank, r: number, row: StepVal[]): Bank => ({ ...b, pattern: b.pattern.map((x, i) => i === r ? row : x) });
const lane = (b: Bank, key: "ratchet" | "nudge" | "vel" | "cond", r: number, c: number, v: number, home: number): Bank => {
  const values = b[key] ?? b.pattern.map(x => x.map(() => home));
  return { ...b, [key]: values.map((x, i) => i === r ? x.map((y, j) => j === c ? v : y) : x) };
};
const hit = (b: Bank, r: number, c: number, vel: number) => { const row = b.pattern[r].slice(); row[c] = 1; return lane(setRow(b, r, row), "vel", r, c, vel, 1); };
/** Pitch offset (semitones) through an idle or existing pitch mod lane for the bank; FX lanes untouched. */
const pitch = (slots: Slot[], r: number, bankIndex: number, c: number, semis: number): Slot[] => {
  const s = slots[r]; if (!s?.mods) return slots;
  const idx = [bankIndex, bankIndex + 4, bankIndex + 8];
  const i = idx.find(k => s.mods[k]?.on && s.mods[k].target === "pitch") ?? idx.find(k => s.mods[k] && !s.mods[k].on);
  if (i === undefined) return slots;
  const mods = s.mods.map((m, k) => {
    if (k !== i) return m;
    const range = m.on ? m.range ?? 12 : 12, base = m.on && m.target === "pitch";
    const v = Math.max(0, Math.min(1, .5 + semis / (2 * Math.max(12, range))));
    return { ...m, on: true, target: "pitch" as const, range, values: m.values.map((x, j) => j === c ? v : base ? x : .5) };
  });
  return slots.map((x, k) => k === r ? { ...x, mods } : x);
};
/** A scale-step move from the pad's root that stays in the global key. */
export function inKeyStep(h: Harmony, root: number, random: () => number) {
  const opts = harmonyOn(h) ? [-3, -2, 2, 3, 4].map(d => snapNote(h, root + d) - root).filter(x => x !== 0) : [-5, 7, 12, -12];
  return opts[Math.min(opts.length - 1, Math.floor(random() * opts.length))];
}

/** Role-aware, anchor-safe musical ideas for the active bank. Pure: ops apply in order to fresh state. */
export function inspirePattern(bank: Bank, slots: Slot[], bankIndex: number, harmony: Harmony, random = Math.random): MonkeOp[] {
  const pick = <T,>(l: T[]) => l[Math.min(l.length - 1, Math.floor(random() * l.length))];
  const rows = bank.pattern.map((_, r) => r).filter(r => slots[r]);
  const used = rows.filter(r => bank.pattern[r].slice(0, lenOf(bank, r)).some(v => v === 1));
  const ops: MonkeOp[] = [];
  if (!used.length) {
    // Empty bank: a small starter groove rather than chaos.
    const find = (role: Role) => rows.find(r => monkeRole(slots[r]) === role);
    const k = find("kick") ?? rows[0], s = find("snare"), h = find("hat");
    const add = (r: number | undefined, cols: number[], vel: number) => { if (r !== undefined) for (const c of cols) ops.push({ row: r, column: c, kind: "starter", apply: (b, sl) => ({ bank: hit(b, r, c, vel), slots: sl }) }); };
    add(k, [0, 10], 1); add(s, [4, 12], 1); add(h, [2, 6], .7);
    return ops.slice(0, MONKE.maxEdits);
  }
  const count = MONKE.minEdits + Math.floor(random() * (MONKE.maxEdits - MONKE.minEdits + 1));
  const tracks = used.slice().sort(() => random() - .5).slice(0, 3 + Math.floor(random() * 3));
  const free = (b: Bank, r: number, c: number) => c >= 0 && c < lenOf(b, r) && b.pattern[r][c] === 0;
  const idea = (r: number): MonkeOp | null => {
    const role = monkeRole(slots[r]), len = lenOf(bank, r), row = bank.pattern[r];
    const hits = row.slice(0, len).flatMap((v, c) => v === 1 ? [c] : []);
    const loose = hits.filter(c => !isAnchor(role, c));
    const tail = len - 1 - Math.floor(random() * 3);
    const menu: (() => MonkeOp | null)[] = [];
    const fill = () => free(bank, r, tail) ? { row: r, column: tail, kind: "fill" as const, apply: (b: Bank, sl: Slot[]) => ({ bank: lane(lane(hit(b, r, tail, .7), "cond", r, tail, pick([2, 9]), 0), "ratchet", r, tail, pick([2, 3]), 1), slots: sl }) } : null;
    if (role === "kick") menu.push(() => { const c = pick([7, 14, 15, 6, 11].filter(c => c < len && free(bank, r, c))); return c === undefined ? null : { row: r, column: c, kind: "pickup", apply: (b, sl) => ({ bank: hit(b, r, c, .75), slots: sl }) }; }, fill);
    if (role === "snare" || role === "perc") menu.push(
      () => { const c = pick([3, 7, 9, 11, 14, 15].filter(c => c < len && free(bank, r, c))); return c === undefined ? null : { row: r, column: c, kind: "ghost", apply: (b, sl) => ({ bank: hit(b, r, c, .4 + random() * .15), slots: sl }) }; },
      () => { const c = pick(hits.filter(c => c % 8 === 4)); return c === undefined ? null : { row: r, column: c, kind: "flam", apply: (b, sl) => ({ bank: lane(b, "ratchet", r, c, 2, 1), slots: sl }) }; }, fill);
    if (role === "hat") menu.push(
      () => { const c = pick(hits.filter(c => c % 4 === 2)); return c === undefined ? null : { row: r, column: c, kind: "swell", apply: (b, sl) => { let n = b; for (const h of hits) n = lane(n, "vel", r, h, h % 4 === 2 ? 1 : .55, 1); return { bank: n, slots: sl }; } }; },
      () => { const c = pick(loose); return c === undefined ? null : { row: r, column: c, kind: "push", apply: (b, sl) => ({ bank: lane(b, "nudge", r, c, pick([.42, .58]), .5), slots: sl }) }; },
      () => { const c = pick(hits.filter(c => c >= len - 4)) ?? tail; return { row: r, column: c, kind: "roll", apply: (b, sl) => ({ bank: lane(b.pattern[r][c] === 1 ? b : hit(b, r, c, .7), "ratchet", r, c, pick([2, 3]), 1), slots: sl }) }; });
    if (role === "bass" || role === "melodic") {
      menu.push(
        () => { const c = pick(loose.length ? loose : hits); return c === undefined ? null : { row: r, column: c, kind: "octave", apply: (b, sl) => ({ bank: b, slots: pitch(sl, r, bankIndex, c, pick([12, -12, 12])) }) }; },
        () => { const pairs = hits.filter(c => hits.some(n => n > c && n - c <= 4)); const c = pick(pairs); if (c === undefined) return null; const end = hits.find(n => n > c)!;
          return { row: r, column: c, kind: "slide", apply: (b, sl) => { const nr = setSpan(b.pattern[r], c, end - c + spanOf(b.pattern[r], end, len), len, true); return { bank: nr ? setRow(b, r, nr) : b, slots: sl }; } }; },
        () => { const c = pick(loose.filter(c => spanOf(row, c, len) === 1)); return c === undefined || hits.length < 4 ? null : { row: r, column: c, kind: "space", apply: (b, sl) => { const nr = b.pattern[r].slice(); nr[c] = 0; return { bank: setRow(b, r, nr), slots: sl }; } }; });
      if (role === "melodic") menu.push(
        () => { const half = len >> 1; const src = hits.filter(c => c < half && free(bank, r, c + half)); const c = pick(src); if (c === undefined) return null; const at = c + half, semis = inKeyStep(harmony, slots[r].note ?? 60, random);
          return { row: r, column: at, kind: "answer", apply: (b, sl) => ({ bank: hit(b, r, at, b.vel[r]?.[c] ?? 1), slots: pitch(sl, r, bankIndex, at, semis) }) }; },
        () => { const c = pick(hits.filter(c => spanOf(row, c, len) === 1)); return c === undefined ? null : { row: r, column: c, kind: "hold", apply: (b, sl) => { const nr = setSpan(b.pattern[r], c, pick([2, 3, 4]), len); return { bank: nr ? setRow(b, r, nr) : b, slots: sl }; } }; });
    }
    // Long notes get shortened or chopped into pulses; non-anchor tracks may rotate their pocket.
    const longs = hits.filter(c => spanOf(row, c, len) > 2);
    const chop = () => { const c = pick(longs); if (c === undefined) return null; const span = spanOf(row, c, len), pulse = random() < .5;
      return { row: r, column: c, kind: "chop" as const, apply: (b: Bank, sl: Slot[]) => { const nr = b.pattern[r].slice();
        for (let k = 1; k < span; k++) nr[c + k] = (pulse ? (k % 2 === 0 ? 1 : 0) : (k === 1 && random() < .5 ? 2 : 0)) as StepVal;
        return { bank: setRow(b, r, nr), slots: sl }; } }; };
    if (longs.length) menu.push(chop, chop);
    if (role !== "kick" && role !== "snare" && hits.length && hits.every(c => !isAnchor(role, c) || row[(c - 1 + len) % len] === 1 || row[(c + 1) % len] === 1 || c !== 0) ) menu.push(() => { const d = pick([1, -1, 2, -2]); return { row: r, column: 0, kind: "shift" as const, apply: (b: Bank, sl: Slot[]) => { const n = shiftRow(b, r, d), keep = row.slice(0, len).every((v, c) => v !== 1 || !isAnchor(role, c) || n.pattern[r][c] === 1); return { bank: keep ? n : b, slots: sl }; } }; });
    for (let t = 0; t < 4; t++) { const op = pick(menu)?.(); if (op) return op; }
    return null;
  };
  const taken = new Set<string>();
  for (let i = 0; i < count * 5 && ops.length < count; i++) {
    const op = idea(tracks[i % tracks.length]);
    if (!op || taken.has(`${op.row}:${op.column}:${op.kind}`)) continue;
    taken.add(`${op.row}:${op.column}:${op.kind}`); ops.push(op);
  }
  return ops;
}
export function applyOps(bank: Bank, slots: Slot[], ops: MonkeOp[]) {
  let b = bank, s = slots;
  for (const op of ops) ({ bank: b, slots: s } = op.apply(b, s));
  return { bank: b, slots: s };
}
