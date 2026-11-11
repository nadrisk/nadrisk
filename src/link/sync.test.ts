import { describe, it, expect } from "vitest";
import { reanchorEpoch, phaseErrMs, nudgeRatio, clockOffset, syncState, nextBarAt, barMs, targets, audioStartAt, nextBarStep } from "./deck";

describe("deck sync", () => {
  it("decks started from the shared epoch land on the same downbeat", () => {
    const epoch = 10_000, a = nextBarAt(12_345, epoch, 120, 300), b = nextBarAt(13_999, epoch, 120, 300);
    expect((a - epoch) % 2000).toBe(0); expect((b - epoch) % 2000).toBe(0);
  });
  it("tempo change keeps the bar phase", () => {
    const now = 5_500, e = reanchorEpoch(now, 0, 120, 140); // half a bar into a 2000 ms bar
    expect(((now - e) / barMs(140)) % 1).toBeCloseTo(0.75);
  });
  it("phase error is zero on grid and signed when ahead or behind", () => {
    expect(phaseErrMs(2000 + 500, 0, 120, 4)).toBeCloseTo(0);
    expect(phaseErrMs(2500, 0, 120, 4.1)).toBeCloseTo(12.5);
    expect(phaseErrMs(2500, 0, 120, 3.9)).toBeCloseTo(-12.5);
    expect(phaseErrMs(2000, 0, 120, 15.9)).toBeCloseTo(-12.5); // wraps across the bar line
  });
  it("captures drift at 8% but stays gentle near lock", () => {
    expect(nudgeRatio(2)).toBe(1);
    expect(nudgeRatio(10)).toBeCloseTo(0.99);
    expect(nudgeRatio(500)).toBeCloseTo(0.92);
    expect(nudgeRatio(-500)).toBeCloseTo(1.08);
  });
  it("clock offset from a ping round trip", () => { expect(clockOffset(1000, 5050, 1100)).toBe(4000); });
  it("sync light", () => { expect(syncState(false, 0)).toBe("OFF"); expect(syncState(true, 5)).toBe("LOCK"); expect(syncState(true, 40)).toBe("DRIFT"); });
  it("BOTH targets both decks", () => { expect(targets("BOTH")).toEqual(["A", "B"]); expect(targets("B")).toEqual(["B"]); });
  it("setup latency cannot shift the requested downbeat", () => {
    const a = audioStartAt(2000, 1081, 5, 120);
    const b = audioStartAt(2000, 1144, 8, 120);
    expect(a.at).toBe(2000); expect(b.at).toBe(2000);
    expect(1081 + (a.time - 5) * 1000).toBeCloseTo(2000);
    expect(1144 + (b.time - 8) * 1000).toBeCloseTo(2000);
  });
  it.each([120, 124, 174])("late starts skip whole bars at %i BPM", bpm => {
    const bar = barMs(bpm), target = 10_000;
    const result = audioStartAt(target, target + 2 * bar + 40, 7, bpm);
    expect(result.at).toBeCloseTo(target + 3 * bar);
    expect(result.time).toBeGreaterThan(7.12);
  });
  it("CRATE joins use the next shared 16-step downbeat", () => {
    expect(nextBarStep(5.4)).toBe(16);
    expect(nextBarStep(20.3)).toBe(32);
    expect(nextBarStep(16)).toBe(32);
  });
});
