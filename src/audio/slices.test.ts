import { describe, expect, it } from "vitest";
import { detectSlices } from "./slices";

// Fake buffer: decaying noise bursts (loud "kicks" and quiet "hats").
function fake(hits: [number, number][], sr = 44100, sec = 2) {
  const d = new Float32Array(sr * sec);
  for (const [at, amp] of hits) { const o = Math.round(at * sr); for (let i = 0; i < sr * .08 && o + i < d.length; i++) d[o + i] += (Math.random() * 2 - 1) * amp * Math.exp(-i / (sr * .02)); }
  return { length: d.length, sampleRate: sr, numberOfChannels: 1, getChannelData: () => d } as unknown as AudioBuffer;
}

describe("transient slices", () => {
  const buf = fake([[.25, .9], [.75, .9], [1.25, .9], [.5, .05], [1, .05], [1.5, .05]]);
  it("low sensitivity finds the main hits on their attacks", () => {
    const s = detectSlices(buf, .15).slice(1).map(f => f * 2);
    expect(s.length).toBeGreaterThanOrEqual(3);
    [.25, .75, 1.25].forEach(t => expect(s.some(x => Math.abs(x - t) < .015)).toBe(true));
  });
  it("high sensitivity finds more hits, and 0 is off", () => {
    expect(detectSlices(buf, .95).length).toBeGreaterThan(detectSlices(buf, .15).length);
    expect(detectSlices(buf, 0)).toEqual([]);
  });
});
