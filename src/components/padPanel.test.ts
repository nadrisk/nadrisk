import { describe, it, expect } from "vitest";
import { stepPreset } from "./PadPanel";
describe("PAD DEC/INC", () => {
  it("wraps 12 -> 1 and 1 -> 12", () => { expect(stepPreset(11, 1)).toBe(0); expect(stepPreset(0, -1)).toBe(11); expect(stepPreset(3, 1)).toBe(4); });
});
