import { describe, expect, it } from "vitest";
import { WT_ENV_HOME, wtEnvLevel, wtEnvOffset } from "./wtEnv";
const e = { ...WT_ENV_HOME, wA: .1, wD: .2, wS: .25, wSm: 0 };
describe("wavetable env", () => {
  it("one-shot rises, falls to sustain and holds (no release)", () => {
    expect(wtEnvLevel(e, .1)).toBeCloseTo(1); expect(wtEnvLevel(e, .05)).toBeCloseTo(.5); expect(wtEnvLevel(e, 5)).toBeCloseTo(.25);
  });
  it("loop cycles attack and decay forever", () => {
    const l = { ...e, wLoop: true }; expect(wtEnvLevel(l, .3)).toBeCloseTo(.25); expect(wtEnvLevel(l, .4)).toBeCloseTo(1); expect(wtEnvLevel(l, .6)).toBeCloseTo(.25);
  });
  it("bipolar swings around the knob, unipolar only one way; depth 0 is silent", () => {
    expect(wtEnvOffset({ ...e, wDp: 1, wBi: true }, 0.0001)).toBeCloseTo(-3, 1); expect(wtEnvOffset({ ...e, wDp: -1 }, .1)).toBeCloseTo(-3); expect(wtEnvOffset({ ...e, wDp: 0 }, .1)).toBe(0);
  });
});
