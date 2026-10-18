import { describe, expect, it } from "vitest";
import { PEAK_LIMITER_WORKLET } from "./peakLimiter";

type Processor = { process: (i: Float32Array[][], o: Float32Array[][], p: Record<string, Float32Array>) => boolean };
function render(ceiling: number, signal: (n: number) => number) {
  let Factory: (new () => Processor) | undefined;
  new Function("AudioWorkletProcessor", "registerProcessor", "sampleRate", PEAK_LIMITER_WORKLET)(class {}, (_: string, f: new () => Processor) => { Factory = f; }, 48000);
  if (!Factory) throw new Error("Missing peak limiter");
  const processor = new Factory(), result: number[] = [];
  for (let b = 0; b < 80; b++) {
    const l = Float32Array.from({ length: 128 }, (_, k) => signal(b * 128 + k)), r = l.map(v => v * .25), out = [new Float32Array(128), new Float32Array(128)];
    processor.process([[l, r]], [out], { ceiling: new Float32Array([ceiling]) });
    for (let k = 0; k < 128; k++) { expect(out[1][k]).toBeCloseTo(out[0][k] * .25, 6); result.push(out[0][k]); }
  }
  return result;
}
describe("final master peak ceiling", () => {
  it("catches sudden performance spikes below the default -1 dB ceiling", () => {
    const samples = render(-1, n => n % 400 === 0 ? 12 : 2 * Math.sin(n * .1));
    expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(10 ** (-1 / 20) + 1e-6);
  });
  it("honors a lower ceiling", () => {
    expect(Math.max(...render(-6, () => 4).map(Math.abs))).toBeLessThanOrEqual(10 ** (-6 / 20) + 1e-6);
  });
  it("preserves quiet samples apart from the 3ms lookahead", () => {
    const samples = render(-1, n => .1 * Math.sin(n * .1));
    expect(samples[500]).toBeCloseTo(.1 * Math.sin((500 - 144) * .1), 6);
  });
});