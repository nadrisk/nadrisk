import { describe, expect, it } from "vitest";
import { defaultInstrumentNote, sampleTranspose, sliceIndex } from "./instrumentPitch";
describe("fresh instrument roots", () => {
  it("starts all bass modes at C1", () => expect(defaultInstrumentNote("808")).toBe(24));
  it("starts SYN at C3", () => expect(defaultInstrumentNote("synth")).toBe(48));
  it("starts PAD at C3", () => expect(defaultInstrumentNote("pad")).toBe(48));
  it("starts SMP at C3", () => expect(defaultInstrumentNote("sampler")).toBe(48));
  it("plays new C3 samples unshifted and retains legacy C4", () => {
    expect(sampleTranspose(48, 0, 48)).toBe(0);
    expect(sampleTranspose(60)).toBe(0);
  });
  it("maps slice zero to C3 regardless of slot root", () => {
    expect(sliceIndex(48, 16)).toBe(0);
    expect(sliceIndex(49, 16)).toBe(1);
    expect(sliceIndex(53, 16)).toBe(5);
    expect(sliceIndex(47, 16)).toBe(15);
  });
});