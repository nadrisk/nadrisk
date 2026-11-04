import { describe, it, expect } from "vitest";
import { reflect, advance, FREEZE_JITTER } from "./grainPos";
describe("grain position", () => {
  it("reflects spray inside the region", () => {
    expect(reflect(1.2, 0, 1)).toBeCloseTo(.8); expect(reflect(-.3, 0, 1)).toBeCloseTo(.3);
    for (let x = -5; x < 5; x += .37) { const r = reflect(x, .2, .6); expect(r).toBeGreaterThanOrEqual(.2); expect(r).toBeLessThanOrEqual(.6); }
  });
  it("freeze keeps the read head where it was", () => { expect(advance(.4, .1, 0, 1, true)).toBe(.4); expect(advance(.4, .1, 0, 1, false)).toBeCloseTo(.5); });
  it("wraps to start past the end", () => { expect(advance(.95, .1, .1, 1, false)).toBe(.1); });
  it("freeze jitter stays a few ms", () => { expect(FREEZE_JITTER).toBeLessThanOrEqual(.005); });
});
