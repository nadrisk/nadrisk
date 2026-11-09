import { describe, expect, it } from "vitest";
import { cleanOpts, DEFAULT_OPTS, stepOpt } from "./options";

describe("independent AV materials", () => {
  it("plasma palettes wrap before SPACE-only checkerboard (index 7)", () => {
    expect(stepOpt({ ...DEFAULT_OPTS, palette: 6 }, "palette", 1).palette).toBe(0);
    expect(cleanOpts({ palette: 7 }).palette).toBe(0);
  });
  it("object palettes include checkerboard without changing world or plasma", () => {
    const opts = cleanOpts({ objectPalette: 6, floorPalette: 2, palette: 3 });
    const next = stepOpt(opts, "objectPalette", 1);
    expect(next.objectPalette).toBe(7);
    expect(next.floorPalette).toBe(2);
    expect(next.palette).toBe(3);
  });
  it("world palettes include checkerboard without changing object colors or skin", () => {
    const opts = cleanOpts({ floorPalette: 6, objectPalette: 4, skin: 3, floor: 2 });
    const next = stepOpt(opts, "floorPalette", 1);
    expect(next.floorPalette).toBe(7);
    expect(next.objectPalette).toBe(4);
    expect(next.skin).toBe(3);
    expect(next.floor).toBe(2);
  });
  it("old shared SPACE colors migrate to both surfaces", () => {
    const opts = cleanOpts({ palette: 7 });
    expect(opts.objectPalette).toBe(7);
    expect(opts.floorPalette).toBe(7);
  });
});