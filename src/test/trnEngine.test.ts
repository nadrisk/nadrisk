import { describe, expect, it } from "vitest";
import { applyXY, xyLabels } from "@/audio/xyMaps";
import { cleanOf } from "@/audio/clean";
import type { Slot } from "@/hooks/useGroovebox";

const trn = (x: number, y: number) => ({ engine: "synth", synth: { clean: { ...cleanOf(), osc: "terrain", tfreq: .25, fold: 0 } }, xy: { x, y } }) as unknown as Slot;

describe("TRN terrain machine", () => {
  it("XY pad moves terrain FREQ on X and FOLD on Y only", () => {
    const c = cleanOf(applyXY(trn(.5, .5)).synth);
    expect(c.tfreq).toBeCloseTo(.75); expect(c.fold).toBeCloseTo(.5); expect(c.cutoff).toBe(cleanOf().cutoff);
    expect(xyLabels(trn(0, 0))).toEqual(["FREQ", "FOLD"]);
  });
  it("wavetable SYN keeps its own XY mapping", () => {
    expect(xyLabels({ engine: "synth", synth: { clean: cleanOf() } } as unknown as Slot)[0]).toBe("ENV DET SUB");
  });
});
