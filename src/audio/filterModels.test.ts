import { describe, expect, it } from "vitest";
import { cleanOf, modelQ } from "./clean";
describe("SYN filter models", () => {
  it("old patches load as CLEAN", () => expect(cleanOf({ clean: { cutoff: 900 } } as never).flt).toBe(0));
  it("clamps an unknown model", () => expect(cleanOf({ clean: { flt: 9 } } as never).flt).toBe(3));
  it("CLEAN keeps the original resonance law", () => expect(modelQ(0, .5)).toEqual([.707 + 7, .6]));
  it("LADDER is four gentle 24 dB stages", () => expect(modelQ(1, 1)).toHaveLength(4));
  it("every model's Q stays bounded", () => { for (let m = 0; m < 4; m++) for (const q of modelQ(m, 1)) expect(q).toBeLessThanOrEqual(25); });
});
