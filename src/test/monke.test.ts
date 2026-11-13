import { describe, expect, it, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { mangleSequence, MONKE, type MonkeEdit } from "@/audio/monke";
import { defaultMod } from "@/audio/musical";
import { useMonke } from "@/hooks/useMonke";
import type { Bank, Slot } from "@/hooks/useGroovebox";

const fixture = () => {
  const pattern = Array.from({ length: 16 }, () => Array(32).fill(0));
  pattern[2][0] = 1; pattern[2][6] = 1; pattern[2][12] = 1;
  const bank: Bank = { pattern, lengths: Array(16).fill(16), vel: pattern.map(r => r.map(() => 1)), chance: pattern.map(r => r.map(() => 1)), steps: 16 };
  const slot = { mods: Array.from({ length: 12 }, defaultMod) } as Slot;
  return { bank, slot };
};
describe("Monke musical edits", () => {
  it("changes only the active row and bank's mod lanes, without mutating its input", () => {
    for (const kind of ["add", "offset", "length", "roll", "nudge", "pitch", "accent"] as MonkeEdit[]) {
      const { bank, slot } = fixture(), before = JSON.stringify({ bank, slot });
      const out = mangleSequence(bank, slot, 2, 1, () => .6, kind);
      expect(JSON.stringify({ bank, slot })).toBe(before);
      for (let i = 0; i < 16; i++) if (i !== 2) expect(out.bank.pattern[i]).toBe(bank.pattern[i]);
      for (let i = 0; i < 12; i++) if (i % 4 !== 1) expect(out.slot.mods[i]).toBe(slot.mods[i]);
    }
  });
  it("adds a quiet note on an even step and never outside the active length", () => {
    const { bank, slot } = fixture();
    const out = mangleSequence(bank, slot, 2, 0, () => .2, "add");
    expect(out.column % 2).toBe(0); expect(out.column).toBeLessThan(16);
    expect(out.bank.pattern[2][out.column]).toBe(1);
    expect(out.bank.vel[2][out.column]).toBe(.45);
    expect(out.bank.pattern[2].slice(16)).toEqual(Array(16).fill(0));
  });
  it("lengthens short notes with the existing tie encoding", () => {
    const { bank, slot } = fixture();
    const out = mangleSequence(bank, slot, 2, 0, () => .9, "length");
    expect(out.bank.pattern[2].slice(12, 16)).toEqual([1, 2, 2, 2]);
  });
  it("uses octave-only pitch changes and preserves FX automation", () => {
    const { bank, slot } = fixture(); slot.mods[0] = { ...slot.mods[0], on: true, target: "cutoff" };
    const out = mangleSequence(bank, slot, 2, 0, () => .9, "pitch");
    expect(out.slot.mods[0]).toBe(slot.mods[0]);
    expect(out.slot.mods[4].target).toBe("pitch"); expect(out.slot.mods[4].range).toBe(12);
    expect(out.slot.mods[4].values[12]).toBe(1);
    expect(out.slot.mods[4].values[0]).toBe(.5);
  });
  it("keeps rolls at four or fewer and micro-offsets near the beat", () => {
    const { bank, slot } = fixture();
    expect(mangleSequence(bank, slot, 2, 0, () => .9, "roll").bank.ratchet?.[2][12]).toBe(4);
    expect(mangleSequence(bank, slot, 2, 0, () => .9, "nudge").bank.nudge?.[2][12]).toBe(.625);
  });
  it("does not retune existing exact-note pitch lanes", () => {
    const { bank, slot } = fixture(); slot.mods[0] = { ...slot.mods[0], on: true, target: "pitch", range: 24, values: Array(32).fill(.625) };
    const out = mangleSequence(bank, slot, 2, 0, () => .9, "pitch");
    expect(out.slot.mods[0].range).toBe(24); expect(out.slot.mods[0].values[0]).toBe(.625);
    expect(out.slot.mods[0].values[12]).toBe(.75);
  });
});
afterEach(() => vi.useRealTimers());
const controls = () => ({ available: true, playing: false, step: -1, target: "2:0", begin: vi.fn(() => true), mutate: vi.fn(() => 4), end: vi.fn(), showSequence: vi.fn() });
describe("silent Monke lifecycle", () => {
  it("summons once for six seconds, cannot be caught, and stops mutating after undo", () => {
    vi.useFakeTimers(); const c = controls(); const { result } = renderHook(() => useMonke(c));
    act(() => result.current.summon()); act(() => vi.advanceTimersByTime(1100));
    expect(c.begin).toHaveBeenCalledTimes(1); expect(c.mutate).toHaveBeenCalled();
    act(() => { for (let i = 0; i < 10; i++) result.current.catchMonke(); });
    expect(result.current.visit?.phase).toBe("raid");
    c.mutate.mockReturnValue(null as unknown as number);
    act(() => vi.advanceTimersByTime(600));
    expect(result.current.visit?.phase).toBe("leave");
    act(() => vi.advanceTimersByTime(500)); expect(result.current.visit).toBeNull();
  });
  it("summoned visits leave after six seconds without repeating", () => {
    vi.useFakeTimers(); const c = controls(); const { result } = renderHook(() => useMonke(c));
    act(() => result.current.summon()); act(() => vi.advanceTimersByTime(MONKE.summonMs + 600));
    expect(result.current.visit).toBeNull(); expect(c.begin).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(60000)); expect(c.begin).toHaveBeenCalledTimes(1);
  });
  it("periodic visits run only during playback and can be caught with five taps", () => {
    vi.useFakeTimers(); vi.spyOn(Math, "random").mockReturnValue(0);
    const c = controls(); const { result, rerender } = renderHook(() => useMonke(c));
    act(() => result.current.toggle()); act(() => vi.advanceTimersByTime(21000));
    expect(result.current.visit).toBeNull();
    c.playing = true; rerender(); act(() => vi.advanceTimersByTime(600));
    expect(result.current.visit?.mode).toBe("periodic");
    act(() => { for (let i = 0; i < 5; i++) result.current.catchMonke(); });
    expect(result.current.visit?.phase).toBe("leave");
    vi.restoreAllMocks();
  });
  it("stops a visit when the active track or bank changes", () => {
    vi.useFakeTimers(); const c = controls(); const { result, rerender } = renderHook(() => useMonke(c));
    act(() => result.current.summon()); c.target = "3:0"; rerender();
    act(() => vi.advanceTimersByTime(100)); expect(result.current.visit?.phase).toBe("leave");
    expect(c.mutate).not.toHaveBeenCalled();
  });
});