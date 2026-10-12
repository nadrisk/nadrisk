import { describe, expect, it } from "vitest";
import { ACID_WORKLET, acidParams, defaultAcid } from "./acid";

type Processor = { process: (input: Float32Array[][], output: Float32Array[][], params: Record<string, Float32Array>) => boolean };
function filter() {
  let ctor: (new () => Processor) | undefined;
  new Function("AudioWorkletProcessor", "registerProcessor", "sampleRate", ACID_WORKLET)(class {}, (_: string, c: new () => Processor) => { ctor = c; }, 48000);
  if (!ctor) throw new Error("Missing filter registration");
  return new ctor();
}
describe("acid", () => {
  it("provides finite bounded defaults and clamps unsafe settings", () => {
    expect(defaultAcid().cutoff).toBe(320);
    expect(acidParams({ cutoff: Infinity, res: 9, decay: -1 })).toMatchObject({ cutoff: 40, res: 1, decay: .06 });
  });
  it("keeps nonlinear feedback finite at cutoff/resonance/drive extremes and drains in silence", () => {
    for (const cutoff of [40, 320, 8000, 18000]) for (const res of [0, .72, 1]) for (const drive of [0, 1]) {
      const f = filter(), x = new Float32Array(128), y = new Float32Array(128);
      const p = { cutoff: new Float32Array([cutoff]), res: new Float32Array([res]), drive: new Float32Array([drive]) };
      let energy = 0;
      for (let block = 0; block < 1500; block++) {
        for (let n = 0; n < 128; n++) x[n] = block < 100 ? ((block * 128 + n) % 480) / 240 - 1 : 0;
        f.process([[x]], [[y]], p);
        expect(y.every(v => Number.isFinite(v) && Math.abs(v) <= 1)).toBe(true);
        if (block === 99) energy = y.reduce((a, b) => a + b * b, 0);
      }
      expect(energy).toBeGreaterThan(0);
      expect(y.reduce((a, b) => a + b * b, 0)).toBeLessThan(.001);
    }
  });
});