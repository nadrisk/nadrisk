import { describe, expect, it } from "vitest";
import { defaultSurface, hydrateSurface, meltFeedback } from "./surfaceState";
describe("performance surface", () => {
  it("offers four independent sends on each of six channels, all initially off", () => {
    const s = defaultSurface(); expect(s.sends).toHaveLength(6); expect(s.sends.every(r => r.length === 4 && r.every(v => !v))).toBe(true);
    s.sends[0][0] = true; expect(s.sends[1][0]).toBe(false); expect(s.sends[0][1]).toBe(false);
  });
  it("never allows MELT feedback to reach unity", () => { for (const v of [0, .5, 1, 99, NaN]) expect(meltFeedback(v)).toBeLessThan(1); });
  it("recalls independent joystick targets and sends", () => {
    const s = defaultSurface(); s.macros[2] = { x: "5:fx:10:mix", y: "1:level" }; s.sends[5][3] = true;
    expect(hydrateSurface(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});