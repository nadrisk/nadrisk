import type { Bank, Slot, StepVal } from "@/hooks/useGroovebox";
import { setSpan, spanOf } from "./noteSpan";

export const MONKE = { summonMs: 6000, periodicMs: 16000, catches: 5, intervalMin: 12000, intervalMax: 75000 } as const;
export const catchCount = (random = Math.random) => 1 + Math.min(4, Math.floor(random() * 5));
/** Unpredictable wait between visits: wide range plus a random mood stretch (sometimes he lingers, sometimes he pounces fast). */
export function nextVisitDelay(random = Math.random) {
  const base = MONKE.intervalMin + random() * (MONKE.intervalMax - MONKE.intervalMin);
  return Math.round(base * (0.6 + random() * 1.1));
}
export type MonkeEdit = "add" | "offset" | "length" | "merge" | "roll" | "nudge" | "pitch" | "accent" | "condition";
const edits: MonkeEdit[] = ["add", "offset", "length", "merge", "merge", "roll", "nudge", "pitch", "accent", "condition"];
/** Immutable, bounded musical edits: only one row and its bank's pitch lane. No sound/FX changes. */
export function mangleSequence(bank: Bank, slot: Slot, rowIndex: number, bankIndex: number, random = Math.random, forced?: MonkeEdit) {
  const row = bank.pattern[rowIndex];
  if (!row) return { bank, slot, column: 0 };
  const len = Math.min(bank.lengths[rowIndex] ?? 16, bank.steps ?? 16, row.length);
  const pick = <T,>(list: T[]) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];
  const hits = row.slice(0, len).flatMap((v, c) => v === 1 ? [c] : []);
  const kind = hits.length ? forced ?? pick(edits) : "add";
  let column = hits.length ? pick(hits) : 0;
  let next = bank, sound = slot;
  const writeRow = (r: StepVal[]) => { next = { ...next, pattern: next.pattern.map((x, i) => i === rowIndex ? r : x) }; };
  const lane = (key: "ratchet" | "nudge" | "vel" | "cond", value: number, home: number) => {
    const values = next[key] ?? next.pattern.map(r => r.map(() => home));
    next = { ...next, [key]: values.map((r, i) => i === rowIndex ? r.map((v, c) => c === column ? value : v) : r) };
  };
  if (kind === "add") {
    const gaps = row.slice(0, len).flatMap((v, c) => v === 0 && c % 2 === 0 ? [c] : []);
    // Keep density below 75%; leave anchors intact.
    if (gaps.length && hits.length < len * .75) { column = pick(gaps); const r = row.slice(); r[column] = 1; writeRow(r); lane("vel", pick([.45, .65, .85]), 1); }
  } else if (kind === "offset") {
    const destination = column + pick([-1, 1]);
    if (column % 4 !== 0 && destination >= 0 && destination < len && row[destination] === 0 && spanOf(row, column, len) === 1) {
      const r = row.slice(); r[column] = 0; r[destination] = 1; writeRow(r); column = destination;
    } else lane("nudge", pick([.375, .625]), .5);
  } else if (kind === "length") {
    const r = setSpan(row, column, pick([1, 2, 4]), len); if (r) writeRow(r);
  } else if (kind === "merge") {
    const pairs = hits.filter(c => hits.some(n => n > c && n - c <= 8));
    if (pairs.length) {
      column = pick(pairs);
      const end = hits.find(c => c > column);
      if (end !== undefined) { const r = setSpan(row, column, end - column + spanOf(row, end, len), len, true); if (r) writeRow(r); }
    } else { const r = setSpan(row, column, pick([2, 4, 8]), len, true); if (r) writeRow(r); }
  } else if (kind === "roll") lane("ratchet", pick([2, 3, 4]), 1);
  else if (kind === "condition") lane("cond", pick([0, 0, 1, 2]), 0);
  else if (kind === "nudge") lane("nudge", pick([.375, .625]), .5);
  else if (kind === "accent") lane("vel", pick([.6, .8, 1]), 1);
  else if (kind === "pitch" && slot.engine !== "drum" && slot.engine !== "idm") {
    // Reuse a pitch lane, otherwise use an idle lane; never replace an existing FX automation lane.
    const indices = [bankIndex, bankIndex + 4, bankIndex + 8];
    const index = indices.find(i => slot.mods[i]?.on && slot.mods[i]?.target === "pitch") ?? indices.find(i => slot.mods[i] && !slot.mods[i].on);
    if (index !== undefined) sound = { ...slot, mods: slot.mods.map((m, i) => {
      if (i !== index) return m;
      const range = m.on ? m.range ?? 12 : 12;
      return { ...m, on: true, target: "pitch", range, values: m.values.map((v, c) => c === column ? .5 + pick([-12, 12]) / (2 * Math.max(12, range)) : m.on && m.target === "pitch" ? v : .5) };
    }) };
  }
  return { bank: next, slot: sound, column };
}

/** A burst roams distinct tracks in the active bank; the other banks and all sound fields stay untouched. */
export function manglePattern(bank: Bank, slots: Slot[], bankIndex: number, random = Math.random) {
  let next = bank;
  const sounds = slots.slice();
  const rows = bank.pattern.flatMap((r, i) => sounds[i] && r.slice(0, bank.lengths[i] ?? 16).some(v => v === 1) ? [i] : []);
  const pool = rows.length ? rows : bank.pattern.flatMap((_, i) => sounds[i] ? [i] : []);
  let row = 0, column = 0;
  const count = Math.min(pool.length, 2 + Math.floor(random() * 3));
  for (let i = 0; i < count; i++) {
    const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
    row = pool.splice(index, 1)[0];
    const out = mangleSequence(next, sounds[row], row, bankIndex, random);
    next = out.bank; sounds[row] = out.slot; column = out.column;
  }
  return { bank: next, slots: sounds, row, column };
}