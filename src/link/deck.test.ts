import { describe, it, expect } from "vitest";
import { xfGain, nextBarAt, eqDb, filterHz, makeRoomCode, validRoom } from "./deck";

describe("crossfader", () => {
  it("full A at left, silent B", () => { expect(xfGain("A", -1, "blend")).toBeCloseTo(1); expect(xfGain("B", -1, "blend")).toBeCloseTo(0); });
  it("equal-power centre", () => { expect(xfGain("A", 0, "blend")).toBeCloseTo(Math.SQRT1_2); expect(xfGain("B", 0, "blend")).toBeCloseTo(Math.SQRT1_2); });
  it("cut curve keeps both full at centre and kills at the far edge", () => { expect(xfGain("A", 0, "cut")).toBe(1); expect(xfGain("B", -1, "cut")).toBe(0); });
});
describe("bar quantisation", () => {
  it("snaps to the next bar of 4 beats", () => { expect(nextBarAt(1000, 0, 120, 0)).toBe(2000); expect(nextBarAt(2100, 0, 120, 0)).toBe(4000); });
  it("respects the lead time", () => { expect(nextBarAt(1900, 0, 120, 300)).toBe(4000); });
});
describe("deck tone", () => {
  it("EQ flat at 1, kill at 0", () => { expect(eqDb(1)).toBe(0); expect(eqDb(0)).toBe(-40); });
  it("filter centre is open", () => { expect(filterHz(0)).toEqual({ lp: 20000, hp: 20 }); });
  it("room codes are 4 valid chars", () => { const c = makeRoomCode(); expect(validRoom(c)).toBe(true); });
});
