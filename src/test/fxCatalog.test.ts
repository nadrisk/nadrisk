import { describe, expect, it } from "vitest";
import { FX_TYPES } from "@/audio/effects";
import { FX_CATEGORIES } from "@/components/fxCatalog";

describe("effect categorization", () => {
  const groups = [
    ["compressor", "noisegate", "sidechain", "ott", "gain"],
    ["eq", "dyneq", "djfilter", "morph", "drumbus"],
    ["saturation", "acid", "bitcrush", "metal", "spectral"],
    ["chorus", "flanger", "phaser", "vibrato", "tremolo"],
    ["delay", "reverseDelay", "reverb", "hack", "gate"],
  ];
  FX_CATEGORIES.forEach((group, index) => {
    it(`keeps the planned effects in ${group.label}`, () => {
      expect([...group.effects]).toEqual(groups[index]);
    });
  });
  it("offers every effect exactly once", () => {
    const all = FX_CATEGORIES.flatMap(group => [...group.effects]);
    expect(all).toHaveLength(25);
    expect([...new Set(all)].sort()).toEqual([...FX_TYPES].sort());
  });
});