import { describe, it, expect } from "vitest";
import { silentSide } from "./monoFold";
const sig = (n: number, a: number) => Float32Array.from({ length: n }, (_, k) => a * Math.sin(k / 5));
describe("silentSide", () => {
  it("left-only take folds to mono", () => expect(silentSide(sig(4800, .5), new Float32Array(4800))).toBe(1));
  it("right-only take folds to mono", () => expect(silentSide(new Float32Array(4800), sig(4800, .5))).toBe(-1));
  it("real stereo stays stereo", () => expect(silentSide(sig(4800, .5), sig(4800, .3))).toBe(0));
});
