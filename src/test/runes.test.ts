import { describe, expect, it } from "vitest";
import { compileRunes, MAX_MOD_TARGETS, type RuneLayout } from "@/audio/runeCompiler";
import { card, RUNES, type PadRole } from "@/audio/runes";

const h = { key: 0, scale: "minor" as const };
const roles = (r: Partial<Record<number, PadRole>>): PadRole[] => Array.from({ length: 16 }, (_, i) => r[i] ?? "free");
const L = (p: Partial<RuneLayout>): RuneLayout => ({ bars: 1, prog: "i-VI-III-VII", drums: [], bass: [], mod: [], targets: [], ...p });

describe("rune compiler", () => {
  it("every rune compiles on every lane without throwing", () => {
    for (const r of RUNES) { const c = compileRunes(L({ drums: [card(r.id)], bass: [card(r.id)], mod: [card(r.id)], targets: ["cutoff"] }), roles({ 0: "rhythm", 1: "bass", 2: "arp" }), h); expect(c.rows[0].pattern).toHaveLength(16); }
  });
  it("bass always plays progression roots (or the octave above), never below", () => {
    const c = compileRunes(L({ bass: [card("euclid", 4, 1)] }), roles({ 1: "bass" }), h); const r = c.rows[1];
    r.pattern.forEach((v, t) => { if (v === 1) { const roots = [0, 8, 3, 10]; const root = roots[Math.floor(t / 4)]; expect([root, root + 12]).toContain(r.pitch![t]); } });
    expect(r.pitch!.some((p, t) => r.pattern[t] === 1 && p >= 12)).toBe(true);
  });
  it("bass and arp interlock: both play, never on the same step", () => {
    const c = compileRunes(L({ bass: [card("anchor", 2), card("gibbs", 2, .5, 1)] }), roles({ 1: "bass", 2: "arp" }), h);
    expect(c.rows[1].pattern.some(v => v === 1)).toBe(true);
    expect(c.rows[2].pattern.slice(0, 8).some(v => v === 1)).toBe(true);
    c.rows[2].pattern.forEach((v, t) => { if (v === 1) expect(c.rows[1].pattern[t]).not.toBe(1); });
  });
  it("never more than 3 modulation targets per pad, pitch included", () => {
    const c = compileRunes(L({ bass: [card("euclid")], mod: [card("gibbs")], targets: ["cutoff", "time", "fx:rev", "fx:dly"] }), roles({ 0: "rhythm", 1: "bass" }), h);
    expect(c.mods[0]).toHaveLength(MAX_MOD_TARGETS); expect(c.mods[1]).toHaveLength(MAX_MOD_TARGETS - 1);
  });
  it("runes with no FX depth leave FX targets neutral", () => {
    const c = compileRunes(L({ drums: [card("euclid")], mod: [card("anchor", 4, 1, 1)], targets: ["fx:rev", "cutoff"] }), roles({ 0: "rhythm" }), h);
    expect(c.mods[0][0].values.every(v => Math.abs(v - .5) < 1e-9)).toBe(true);
    expect(c.mods[0][1].values.some(v => Math.abs(v - .5) > .01)).toBe(true);
  });
});

import { nextPadRole, padRoleOf } from "@/audio/runes";
describe("pad roles", () => {
  it("older sets without a role load as Free", () => { expect(padRoleOf(undefined)).toBe("free"); expect(padRoleOf("junk")).toBe("free"); });
  it("badge tap cycles — → R → B → A → —", () => {
    expect(nextPadRole(undefined)).toBe("rhythm"); expect(nextPadRole("rhythm")).toBe("bass");
    expect(nextPadRole("bass")).toBe("arp"); expect(nextPadRole("arp")).toBe("free");
  });
});

describe("4-bar runes", () => {
  it("BARS 4 compiles 64 steps", () => {
    const c = compileRunes({ bars: 4, prog: "drone i", drums: [card("euclid", 16)], bass: [], mod: [], targets: [] }, ["rhythm"], h);
    expect(c.steps).toBe(64); expect(c.rows[0].pattern.length).toBe(64);
  });
});

import { compileRunes as cr } from "@/audio/runeCompiler";
import { chordAt as ca } from "@/audio/runeHarmony";
describe("rune speed and user progression", () => {
  const hz = { key: 0, scale: "minor" } as never;
  const L = (rate: string) => ({ bars: 1 as const, prog: "drone i" as const, drums: [{ rune: "euclid" as const, len: 4, amt: 1, spd: .5, rate: rate as never }], bass: [], mod: [], targets: [] });
  it("1/4 hits only on beats", () => { const p = cr(L("1/4"), ["rhythm"], hz).rows[0].pattern; p.forEach((v, t) => { if (v) expect(t % 4).toBe(0); }); });
  it("1/32 doubles hits", () => { expect(cr(L("1/32"), ["rhythm"], hz).rows[0].ratchet.some(r => r === 2)).toBe(true); });
  it("user progression spreads chosen degrees", () => { expect([0, 4, 8, 12].map(t => ca([3, 4, 0, 5], t, 16))).toEqual([3, 4, 0, 5]); });
});

