import { describe, expect, it } from "vitest";
import { fillPath, shapeAt, xyAt } from "./xyMotion";
import { LFO_ZONES, PAD, REC_BAR, REC_ZONES, XY_ZONES, overlaps, type Box } from "@/components/xyLayout";

describe("xy motion", () => {
  it("stays at the hand position when stopped or without motion", () => {
    expect(xyAt({ x: .3, y: -.2, lfo: { on: true, shape: "orbit", rate: 4, depth: .5, phase: 0 } }, null)).toEqual({ x: .3, y: -.2 });
    expect(xyAt({ x: .3, y: -.2 }, 5)).toEqual({ x: .3, y: -.2 });
  });
  it("orbit LFO at 1/4 moves a quarter cycle per step", () => {
    const p = xyAt({ x: 0, y: 0, lfo: { on: true, shape: "orbit", rate: 2, depth: .5, phase: 0 } }, 1);
    expect(p.x).toBeCloseTo(0); expect(p.y).toBeCloseTo(.5);
  });
  it("hand touch overrides motion", () => {
    expect(xyAt({ x: .1, y: .1, held: true, lfo: { on: true, shape: "sinx", rate: 0, depth: 1, phase: .25 } }, 0)).toEqual({ x: .1, y: .1 });
  });
  it("plays a recorded path, interpolating between steps", () => {
    const rec = { pts: [[0, 0], [1, 1]] as [number, number][], len: 2, play: true };
    expect(xyAt({ x: 0, y: 0, rec }, .5)).toEqual({ x: .5, y: .5 });
    expect(xyAt({ x: 0, y: 0, rec }, 3)).toEqual({ x: 1, y: 1 });
  });
  it("fills gaps in a recording", () => {
    expect(fillPath([[0, 0], undefined, [1, 0], undefined])).toEqual([[0, 0], [.5, 0], [1, 0], [.5, 0]]);
  });
  it("S&H holds a value for a quarter cycle", () => {
    expect(shapeAt("sh", .1, 0)).toEqual(shapeAt("sh", .2, 0));
    expect(shapeAt("sh", .1, 0)).not.toEqual(shapeAt("sh", .3, 0));
  });
});

describe("xy screen layout", () => {
  const tabs: Box[][] = [Object.values(XY_ZONES), [...Object.values(REC_ZONES), REC_BAR], Object.values(LFO_ZONES)];
  it("no controls overlap each other or the pad, all inside 128x64", () => {
    tabs.forEach(z => {
      [...z, PAD].forEach((a, i, all) => {
        expect(a.x >= 0 && a.y >= 10 && a.x + a.w <= 128 && a.y + a.h <= 64).toBe(true);
        all.slice(i + 1).forEach(b => expect(overlaps(a, b)).toBe(false));
      });
    });
  });
});
