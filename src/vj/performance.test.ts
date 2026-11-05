import { describe, expect, it } from "vitest";
import { AvPerformanceFrames, avPerformance, MAX_HISTORY_BYTES, NEUTRAL_PERFORMANCE as neutral } from "./performance";
const BG = 0xff000000, FG = 0xffffffff;
const run = (fx: AvPerformanceFrames, p = neutral, t = 0, pixels = new Uint32Array(64).fill(FG)) => { fx.apply(pixels, 8, 8, p, t, 120, BG, FG, true); return pixels; };
describe("controlled AV performance", () => {
  it("does not change or capture frames when not activated", () => {
    const fx = new AvPerformanceFrames(), b = new Uint32Array(64).fill(0xff654321), before = b.slice();
    run(fx, neutral, 0, b); expect(b).toEqual(before); expect(fx.bytes).toBe(0);
  });
  it("caps feedback below unity and rejects non-finite controls", () => {
    expect(avPerformance({ echoFeedback: 1.1 }).echoFeedback).toBe(.8);
    expect(avPerformance({ echoSend: NaN, tension: Infinity }).echoSend).toBe(0);
    expect(avPerformance({ tension: Infinity }).tension).toBe(0);
  });
  it("keeps maximum-send echo bounded and decays with no fresh image", () => {
    const fx = new AvPerformanceFrames(), p = avPerformance({ echoSend: 1, echoFeedback: 1.1, echoDiv: 0 });
    for (let i = 0; i < 40; i++) run(fx, p, i * .06);
    let b = new Uint32Array(64);
    for (let i = 40; i < 240; i++) b = run(fx, p, i * .06, new Uint32Array(64).fill(BG));
    expect(Math.max(...b.map(v => v & 255))).toBeLessThan(2);
    expect(fx.frames).toBeLessThanOrEqual(32); expect(fx.bytes).toBeLessThanOrEqual(MAX_HISTORY_BYTES);
  });
  it("kills echo immediately at zero send and never resurrects old frames", () => {
    const fx = new AvPerformanceFrames(), p = avPerformance({ echoSend: 1 });
    for (let i = 0; i < 20; i++) run(fx, p, i * .06);
    const blank = new Uint32Array(64).fill(BG);
    expect(run(fx, neutral, 2, blank)).toEqual(blank); expect(fx.frames).toBe(0);
    expect(run(fx, p, 3, new Uint32Array(64).fill(BG))).toEqual(blank);
  });
  it("freezes stutter capture while held and deletes it on release", () => {
    const fx = new AvPerformanceFrames(), p = avPerformance({ mode: 2 });
    run(fx, p); const bytes = fx.bytes;
    expect(run(fx, p, .3, new Uint32Array(64).fill(BG))[0]).toBe(FG);
    expect(fx.bytes).toBe(bytes); run(fx, neutral, .4); expect(fx.frames).toBe(0);
  });
  it("clear on stop/stale/hidden/close drops all history", () => {
    const fx = new AvPerformanceFrames(); run(fx, avPerformance({ echoSend: 1 }));
    expect(fx.frames).toBe(1); fx.clear(); expect(fx.frames).toBe(0); expect(fx.bytes).toBe(0);
  });
  it("tape stop decelerates to zero and release restores motion", () => {
    const fx = new AvPerformanceFrames(), p = avPerformance({ mode: 3 });
    expect(fx.speed(p, .2)).toBeGreaterThan(0); expect(fx.speed(p, 1)).toBe(0);
    expect(fx.speed(neutral, .01)).toBe(1); expect(fx.speed(avPerformance({ mode: 1 }), .01)).toBe(-1);
  });
});