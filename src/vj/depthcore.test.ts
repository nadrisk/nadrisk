import { describe, expect, it } from "vitest";
import { makeNoise } from "./noise";
import { depthMesh, icosphere, MAX_FACES, MAX_LIFT, morphWeights } from "./depthcore";

describe("noise", () => {
  it("is deterministic and bounded", () => {
    const a = makeNoise(3), b = makeNoise(3);
    for (let i = 0; i < 200; i++) { const v = a.n3(i * .37, i * .11, i * .73); expect(v).toBe(b.n3(i * .37, i * .11, i * .73)); expect(Math.abs(v)).toBeLessThanOrEqual(1.05); }
  });
});
describe("depthcore crystal", () => {
  it("stays one low-poly mesh", () => expect(MAX_FACES).toBe(icosphere(2).f.length));
  it("zero amplitude leaves the bare faceted sphere", () => {
    const tris = depthMesh({ t: 3, phase: 0, amp: 0, warp: 1, detail: 1, seed: 2, twist: 0, lo: true });
    expect(tris.length).toBe(icosphere(1).f.length);
    for (const s of tris) for (const p of s.p) expect(Math.hypot(...p)).toBeCloseTo(1, 5);
  });
  it("shards stay bounded and some form", () => {
    const tris = depthMesh({ t: 7, phase: 0, amp: 1, warp: 1, detail: 1, seed: 1, twist: 0 });
    expect(tris.some(s => s.spike)).toBe(true);
    for (const s of tris) for (const p of s.p) expect(Math.hypot(...p)).toBeLessThanOrEqual(1 + MAX_LIFT + .01);
  });
  it("morph weights sum to one", () => { for (const p of [0, .4, 1.7, 2.9]) expect(morphWeights(p).reduce((a, b) => a + b)).toBeCloseTo(1); });
});
