import { describe, it, expect } from "vitest";
import { samplerHold } from "@/audio/voices";
describe("sampler envelope punch", () => {
  it("holds full level at least 12 ms even with the shortest decay", () => { expect(samplerHold(0.001)).toBeCloseTo(0.012); });
  it("caps the hold at 60 ms for long decays", () => { expect(samplerHold(2)).toBeCloseTo(0.06); });
});
