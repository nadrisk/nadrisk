import { describe, expect, it } from "vitest";
import { scaleChordOffsets, degreeOf, degreeToSemi, SCALES, type ScaleName } from "./arp";
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
  it("matches across octaves above and below the root (negative degrees)", () => {
    for (const sc of ["minor", "major", "harm min", "dorian"] as ScaleName[]) {
      const n = SCALES[sc].length;
      for (let d = -2 * n; d <= 2 * n; d++) {
        const s = degreeToSemi(sc, d);
        expect(degreeOf(sc, s)).toBe(d);
        expect(scaleChordOffsets(sc, s, 3)).toEqual(scaleChordOffsets(sc, s + 12, 3));
        expect(scaleChordOffsets(sc, s, 4)).toEqual(scaleChordOffsets(sc, s - 12, 4));
      }
    }
    expect(scaleChordOffsets("minor", -5, 3)).toEqual([0, 3, 7]);
    expect(scaleChordOffsets("minor", 15, 3)).toEqual([0, 4, 7]);
  });
  it("off-scale fallback is deterministic, also below the root", () => {
    for (const s of [-11, -1, 1, 6, 13]) expect(scaleChordOffsets("minor", s, 3)).toBeNull();
  });
  it("sevenths stay diatonic", () => {
    expect(scaleChordOffsets("minor", 0, 4)).toEqual([0, 3, 7, 10]);
    expect(scaleChordOffsets("minor", 3, 4)).toEqual([0, 4, 7, 11]);
  });
});
import { shapeInScale } from "./arp";
import { CHORDS } from "./musical";
describe("selected chord kept when it fits", () => {
  it("detects fitting and non-fitting shapes", () => {
    expect(shapeInScale("minor", 0, CHORDS.min7)).toBe(true);
    expect(shapeInScale("minor", 0, CHORDS.major)).toBe(false);
    expect(shapeInScale("minor", 0, CHORDS["house m9"])).toBe(false);
    expect(shapeInScale("minor", 3, CHORDS.maj7)).toBe(true);
    expect(shapeInScale("minor", -2, CHORDS.major)).toBe(true);
    expect(shapeInScale("chromatic", 4, CHORDS.dom7)).toBe(true);
  });
});
