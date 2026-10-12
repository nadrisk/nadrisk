import { describe, it, expect } from "vitest";
import { defaultReese, reeseParams, reesePulseAt, reesePulseHz } from "./reese";
describe("reese", () => {
  it("defaults are the planned starting sound", () => { const d = defaultReese(); expect([d.detune, d.cutoff, d.rate, d.sub, d.glide]).toEqual([18, 380, 1, .6, .04]); });
  it("clamps and snaps rate", () => { const r = reeseParams({ detune: 99, rate: .3, cutoff: 5 }); expect([r.detune, r.rate, r.cutoff]).toEqual([50, .25, 40]); });
  it("pulse locks to tempo and starts at zero", () => { expect(reesePulseHz(120, 1)).toBe(2); expect(reesePulseAt({ depth: 2, shape: 0 }, 0)).toBeCloseTo(0); expect(reesePulseAt({ depth: 2, shape: 0 }, .25)).toBeCloseTo(1); });
});
