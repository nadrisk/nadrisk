import { describe, expect, it, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { applyOps, inKeyStep, inspirePattern, isAnchor, MONKE } from "@/audio/monke";
import { defaultMod } from "@/audio/musical";
import { snapNote } from "@/audio/harmony";
import { useMonke } from "@/hooks/useMonke";
import type { Bank, Slot } from "@/hooks/useGroovebox";

const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const slot = (name: string, engine: string) => ({ name, engine, note: 60, mods: Array.from({ length: 12 }, defaultMod) }) as unknown as Slot;
const fixture = () => {
  const pattern = Array.from({ length: 16 }, () => Array(32).fill(0));
  [0, 4, 8, 12].forEach(c => pattern[0][c] = 1);
  [4, 12].forEach(c => pattern[1][c] = 1);
  [0, 2, 4, 6, 8, 10, 12, 14].forEach(c => pattern[2][c] = 1);
  [0, 3, 6, 8, 10, 14].forEach(c => pattern[3][c] = 1);
  [0, 2, 5, 9].forEach(c => pattern[4][c] = 1);
  const bank: Bank = { pattern, lengths: Array(16).fill(16), vel: pattern.map(r => r.map(() => 1)), chance: pattern.map(r => r.map(() => 1)), steps: 16 };
  const slots = [slot("KICK", "drum"), slot("SNARE", "drum"), slot("HAT", "drum"), slot("BASS", "808"), slot("LEAD", "synth"), ...Array.from({ length: 11 }, () => slot("PAD", "synth"))];
  return { bank, slots };
};
const roles = ["kick", "snare", "hat", "bass", "melodic"] as const;
describe("Monke musical ideas", () => {
  it("makes a noticeable job per press", () => {
    for (let s = 1; s < 40; s++) { const { bank, slots } = fixture(); const n = inspirePattern(bank, slots, 0, { key: 0, scale: "minor" }, seeded(s)).length; expect(n).toBeGreaterThanOrEqual(MONKE.minEdits); expect(n).toBeLessThanOrEqual(MONKE.maxEdits); }
  });
  it("never removes beat 1, kick quarters or snare backbeats", () => {
    for (let s = 1; s < 60; s++) {
      const { bank, slots } = fixture();
      const out = applyOps(bank, slots, inspirePattern(bank, slots, 0, { key: 0, scale: "minor" }, seeded(s))).bank;
      for (let r = 0; r < 5; r++) for (let c = 0; c < 16; c++) if (bank.pattern[r][c] === 1 && isAnchor(roles[r], c)) expect(out.pattern[r][c]).toBe(1);
    }
  });
  it("does not mutate the input bank", () => {
    const { bank, slots } = fixture(), before = JSON.stringify(bank);
    applyOps(bank, slots, inspirePattern(bank, slots, 0, { key: 0, scale: "minor" }, seeded(7)));
    expect(JSON.stringify(bank)).toBe(before);
  });
  it("answer moves stay in the chosen key", () => {
    const h = { key: 2, scale: "minor" as const };
    for (let s = 1; s < 30; s++) { const d = inKeyStep(h, 62, seeded(s)); expect(snapNote(h, 62 + d)).toBe(62 + d); }
  });
  it("turnaround fills only play every 2nd or 4th loop", () => {
    for (let s = 1; s < 200; s++) {
      const { bank, slots } = fixture();
      const ops = inspirePattern(bank, slots, 0, { key: 0, scale: "minor" }, seeded(s)).filter(o => o.kind === "fill");
      for (const o of ops) expect([2, 9]).toContain(o.apply(bank, slots).bank.cond![o.row][o.column]);
    }
  });
  it("starts every job with arranger moves that read the whole pattern", () => {
    const big = ["hocket", "counter", "suspend", "cadence", "drop", "hemiola"];
    for (let s = 1; s < 40; s++) { const { bank, slots } = fixture(); const ops = inspirePattern(bank, slots, 0, { key: 0, scale: "minor" }, seeded(s)); expect(ops.slice(0, 3).every(o => big.includes(o.kind))).toBe(true); }
  });
  it("hockets land only on empty steps", () => {
    for (let s = 1; s < 80; s++) { const { bank, slots } = fixture(); for (const o of inspirePattern(bank, slots, 0, { key: 0, scale: "minor" }, seeded(s)).filter(o => o.kind === "hocket")) expect(bank.pattern[o.row][o.column]).toBe(0); }
  });
  it("an empty bank gets a small starter groove", () => {
    const { bank, slots } = fixture(); bank.pattern = bank.pattern.map(r => r.map(() => 0));
    const out = applyOps(bank, slots, inspirePattern(bank, slots, 0, { key: 0, scale: "off" }, seeded(3))).bank;
    expect(out.pattern[0][0]).toBe(1); expect(out.pattern[1][4]).toBe(1);
  });
});
afterEach(() => vi.useRealTimers());
const controls = () => { let n = 4; return { available: true, playing: false, step: -1, target: "0", begin: vi.fn(() => true), mutate: vi.fn(() => n-- > 0 ? { row: 1, column: 3 } : null), end: vi.fn(), showSequence: vi.fn() }; };
describe("Monke trigger", () => {
  it("locks while working and frees the button after he leaves", () => {
    vi.useFakeTimers(); const c = controls(); const { result } = renderHook(() => useMonke(c));
    act(() => result.current.trigger());
    expect(result.current.busy).toBe(true);
    act(() => result.current.trigger());
    expect(c.begin).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(MONKE.enterMs + MONKE.editGapMs * 6 + MONKE.exitMs + 400));
    expect(c.mutate).toHaveBeenCalledTimes(5); expect(c.end).toHaveBeenCalled();
    expect(result.current.busy).toBe(false);
  });
});
