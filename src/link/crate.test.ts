import { describe, it, expect } from "vitest";
import { readCrate, keyShift } from "./crate";

describe("crate", () => {
  it("lists saved sets with BPM and key, skipping empty slots", () => {
    const raw = JSON.stringify([null, { name: "Dusk", bpm: 172.4, harmony: { key: 2, scale: "minor" }, slots: [] }]);
    expect(readCrate(raw).map(t => [t.slot, t.name, t.bpm, t.key, t.scale])).toEqual([[1, "Dusk", 172, 2, "minor"]]);
  });
  it("survives corrupt storage", () => { expect(readCrate("{oops")).toEqual([]); });
  it("KEY SYNC takes the shortest way to the other deck's key", () => {
    expect(keyShift(2, 4)).toBe(2);   // D -> E: up 2
    expect(keyShift(0, 11)).toBe(-1); // C -> B: down 1
    expect(keyShift(0, 6)).toBe(6);
  });
});
