import { describe, it, expect } from "vitest";
import { terrainAt, orbit, wavefold, pitchTaper, TERRAIN_DEFAULTS } from "./terrain";

describe("SURF terrain", () => {
  it("stays in [-1, 1] at extreme settings", () => {
    const p = { freq: 1, hold: 1, snow: 1, fold: 1 };
    for (let i = 0; i < 400; i++) {
      const z = terrainAt(Math.cos(i) , Math.sin(i * 1.7), p);
      expect(Math.abs(z)).toBeLessThanOrEqual(1);
    }
  });
  it("moving the puck changes the sound (different orbit output)", () => {
    const a = orbit(0.1, -0.5, 0, 0.3), b = orbit(0.1, 0.5, 0.4, 0.3);
    expect(terrainAt(...a, TERRAIN_DEFAULTS)).not.toBeCloseTo(terrainAt(...b, TERRAIN_DEFAULTS), 3);
  });
  it("fold reshapes the surface", () => {
    expect(terrainAt(0.3, 0.2, { ...TERRAIN_DEFAULTS, fold: 1 })).not.toBeCloseTo(terrainAt(0.3, 0.2, TERRAIN_DEFAULTS), 3);
  });
  it("wavefold bounded and taper caps high notes", () => {
    expect(Math.abs(wavefold(7.3))).toBeLessThanOrEqual(1);
    expect(pitchTaper(200)).toBe(1);
    expect(pitchTaper(2000)).toBeLessThan(0.2);
  });
});
