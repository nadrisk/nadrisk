import { describe, expect, it } from "vitest";
import { cosineColor, DEFAULT_VISUAL, visualControl } from "./colorSweep";
import { vjListen, vjSend, vjVisualState } from "./bus";

const channels = (v: number) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255];
describe("adaptive cosine sweep", () => {
  it("uses the supplied time + uv.xyx + (0,2,4) formula", () => {
    const u = .25, v = .75, time = 1.2;
    expect(channels(cosineColor(u, v, time))).toEqual([u, v + 2, u + 4].map(p => Math.round(255 * (.5 + .5 * Math.cos(time + p)))));
    expect(cosineColor(u, v, time)).not.toBe(cosineColor(u, v, time + 1));
  });
  it("adapts brightness and depth phase instead of flattening the visual", () => {
    const full = channels(cosineColor(.2, .3, 2)), shadow = channels(cosineColor(.2, .3, 2, .2));
    shadow.forEach((c, i) => expect(c).toBeCloseTo(full[i] * .2, 0));
    expect(channels(cosineColor(.2, .3, 2, 0))).toEqual([0, 0, 0]);
    expect(cosineColor(.2, .3, 2, 1, .5)).not.toBe(cosineColor(.2, .3, 2));
  });
  it("starts monochrome and keeps colour enabled when switching every backdrop", () => {
    expect(DEFAULT_VISUAL.color).toBe(false);
    let s = { ...DEFAULT_VISUAL, color: true };
    for (const model of [1, 2, 3, 4, 5, 0]) { s = visualControl(s, 1, 0); expect(s).toEqual({ model, size: 1, color: true, code: false }); }
  });
  it("returns absolute colour, model and size to a newly opened TV listener", () => {
    vjSend({ t: "visual", state: { model: 2, size: 1.3, color: true, code: true } });
    const received: unknown[] = [], off = vjListen(m => { if (m.t === "visual") received.push(m.state); });
    vjSend({ t: "hello" }); off();
    expect(received).toContainEqual({ model: 2, size: 1.3, color: true, code: true });
    vjSend({ t: "color", enabled: false });
    expect(vjVisualState().color).toBe(false);
  });
});