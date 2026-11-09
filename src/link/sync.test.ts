import { describe, it, expect } from "vitest";
import { reanchorEpoch, phaseErrMs, nudgeRatio, clockOffset, syncState, nextBarAt, barMs, targets } from "./deck";

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
  it("nudges are gentle and capped at 3%", () => {
    expect(nudgeRatio(2)).toBe(1);
    expect(nudgeRatio(10)).toBeCloseTo(0.99);
    expect(nudgeRatio(500)).toBeCloseTo(0.97);
    expect(nudgeRatio(-500)).toBeCloseTo(1.03);
  });
  it("clock offset from a ping round trip", () => { expect(clockOffset(1000, 5050, 1100)).toBe(4000); });
  it("sync light", () => { expect(syncState(false, 0)).toBe("OFF"); expect(syncState(true, 5)).toBe("LOCK"); expect(syncState(true, 40)).toBe("DRIFT"); });
  it("BOTH targets both decks", () => { expect(targets("BOTH")).toEqual(["A", "B"]); expect(targets("B")).toEqual(["B"]); });
});
