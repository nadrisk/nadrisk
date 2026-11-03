import { describe, expect, it } from "vitest";
import { bitFlip, hackMask, hackRng } from "./hack";
import { FX_DEFS, migrateFx } from "./effects";

describe("hack circuit bend", () => {
  it("bit-flipped output stays within [-1, 1]", () => {
    for (let m = 0; m < 4096; m += 37) for (let x = -1.5; x <= 1.5; x += .05) { const y = bitFlip(x, m); expect(y).toBeGreaterThanOrEqual(-1); expect(y).toBeLessThanOrEqual(1); }
  });
  it("no shorted lines leaves the signal (to 12-bit precision)", () => { expect(Math.abs(bitFlip(.3, 0) - .3)).toBeLessThan(1e-3); });
  it("seeded chaos repeats exactly", () => { const a = hackRng(42), b = hackRng(42); const sa = Array.from({ length: 20 }, a), sb = Array.from({ length: 20 }, b); expect(sa).toEqual(sb); expect(hackMask(.7, hackRng(7))).toBe(hackMask(.7, hackRng(7))); });
  it("SHRT at 0 shorts nothing", () => { expect(hackMask(0, hackRng(1))).toBe(0); });
  it("old neuro.box loads as hack with starting values", () => {
    const [u] = migrateFx([{ id: 5, on: true, type: "neurobox", params: { reese: .9 } }]);
    expect(u.type).toBe("hack"); expect(u.id).toBe(5); expect(u.params.short).toBe(FX_DEFS.hack.params.short[0]); expect(u.params.reese).toBeUndefined();
  });
  it("morph loads without the old mutate value", () => {
    const [u] = migrateFx([{ id: 1, on: true, type: "morph", params: { cutoff: 900, mutate: .8 } }]);
    expect(u.params.mutate).toBeUndefined(); expect(u.params.cutoff).toBe(900); expect("mutate" in FX_DEFS.morph.params).toBe(false);
  });
});

import { hackMod, hackPattern, hackStep } from "./hack";
describe("hack GEN patterns", () => {
  it("same seed gives the same pattern, new seed a new one", () => { expect(hackPattern(9)).toEqual(hackPattern(9)); expect(hackPattern(9)).not.toEqual(hackPattern(10)); });
  it("no stuck lanes: 3+ levels and no level held over 3 steps", () => {
    for (let seed = 1; seed < 200; seed++) { const p = hackPattern(seed);
      for (let l = 0; l < 3; l++) { const v = p.slice(l * 16, l * 16 + 16); expect(new Set(v).size).toBeGreaterThanOrEqual(3); let run = 1; for (let i = 1; i < 16; i++) { run = v[i] === v[i - 1] ? run + 1 : 1; expect(run).toBeLessThanOrEqual(3); } }
      const sk = p.slice(48); expect(sk.every(x => x >= 0 && x <= 1)).toBe(true); expect(sk.some(x => x === 0)).toBe(true); }
  });
  it("DEPTH 0 plays exactly the knob", () => { expect(hackMod(.37, 0, 1)).toBe(.37); expect(hackMod(.37, 0, -1)).toBe(.37); });
  it("step follows the grid: 1/16 at 120 BPM is 0.125 s per step", () => { expect(hackStep(0, 120, 2, 16)).toBe(0); expect(hackStep(.125, 120, 2, 16)).toBe(1); expect(hackStep(2, 120, 2, 16)).toBe(0); expect(hackStep(.5, 120, 0, 4)).toBe(1); });
  it("old hack units load with no pattern and DEPTH 0", () => { const [u] = migrateFx([{ id: 2, on: true, type: "hack", params: { short: .5, chaos: .3 } }]); expect(u.params.depth).toBe(0); expect(u.params.seed).toBe(0); expect(u.params.chaos).toBe(.3); });
});
