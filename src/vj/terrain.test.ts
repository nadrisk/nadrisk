import { describe, expect, it } from "vitest";
import { climate, terrainRows, terrainHeight, monoliths } from "./terrain";
import { quietReaction } from "./models";
const q = quietReaction;
describe("TERRAIN", () => {
  it("keeps changing on its own with no audio", () => {
    expect(terrainHeight(1, 5, 0, q)).not.toBeCloseTo(terrainHeight(1, 5, 30, q), 3);
    expect(climate(0).seed).not.toBe(climate(50).seed);
  });
  it("produces finite rows nearest first", () => {
    const rows = terrainRows(10, 3, q, []);
    expect(rows.flat(2).every(Number.isFinite)).toBe(true);
    expect(rows[0][0][2]).toBeLessThan(rows[rows.length - 1][0][2]);
  });
  it("kicks raise the monoliths", () => {
    const a = monoliths(0, 0, q), b = monoliths(0, 0, { ...q, kick: 1 });
    expect(b[0].h).toBeGreaterThan(a[0].h);
  });
});
