import { describe, expect, it } from "vitest";
import { defaultAcid } from "@/audio/acid";
import { drawAcidDisplay } from "./acidDisplay";
import { Px } from "./draw";
describe("303 display", () => {
  it("keeps every pixel inside the frame across extremes", () => {
    for (const cutoff of [40, 320, 8000]) for (const res of [0, 1]) for (const decay of [.06, 1.5]) for (const envMod of [0, 5]) {
      const pts: number[][] = [];
      const p = new Px({ fillRect: (x: number, y: number) => pts.push([x,y]) } as unknown as CanvasRenderingContext2D, "fg", "bg");
      drawAcidDisplay(p, { ...defaultAcid(), cutoff, res, decay, envMod }, 1);
      expect(pts.every(([x,y]) => x > 2 && x < 125 && y > 11 && y < 44)).toBe(true);
    }
  });
});