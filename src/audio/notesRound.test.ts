import { describe, expect, it } from "vitest";
import { default808 } from "./voices";
import { DRUM_PRESETS } from "./drumPresets";
import { hackRng } from "./hack";

describe("groovebox notes round", () => {
  it("808 starts as a clean sub", () => { const d = default808(); expect(d.harmonics).toBe(0); expect(d.tube).toBe(0); });
  it("has 909 house kick and snare presets", () => {
    expect(DRUM_PRESETS.kick.some(p => p.id === "909")).toBe(true);
    expect(DRUM_PRESETS.snare.some(p => p.id === "909")).toBe(true);
  });
  it("HACK step randomness repeats for the same step", () => {
    const a = hackRng(31 + 3 * 977 + 7), b = hackRng(31 + 3 * 977 + 7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
