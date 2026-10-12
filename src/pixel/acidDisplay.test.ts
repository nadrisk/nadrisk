import { describe, expect, it } from "vitest";
import { defaultAcid } from "@/audio/acid";
import { drawAcidDisplay, draw808Display } from "./acidDisplay";
import { Px } from "./draw";
describe("303 display", () => {
  const render808 = (note: number, energy: number, tube = 0) => {
    const pts: number[][] = [];
    const p = new Px({ fillRect: (x: number, y: number) => pts.push([x,y]) } as unknown as CanvasRenderingContext2D, "fg", "bg");
    draw808Display(p, { pitchEnv: 48, pitchDecay: .4, tube }, note, energy);
    return pts;
  };
  it("keeps 808 pixels within the same frame and clear of the mode key", () => {
    for (const note of [20, 36, 60]) for (const energy of [0, 1]) for (const tube of [0, 1]) {
      const pts = render808(note, energy, tube);
      expect(pts.length).toBeGreaterThan(0);
      expect(pts.every(([x,y]) => x > 2 && x < 125 && y > 11 && y < 44)).toBe(true);
      expect(pts.every(([x,y]) => x < 96 || y > 21)).toBe(true);
    }
  });
  it("fills 808 digits with note and audible energy", () => {
    expect(render808(36, 1).length).toBeGreaterThan(render808(36, 0).length);
    expect(render808(60, 0).length).toBeGreaterThan(render808(20, 0).length);
  });
  it("keeps every pixel inside the frame across extremes", () => {
    for (const cutoff of [40, 320, 8000]) for (const res of [0, 1]) for (const decay of [.06, 1.5]) for (const envMod of [0, 5]) {
      const pts: number[][] = [];
      const p = new Px({ fillRect: (x: number, y: number) => pts.push([x,y]) } as unknown as CanvasRenderingContext2D, "fg", "bg");
      drawAcidDisplay(p, { ...defaultAcid(), cutoff, res, decay, envMod }, 1);
      expect(pts.every(([x,y]) => x > 2 && x < 125 && y > 11 && y < 44)).toBe(true);
    }
  });
});