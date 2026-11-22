import { describe, expect, it } from "vitest";
import { cadenceStep, defaultCadence, latticeCell } from "./cadence";
const am = { key: 9, scale: "minor" as const };
describe("cadence", () => {
  it("ground plays the bass of i VI III VII an octave under the root", () => {
    const c = { ...defaultCadence(), gate: 0, rate: 0 }; // 4-step chords, no surge
    expect([0, 4, 8, 12].map(t => cadenceStep(c, am, t, 57).note)).toEqual([45, 53, 48, 55]);
  });
  it("horizon crops the progression", () => {
    const c = { ...defaultCadence(), gate: 0, rate: 0, horizon: 2 };
    expect(cadenceStep(c, am, 8, 57).note).toBe(45);
  });
  it("lattice runs free and polymetric (X len 4 vs Y len 3)", () => {
    const c = { ...defaultCadence(), xClk: 1, yClk: 4, xLen: 4, yLen: 3 };
    expect(latticeCell(c, 5)).toEqual({ x: 1, y: 1 });
    expect(latticeCell(c, 12)).toEqual({ x: 0, y: 0 });
  });
  it("every note lands in key", () => {
    const c = { ...defaultCadence(), gate: 6, shape: 3 };
    const inA = [9, 11, 0, 2, 4, 5, 7];
    for (let t = 0; t < 128; t++) expect(inA).toContain(cadenceStep(c, am, t, 57).note % 12);
  });
});
