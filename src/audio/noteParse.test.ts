import { describe, expect, it } from "vitest";
import { parseNote } from "./noteParse";

describe("parseNote", () => {
  it("reads notes, cents and Hz", () => {
    expect(parseNote("A4")).toBeCloseTo(440);
    expect(parseNote("a1")).toBeCloseTo(55);
    expect(parseNote("G1+8c")).toBeCloseTo(49 * 2 ** (8 / 1200), 1);
    expect(parseNote("C#2")).toBeCloseTo(69.3, 1);
    expect(parseNote("Bb1 -12")).toBeCloseTo(58.27 * 2 ** (-12 / 1200), 1);
    expect(parseNote("49hz")).toBe(49);
    expect(parseNote("120")).toBe(120);
  });
  it("rejects junk", () => {
    for (const s of ["", "H2", "kick", "G1+300c", "-5"]) expect(parseNote(s)).toBeNull();
  });
});
