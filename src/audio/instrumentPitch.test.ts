import { describe, expect, it } from "vitest";
import { defaultInstrumentNote, instrumentKeyNote, sampleTranspose, sliceIndex } from "./instrumentPitch";
import { modPitchNote } from "./harmony";
describe("key-matched instrument roots", () => {
  it("sets all pitched engines to F in their existing octave", () => {
    for (const engine of ["synth", "pad", "sampler", "poly", "siren"]) {
      expect(instrumentKeyNote(engine, 55, 5)).toBe(53);
    }
    expect(instrumentKeyNote("808", 31, 5)).toBe(29);
    expect(instrumentKeyNote("synth", 79, 5)).toBe(77);
  });
  it("leaves drum and PRC tuning unchanged", () => {
    expect(instrumentKeyNote("drum", 48, 5)).toBe(48);
    expect(instrumentKeyNote("idm", 48, 5)).toBe(48);
  });
  it("anchors pitch MOD to the changed root with scale OFF and F minor", () => {
    const root = instrumentKeyNote("synth", 55, 5);
    expect(modPitchNote({ key: 5, scale: "off" }, root, .5)).toBe(53);
    expect(modPitchNote({ key: 5, scale: "minor" }, root, .5)).toBe(53);
    expect(modPitchNote({ key: 5, scale: "minor" }, root, .5 + 1 / 24)).toBe(55);
  });
});
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