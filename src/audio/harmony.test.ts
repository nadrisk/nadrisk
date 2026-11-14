import { describe, expect, it } from "vitest";
import { foldChord, keyChord, modPitchNote } from "./harmony";

describe("LEAD register folding", () => {
  it("tracks root changes inside the window", () => {
    expect(foldChord([60, 64, 67], 60)).toEqual([60, 64, 67]);
    expect(foldChord([65, 69, 72], 60)).toEqual([65, 69, 72]);
  });
  it("keeps an octave-up pitch modulation an octave up", () => {
    const root = modPitchNote({ key: 0, scale: "major" }, 60, 1);
    expect(root).toBe(72);
    expect(foldChord([root, root + 4, root + 7], 60)).toEqual([72, 76, 79]);
  });
  it("folds only voices above the inclusive two-octave ceiling", () => {
    expect(foldChord([84, 88, 91], 60)).toEqual([76, 79, 84]);
  });
  it("folds only voices below the inclusive two-octave floor", () => {
    expect(foldChord([31, 35, 38], 60)).toEqual([38, 43, 47]);
    expect(foldChord([36, 40, 43], 60)).toEqual([36, 40, 43]);
  });
  it("anchors the window to each saved pad note", () => {
    expect(foldChord([72, 76, 79], 48)).toEqual([64, 67, 72]);
  });
  it("preserves key-derived chord quality when upper voices fold", () => {
    const h = { key: 0, scale: "major" as const };
    const root = modPitchNote(h, 60, 23 / 24, 24);
    expect(root).toBe(82);
    const offsets = keyChord(h, root, 3);
    expect(offsets).toEqual([0, 3, 6]);
    expect(foldChord((offsets ?? []).map(n => root + n), 60)).toEqual([73, 76, 82]);
  });
  it("folds wide voicings in whole octaves without dropping doubled voices", () => {
    expect(foldChord([60, 84, 108, 115], 60)).toEqual([60, 79, 84, 84]);
  });
});