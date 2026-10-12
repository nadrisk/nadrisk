import { describe, it, expect } from "vitest";
import { defaultLaser, laserParams, laserPitchAt } from "./laser";
import { defaultSiren } from "./voices";

describe("LASER pitch envelope", () => {
  for (const amount of [-24, 0, 24]) {
    it(`starts at ${amount} semitones and returns exactly to root`, () => {
      expect(laserPitchAt(amount, 0, 3)).toBe(amount);
      expect(laserPitchAt(amount, 1, 3)).toBe(0);
      expect(laserPitchAt(amount, 2, 3)).toBe(0);
      expect(Math.abs(laserPitchAt(amount, .5, 3))).toBeLessThanOrEqual(Math.abs(amount));
    });
  }
  it("keeps older sirens in DUB and fills missing laser settings", () => {
    expect(defaultSiren().mode ?? "dub").toBe("dub");
    expect(laserParams()).toEqual(defaultLaser());
    expect(laserParams({ detune: 70 }).env).toEqual(defaultLaser().env);
    expect(laserParams({ amount: -12 }).amount).toBe(-12);
  });
  it("bounds imported envelope amount and changes curvature monotonically", () => {
    expect(laserPitchAt(100, 0, 3)).toBe(24);
    expect(laserPitchAt(-100, 0, 3)).toBe(-24);
    expect(laserPitchAt(24, .5, 5)).toBeLessThan(laserPitchAt(24, .5, 1));
  });
});