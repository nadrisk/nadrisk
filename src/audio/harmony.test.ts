import { describe, expect, it } from "vitest";
import { foldChord, modPitchNote, modPitchOffset } from "./harmony";

describe("bipolar step pitch", () => {
  it("keeps zero exactly at the instrument root, even outside the key", () => {
    expect(modPitchNote({ key: 0, scale: "major" }, 53, .5)).toBe(53);
    expect(modPitchNote({ key: 0, scale: "major" }, 54, .5)).toBe(54);
  });
  it("walks twelve scale notes above and below F1 in F minor", () => {
    const h = { key: 5, scale: "minor" as const };
    expect(modPitchNote(h, 29, .5 + 1 / 24)).toBe(31);
    expect(modPitchNote(h, 29, .5 + 2 / 24)).toBe(32);
    expect(modPitchNote(h, 29, 1)).toBe(49);
    expect(modPitchNote(h, 29, 0)).toBe(8);
  });
  it("uses exactly ±12 semitones with KEY off", () => {
    expect(modPitchNote({ key: 0, scale: "off" }, 53, 0)).toBe(41);
    expect(modPitchNote({ key: 0, scale: "off" }, 53, 1)).toBe(65);
    expect(modPitchOffset(.5)).toBe(0);
    expect(modPitchOffset(1)).toBe(12);
    expect(modPitchOffset(0)).toBe(-12);
  });
  it("preserves exact keyboard-recorded pitch lanes", () => {
    expect(modPitchNote({ key: 0, scale: "major" }, 48, .5 + 1 / 48, 24)).toBe(49);
  });
});

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
