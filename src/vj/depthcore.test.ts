import { describe, expect, it } from "vitest";
import { makeNoise } from "./noise";
import { depthMesh, icosphere, MAX_VERTS, morphWeights } from "./depthcore";

describe("noise", () => {
  it("is deterministic and bounded", () => {
    const a = makeNoise(3), b = makeNoise(3);
    for (let i = 0; i < 200; i++) { const v = a.n3(i * .37, i * .11, i * .73); expect(v).toBe(b.n3(i * .37, i * .11, i * .73)); expect(Math.abs(v)).toBeLessThanOrEqual(1.05); }
  });
});
describe("depthcore mesh", () => {
  it("stays a single bounded mesh", () => expect(MAX_VERTS).toBe(icosphere(4).v.length));
  it("zero amplitude leaves the base sphere untouched", () => {
    const { pts } = depthMesh({ t: 3, phase: 0, amp: 0, warp: 1, detail: 1, seed: 2, twist: 0, lo: true });
    for (const p of pts) expect(Math.hypot(...p)).toBeCloseTo(1, 5);
  });
  it("morph weights sum to one", () => { for (const p of [0, .4, 1.7, 2.9]) expect(morphWeights(p).reduce((a, b) => a + b)).toBeCloseTo(1); });
});
