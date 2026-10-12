import { describe, expect, it } from "vitest";
import { synthPreview } from "./synthPreview";

describe("synth bitmap preview", () => {
  const bars = (fn: (h: number) => number) => Array.from({ length: 16 }, (_, i) => Math.sqrt(fn(i + 1)));
  it("squares perceptual bars and avoids the old square-like TRI", () => {
    const tri = synthPreview(bars(h => h % 2 ? 1 / h ** 2 : 0));
    const sqr = synthPreview(bars(h => h % 2 ? 1 / h : 0));
    expect(tri[2]).toBeLessThan(sqr[2]);
    expect(tri[5]).toBeGreaterThan(tri[2]);
    expect(sqr[2]).toBeGreaterThan(.75);
  });
  it("returns finite, bounded cycles for sparse and silent recipes", () => {
    for (const p of [[], Array(16).fill(0), Array(16).fill(1), bars(h => h === 16 ? 1 : 0)]) {
      const result = synthPreview(p);
      expect(result).toHaveLength(22);
      expect(result.every(v => Number.isFinite(v) && Math.abs(v) <= 1)).toBe(true);
    }
    expect(synthPreview([])).toEqual(synthPreview([1]));
  });
  it("caches without mutating recipes and responds to custom edits", () => {
    const p = [1, .5]; const old = p.slice();
    expect(synthPreview(p)).toBe(synthPreview(p));
    expect(p).toEqual(old);
    expect(synthPreview(p)).not.toEqual(synthPreview([1, 0]));
  });
  it("keeps native shapes recognisable and bounded", () => {
    for (const wave of ["sine", "triangle", "sawtooth", "square"] as const) {
      expect(synthPreview([], wave).every(v => Number.isFinite(v) && Math.abs(v) <= 1)).toBe(true);
    }
    expect(synthPreview([], "square")[5]).toBe(1);
  });
});