import { newRune, positioned, firstFree, RUNE_TARGETS } from "@/audio/runes";
import { spans } from "@/audio/runeCompiler";
describe("independent rune slots", () => {
  it("a new rune occupies one of four slots in a bar", () => { expect(newRune("euclid", 2).len).toBe(1); expect(spans([newRune("euclid", 2)], 16).map((s, i) => s ? i : -1).filter(i => i >= 0)).toEqual([8, 9, 10, 11]); });
  it("removing a card keeps later cards in place and leaves space for insertion", () => { const a = [newRune("euclid", 0), newRune("shift", 2)]; expect(firstFree(a, 4)).toBe(1); expect(positioned(a.slice(1))[0].start).toBe(2); });
  it("stretching a rune fills additional slots", () => { expect(spans([{ ...newRune("euclid", 1), len: 2 }], 16).filter(Boolean)).toHaveLength(8); });
  it("old contiguous cards retain their positions", () => { expect(positioned([card("euclid", 2), card("shift", 2)]).map(c => c.start)).toEqual([0, 2]); });
  it("different runes have independent target combinations", () => { expect(RUNE_TARGETS.anchor).toEqual(["cutoff"]); expect(RUNE_TARGETS.shift).toEqual(["time", "wave"]); const c = compileRunes(L({ drums: [card("anchor")], mod: [{ ...newRune("euclid", 0), len: 2, targets: ["cutoff"] }, { ...newRune("shift", 2), len: 2, targets: ["time"] }] }), roles({0: "rhythm"}), h); expect(c.mods[0][0].targets?.slice(0, 8)).toEqual(Array(8).fill("cutoff")); expect(c.mods[0][0].targets?.slice(8)).toEqual(Array(8).fill("time")); });
  it("user note values drive the bass progression exactly", () => { const c = compileRunes(L({ notes: [2, 7, 5], bass: [card("anchor")] }), roles({1: "bass"}), h); expect([0, 6, 12].map(t => c.rows[1].pitch?.[t])).toEqual([2, 7, 5]); });
});

import { roleRegister } from "@/audio/runeHarmony";
import { padOctave } from "@/components/harmonyKnob";
describe("role registers", () => {
  it("bass sits in octave 1, arp in octave 4, OCT shifts by 12", () => {
    expect(roleRegister("bass", 0)).toBe(24);
    expect(roleRegister("arp", 0)).toBe(60);
    expect(roleRegister("bass", 2, 1)).toBe(38);
  });
  it("old notes map to the nearest octave without losing pitch", () => {
    expect(padOctave({ note: 60, engine: "synth" } as never)).toBe(1);
    expect(padOctave({ note: 47, engine: "synth" } as never)).toBe(0);
  });
});

describe("shared roles take turns", () => {
  it("two bass pads never play the same step, and both get a turn", () => {
    const c = compileRunes(L({ bars: 2, bass: [card("euclid", 4, 1), card("anchor", 4, 1)] }), roles({ 1: "bass", 2: "bass" }), h);
    const a = c.rows[1].pattern, b = c.rows[2].pattern;
    expect(a.some((v, t) => v && b[t])).toBe(false);
    expect(a.some(Boolean) && b.some(Boolean)).toBe(true);
  });
  it("two arp pads interlock instead of doubling", () => {
    const c = compileRunes(L({ bass: [card("gibbs", 4, 0)] }), roles({ 1: "arp", 2: "arp" }), h);
    const a = c.rows[1].pattern, b = c.rows[2].pattern;
    expect(a.some((v, t) => v && b[t])).toBe(false);
    expect(a.some(Boolean) && b.some(Boolean)).toBe(true);
  });
});

import { hit } from "@/audio/runeCompiler";
describe("AMT is audible", () => {
  for (const r of RUNES) it(`${r.id} changes its hits between 0% and 100%`, () => {
    const at = (a: number) => Array.from({ length: 16 }, (_, k) => hit(r.id, k, 16, a, .5)).join();
    expect(at(0)).not.toBe(at(1));
  });
});

import { compileRunes as cr, hocketOwner } from "@/audio/runeCompiler";
import { RUNES } from "@/audio/runes";
describe("arp and hocket per rune", () => {
  const H = { on: true, key: 0, scale: "minor" } as never;
  it("every rune gives the arp notes alongside the bass", () => {
    for (const r of RUNES) {
      const L = { bars: 1, prog: "drone i", drums: [], mod: [], targets: [], bass: [{ rune: r.id, len: 4, amt: .6, spd: .5 }] } as never;
      const c = cr(L, ["bass", "arp"] as never, H);
      expect(c.rows[1].pattern.filter(x => x === 1).length, r.id).toBeGreaterThan(0);
      c.rows[1].pattern.forEach((x, t) => { if (x === 1) expect(c.rows[0].pattern[t], r.id).not.toBe(1); });
    }
  });
  it("shared arp pads hocket and never play together", () => {
    for (const r of RUNES) {
      const L = { bars: 1, prog: "drone i", drums: [], mod: [], targets: [], bass: [{ rune: r.id, len: 4, amt: .9, spd: .5 }] } as never;
      const c = cr(L, ["arp", "arp"] as never, H);
      c.rows[0].pattern.forEach((x, t) => expect(x === 1 && c.rows[1].pattern[t] === 1).toBe(false));
    }
  });
  it("anchor gives downbeats to the first pad, prime gives prime steps to the first pad", () => {
    expect(hocketOwner("anchor", 3, 4, 4, 2)).toBe(0); expect(hocketOwner("anchor", 3, 5, 5, 2)).toBe(1);
    expect(hocketOwner("prime", 2, 7, 7, 2)).toBe(0); expect(hocketOwner("prime", 2, 8, 8, 2)).toBe(1);
  });
});
