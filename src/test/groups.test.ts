import { describe, it, expect } from "vitest";
import { padFx, totalFxLoad, defaultGroups, hydrateGroups } from "@/audio/groups";
import { FX_COST } from "@/audio/effects";
const fx = (type: string) => ({ id: 1, type, on: true, params: {} }) as never;
describe("sound groups", () => {
  it("grouped pads bypass their own FX", () => { expect(padFx({ group: 2, fx: [fx("reverb")] })).toEqual([]); expect(padFx({ group: 0, fx: [fx("reverb")] })).toHaveLength(1); });
  it("load counts group racks and skips grouped pad racks", () => {
    const g = defaultGroups(); g[0].fx = [fx("delay")];
    expect(totalFxLoad([{ group: 1, fx: [fx("reverb")] }, { fx: [fx("reverb")] }], g)).toBe(FX_COST.delay + FX_COST.reverb);
  });
  it("old sets load four empty groups", () => { const g = hydrateGroups(undefined); expect(g).toHaveLength(4); expect(g[3]).toEqual({ fx: [], level: 100, pan: 0 }); });
});
