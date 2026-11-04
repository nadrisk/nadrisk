import { describe, it, expect } from "vitest";
import { applyXY } from "./xyMaps";
import type { Slot } from "@/hooks/useGroovebox";

const pad = (sampler: object, x: number, y: number) => { return { engine: "sampler", eq: { low: 0, lowFreq: 100, mid: 0, midFreq: 1000, q: .7, high: 0, highFreq: 9000 }, sampler: { start: 0, loop: false, pitch: 0, env: { a: .002, d: .3, s: 1, r: .1 }, sampleName: "X", fine: 3, ...sampler }, xy: { x, y } } as unknown as Slot; };
const corners = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

describe("sampler XY", () => {
  for (const mode of [{}, { stretch: true, stretchAmt: 1.5 }, { grain: true }]) it(`never changes pitch or fine tune (${JSON.stringify(mode)})`, () => {
    for (const [x, y] of corners) { const a = applyXY(pad(mode, x, y)); expect(a.sampler.fine).toBe(3); expect(a.sampler.pitch).toBe(0); }
  });
  it("END stays after START", () => {
    for (const [x, y] of corners) { const a = applyXY(pad({ start: .4 }, x, y)); expect(a.sampler.end!).toBeGreaterThan(.4); expect(a.sampler.end!).toBeLessThanOrEqual(1); }
  });
  it("granular position stays inside the sample", () => {
    for (const [x, y] of corners) { const a = applyXY(pad({ grain: true, start: .9 }, x, y)); expect(a.sampler.start).toBeGreaterThanOrEqual(0); expect(a.sampler.start).toBeLessThan(1); }
  });
});
