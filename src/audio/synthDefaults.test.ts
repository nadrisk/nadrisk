import { describe, it, expect } from "vitest";
import { cleanOf, defaultClean } from "./clean";
describe("SYN defaults", () => {
  it("a new synth starts open: CUT 100%, RES/ENV/DRV/WAVE/SUB/DETN 0, 8 voices", () => {
    const c = cleanOf({ clean: defaultClean() });
    expect([c.cutoff, c.res, c.envAmt, c.drive, c.wave, c.sub, c.detune, c.voices]).toEqual([16000, 0, 0, 0, 0, 0, 0, 8]);
  });
});
