import { describe, expect, it } from "vitest";
import { cleanOpts, DEFAULT_OPTS, PALETTES, stepOpt, SURFACE_PALETTES } from "./options";

describe("independent AV materials", () => {
  it("plasma palettes wrap before SPACE-only checkerboard (index 6)", () => {
    expect(stepOpt({ ...DEFAULT_OPTS, palette: 5 }, "palette", 1).palette).toBe(0);
    expect(cleanOpts({ palette: 6 }).palette).toBe(0);
  });
  it("the classic palette is gone from every list", () => {
    expect(PALETTES).not.toContain("CLASSIC");
    expect(SURFACE_PALETTES).not.toContain("CLASSIC");
    expect(PALETTES).toEqual(["ORIG", "RGB", "BIDOU", "INTERF", "TUNNEL", "1-BIT"]);
  });
  it("object palettes include checkerboard without changing world or plasma", () => {
    const opts = cleanOpts({ objectPalette: 5, floorPalette: 2, palette: 3 });
    const next = stepOpt(opts, "objectPalette", 1);
    expect(next.objectPalette).toBe(6);
    expect(next.floorPalette).toBe(2);
    expect(next.palette).toBe(3);
  });
  it("world palettes include checkerboard without changing object colors or skin", () => {
    const opts = cleanOpts({ floorPalette: 5, objectPalette: 4, skin: 3, floor: 2 });
    const next = stepOpt(opts, "floorPalette", 1);
    expect(next.floorPalette).toBe(6);
    expect(next.objectPalette).toBe(4);
    expect(next.skin).toBe(3);
    expect(next.floor).toBe(2);
  });
  it("old shared SPACE colors migrate to both surfaces", () => {
    const opts = cleanOpts({ palette: 6 });
    expect(opts.objectPalette).toBe(6);
    expect(opts.floorPalette).toBe(6);
  });
});
