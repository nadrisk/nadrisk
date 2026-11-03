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
