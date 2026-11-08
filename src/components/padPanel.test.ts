import { describe, it, expect } from "vitest";
import { stepPreset } from "./PadPanel";
import { PAD_PRESETS } from "@/audio/padPresets";
describe("PAD DEC/INC", () => {
  it("wraps last -> first and first -> last", () => { const n = PAD_PRESETS.length; expect(stepPreset(n - 1, 1)).toBe(0); expect(stepPreset(0, -1)).toBe(n - 1); expect(stepPreset(3, 1)).toBe(4); });
});
