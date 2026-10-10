import { describe, expect, it } from "vitest";
import { scaleChordOffsets, degreeOf } from "./arp";
describe("scale-fit chords", () => {
  it("stacks in-key thirds on scale pitches, including below the root", () => {
    expect(scaleChordOffsets("minor", 0, 3)).toEqual([0, 3, 7]);
    expect(scaleChordOffsets("minor", 3, 3)).toEqual([0, 4, 7]);
    expect(degreeOf("minor", -2)).toBe(-1);
    expect(scaleChordOffsets("minor", -2, 3)).toEqual([0, 4, 7]);
  });
  it("keeps the fixed shape for off-scale pitches and the chromatic scale", () => {
    expect(scaleChordOffsets("minor", 1, 3)).toBeNull();
    expect(scaleChordOffsets("chromatic", 4, 3)).toBeNull();
  });
});
