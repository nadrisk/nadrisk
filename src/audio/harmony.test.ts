import { describe, expect, it } from "vitest";
import { foldChord } from "./harmony";

describe("FOLD register folding (±1 octave around pad pitch)", () => {
  it("keeps chords inside the window unchanged", () => {
    expect(foldChord([60, 64, 67], 60)).toEqual([60, 64, 67]);
    expect(foldChord([65, 69, 72], 60)).toEqual([65, 69, 72]);
  });
  it("folds voices above +12 down into inversions", () => {
    expect(foldChord([67, 71, 74], 60)).toEqual([62, 67, 71]);
    expect(foldChord([72, 76, 79], 60)).toEqual([64, 67, 72]);
  });
  it("folds voices below -12 up", () => {
    expect(foldChord([45, 48, 52], 60)).toEqual([48, 52, 57]);
  });
  it("anchors to the pad pitch (NOTE/OCT)", () => {
    expect(foldChord([72, 76, 79], 48)).toEqual([52, 55, 60]);
  });
});
