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
  it("bass steps aside while an arp passage plays", () => {
    const c = compileRunes(L({ bass: [card("anchor", 2), card("gibbs", 2, .5, 1)] }), roles({ 1: "bass", 2: "arp" }), h);
    expect(c.rows[1].pattern.slice(8).every(v => v === 0)).toBe(true);
    expect(c.rows[2].pattern.slice(8).some(v => v === 1)).toBe(true);
    expect(c.rows[2].pattern.slice(0, 8).every(v => v === 0)).toBe(true);
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
