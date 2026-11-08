import { describe, expect, it } from "vitest";
import { PAD_PRESETS, padPartials, vowelAt, VOWELS } from "./padPresets";
import { PAD_MAX_VOICES, padCutoff, padFromPreset, padParams, padPreset, padRingCap } from "./pad";
import { applyXY } from "./xyMaps";
import type { Slot } from "@/hooks/useGroovebox";

describe("PAD instrument", () => {
  it("ships 17 presets that all load to in-range macros", () => {
    expect(PAD_PRESETS).toHaveLength(17);
    PAD_PRESETS.forEach((r, i) => { const p = padFromPreset(i); expect(p.preset).toBe(i);
      [p.bright, p.motion, p.space, p.age].forEach(v => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); });
      const c = padCutoff(r, p); expect(c).toBeGreaterThanOrEqual(80); expect(c).toBeLessThanOrEqual(16000);
      r.layers.forEach(l => padPartials(l.table).forEach(a => expect(Number.isFinite(a)).toBe(true))); });
  });
  it("old sets without PAD settings fall back to the first preset", () => { expect(padParams(undefined)).toEqual(padFromPreset(0)); expect(padPreset(99).name).toBe(PAD_PRESETS[99 % 17].name); });
  it("clamps broken saved values", () => { const p = padParams({ bright: 5, rel: -1, atk: NaN }); expect([p.bright, p.rel, p.atk]).toEqual([1, .05, .002]); });
  it("never rings more than 6 voices", () => { for (let n = 1; n <= 8; n++) expect(padRingCap(n) * Math.min(n, PAD_MAX_VOICES)).toBeLessThanOrEqual(Math.max(PAD_MAX_VOICES, n)); expect(padRingCap(3)).toBe(2); expect(padRingCap(1)).toBe(6); });
  it("vowel morph lands on the vowel formants at each end", () => { expect(vowelAt([0, 4], 0)).toEqual(VOWELS[0]); vowelAt([0, 4], 1).forEach((f, i) => expect(f).toBeCloseTo(VOWELS[4][i])); });
  it("XY corners stay in range and the centre is the saved sound", () => {
    const s = { engine: "pad", pad: padFromPreset(1), xy: { x: 0, y: 0 } } as unknown as Slot;
    expect(applyXY(s)).toBe(s);
    for (const [x, y] of [[-1, -1], [1, 1], [-1, 1], [1, -1]]) { const p = applyXY({ ...s, xy: { x, y } }).pad!;
      [p.bright, p.space, p.motion].forEach(v => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }); expect(p.rel).toBeLessThanOrEqual(8); }
  });
});

describe("PAD defaults and AGE", () => {
  it("every preset starts with all four macros at 0", () => {
    PAD_PRESETS.forEach((_, i) => { const p = padFromPreset(i); expect([p.bright, p.motion, p.space, p.age]).toEqual([0, 0, 0, 0]); });
  });
  it("octave and chord octave clamp to their ranges", () => {
    expect(padParams({ oct: 9, coct: -9 })).toMatchObject({ oct: 3, coct: -2 });
  });
});
