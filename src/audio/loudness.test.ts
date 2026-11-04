import { describe, expect, it } from "vitest";
import { ENGINE_TRIM } from "./loudness";
// Default SYN measured ~1.23 raw peak into amp 0.42; trims bring synths up to the drum window (-4..-1.5 dBFS).
describe("engine loudness trims", () => {
  it("SYN default peak lands in the drum window", () => { const db = 20 * Math.log10(1.23 * .42 * ENGINE_TRIM.synth); expect(db).toBeGreaterThan(-4); expect(db).toBeLessThan(-1.5); });
  it("drums stay unchanged", () => { expect(ENGINE_TRIM.drum).toBe(1); expect(ENGINE_TRIM.prc).toBe(1); });
});
