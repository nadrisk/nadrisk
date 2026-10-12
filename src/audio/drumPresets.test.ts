import { describe, expect, it } from "vitest";
import { DRUM_PRESETS, copyDrumPreset, drumPresetEdited } from "./drumPresets";
describe("drum starting sounds", () => {
  it("has four complete distinct presets per machine", () => {
    for (const presets of Object.values(DRUM_PRESETS)) {
      expect(presets).toHaveLength(4);
      expect(new Set(presets.map(p => JSON.stringify(p.sound))).size).toBe(4);
      for (const p of presets) { expect(p.sound.env.d).toBeGreaterThan(0); expect(drumPresetEdited(copyDrumPreset(p), p)).toBe(false); }
    }
  });
  it("isolates edited envelopes and recognises changes", () => {
    const p = DRUM_PRESETS.hat[1], a = copyDrumPreset(p), b = copyDrumPreset(p);
    a.env.d = .01;
    expect(b.env.d).toBe(.35); expect(p.sound.env.d).toBe(.35); expect(drumPresetEdited(a, p)).toBe(true);
  });
  it("gives open hats and rides longer tails than closed hats", () => {
    expect(DRUM_PRESETS.hat[1].sound.env.d).toBeGreaterThan(DRUM_PRESETS.hat[0].sound.env.d * 8);
    expect(DRUM_PRESETS.hat[2].sound.env.d).toBeGreaterThan(DRUM_PRESETS.hat[1].sound.env.d);
  });
});