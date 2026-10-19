import { describe, it, expect } from "vitest";
import { ADVANCED_WORKLETS } from "./advanced";

function makeReverb() {
  const reg: Record<string, any> = {};
  const fn = new Function("AudioWorkletProcessor", "registerProcessor", "sampleRate", "currentFrame", ADVANCED_WORKLETS);
  fn(class {}, (n: string, c: any) => (reg[n] = c), 48000, 0);
  return new reg["nad-reverb"]();
}

const run = (size: number) => {
  const r = makeReverb(), p = { size: [size], density: [0.6], damp: [6000] };
  let early = 0, late = 0, peak = 0;
  for (let b = 0; b < 1500; b++) {
    const x = [new Float32Array(128), new Float32Array(128)];
    if (b === 0) { x[0][0] = 1; x[1][0] = 1; }
    const y = [new Float32Array(128), new Float32Array(128)];
    r.process([x], [y], p);
    for (let n = 0; n < 128; n++) { const v = Math.abs(y[0][n]) + Math.abs(y[1][n]); peak = Math.max(peak, v); if (b < 300) early += v; else if (b > 1300) late += v; }
  }
  return { early, late, peak };
};

describe("nad-reverb", () => {
  it("produces an audible decaying tail", () => {
    const { early, late } = run(2.5);
    expect(early).toBeGreaterThan(1);
    expect(late).toBeLessThan(early);
  });
  it("stays bounded at max size", () => {
    expect(run(8).peak).toBeLessThan(4);
  });
});
