import { describe, expect, it } from "vitest";
import { lockToChord, trancePhrase, defaultTrance, degreeToSemi, euclid } from "./arp";

const MINOR = [0, 3, 7];
const inChord = (s: number) => MINOR.includes(((s % 12) + 12) % 12);

describe("CHRD phrase lock", () => {
  it("every scale note of a random phrase snaps to a chord tone", () => {
    for (let d = 0; d < 15; d++) expect(inChord(lockToChord(degreeToSemi("minor", d), MINOR))).toBe(true);
  });
  it("trance phrase notes lock to chord tones", () => {
    for (const c of trancePhrase("minor", { ...defaultTrance(), spread: 1 })) expect(inChord(lockToChord(degreeToSemi("minor", c.deg), MINOR))).toBe(true);
  });
  it("chord tones stay unchanged and keep their octave", () => {
    expect(lockToChord(7, MINOR)).toBe(7);
    expect(lockToChord(15, MINOR)).toBe(15);
    expect(lockToChord(2, MINOR)).toBe(3);
  });
  it("no chord tones passes notes through", () => expect(lockToChord(5, [])).toBe(5));
  it("euclid rhythm is unaffected (lock only changes pitch)", () => expect(euclid(3, 8).filter(Boolean).length).toBe(3));
});
