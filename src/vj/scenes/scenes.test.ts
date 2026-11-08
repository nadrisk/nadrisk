import { describe, expect, it } from "vitest";
import { aqua, blobs, totemFeedback, totemRadius } from "./scenes";

const S = { t: 3, kick: .5, snare: .2, hat: .3, level: .4, size: 1, ring: .3 };
describe("AV scenes", () => {
  it("fields stay within 0..1 and are deterministic", () => {
    for (let i = 0; i < 200; i++) {
      const x = Math.sin(i) * .8, y = Math.cos(i * 1.3) * .5;
      for (const f of [aqua, blobs]) { const v = f(x, y, S); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); expect(f(x, y, S)).toBe(v); }
    }
  });
  it("totem morphs triangle -> square -> circle", () => {
    expect(totemRadius(Math.PI / 3, 0)).toBeCloseTo(.5); // triangle edge midpoint
    expect(totemRadius(Math.PI / 4, 1)).toBeCloseTo(Math.SQRT1_2); // square edge midpoint
    expect(totemRadius(.7, 2)).toBeCloseTo(1); // circle
  });
  it("smoke feedback decays to nothing without new input", () => {
    const W = 16, H = 16; let a = new Float32Array(W * H).fill(1), b = new Float32Array(W * H); const none = new Float32Array(W * H);
    for (let i = 0; i < 300; i++) { totemFeedback(a, b, none, W, H, i, 0); [a, b] = [b, a]; }
    expect(Math.max(...a)).toBeLessThan(.01);
  });
});
