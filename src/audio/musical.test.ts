import { describe, expect, it } from "vitest";
import { CHORDS, CHORD_EXTS, chordNotes, chordSelection, defaultChord } from "./musical";
import { keyedChord, foldChord } from "./harmony";

describe("CORE + EXT chords", () => {
  const p = { ...defaultChord(), on: true, core: "power" as const, ext: "off" as const };
  it("plays root and fifth with CORE 5 and EXT off", () => {
    expect(chordNotes(p)).toEqual([0, 7]);
  });
  it("adds a seventh without adding a third to a power chord", () => {
    expect(chordNotes({ ...p, ext: "7" })).toEqual([0, 7, 10]);
  });
  it("supports suspended ninth chords", () => {
    expect(chordNotes({ ...p, core: "sus4", ext: "9" })).toEqual([0, 5, 7, 10, 14]);
  });
  it("selects major/minor independently in FREE", () => {
    expect(chordNotes({ ...p, core: "major", ext: "6" })).toEqual([0, 4, 7, 9]);
    expect(chordNotes({ ...p, core: "minor", ext: "11" })).toEqual([0, 3, 7, 10, 14, 17]);
  });
  it("uses scale quality instead of major/minor in KEY", () => {
    const h = { key: 0, scale: "major" as const };
    expect(keyedChord(h, 62, { ...p, core: "major", ext: "9" })).toEqual([0, 3, 7, 10, 14]);
    expect(keyedChord(h, 62, { ...p, core: "minor", ext: "9" })).toEqual([0, 3, 7, 10, 14]);
  });
  it("retains power and suspended structures in KEY", () => {
    const h = { key: 0, scale: "major" as const };
    expect(keyedChord(h, 62, { ...p, ext: "7" })).toEqual([0, 7, 10]);
    expect(keyedChord(h, 64, { ...p, core: "sus2" })).toEqual([0, 1, 7]);
  });
  it("applies inversion and spread once, before FOLD", () => {
    const offsets = keyedChord({ key: 0, scale: "major" }, 60, { ...p, core: "major", inversion: 1, spread: true });
    expect(offsets).toEqual([4, 12, 19]);
    expect(foldChord((offsets ?? []).map(n => n + 60), 60)).toEqual([64, 67, 72]);
  });
  it("preserves all saved legacy shapes until the dials are edited", () => {
    for (const type of Object.keys(CHORDS) as (keyof typeof CHORDS)[]) {
      expect(chordNotes({ ...defaultChord(), on: true, type })).toEqual([...CHORDS[type]]);
    }
    expect(chordSelection({ ...defaultChord(), type: "maj9" })).toEqual({ core: "major", ext: "9" });
  });
  it("orders EXT sequentially without maj7/maj9", () => {
    expect([...CHORD_EXTS]).toEqual(["off", "6", "7", "9", "11"]);
  });
  it("round-trips new selections in saved chord data", () => {
    const chord = { ...p, core: "sus4", ext: "9", inversion: 1 };
    expect(chordNotes(JSON.parse(JSON.stringify(chord)))).toEqual([5, 7, 10, 12, 14]);
  });
  it("keeps chord-off and FREE independent of the global scale", () => {
    expect(chordNotes({ ...p, on: false })).toEqual([0]);
    expect(keyedChord({ key: 0, scale: "major" }, 60, { ...p, fit: "fixed" })).toBeNull();
  });
});