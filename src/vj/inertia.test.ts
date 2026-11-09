import { describe, it, expect } from "vitest";
import { INERTIA_TABLE, cleanOpts } from "./gl/options";

describe("INERT control", () => {
  it("MAX keeps the current punchy kick", () => { expect(INERTIA_TABLE[3]).toEqual({ spin: 3.6, spinDrag: 1.2, travel: 2, travelDrag: 2.2 }); });
  it("MIN pushes less and settles faster than the old baseline", () => {
    expect(INERTIA_TABLE[0].spin).toBeLessThan(2.4); expect(INERTIA_TABLE[0].spinDrag).toBeGreaterThan(1.6);
  });
  it("old saved visuals default to MAX", () => { expect(cleanOpts({ ground: 0 }).inertia).toBe(3); });
});
