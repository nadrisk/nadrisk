import { describe, expect, it } from "vitest";
import { SPEC_SYNTH_WORKLET } from "./specSynthWorklet";

type Proc = { process: (i: Float32Array[][], o: Float32Array[][], p: Record<string, Float32Array>) => boolean };
const load = (): new () => Proc => {
  let Cls: (new () => Proc) | undefined;
  new Function("AudioWorkletProcessor", "registerProcessor", "sampleRate", SPEC_SYNTH_WORKLET)(class {}, (_: string, c: new () => Proc) => { Cls = c; }, 48000);
  return Cls!;
};
const toneEnergy = (x: Float32Array, f: number) => { let re = 0, im = 0; for (let n = 0; n < x.length; n++) { const a = 2 * Math.PI * f * n / 48000; re += x[n] * Math.cos(a); im += x[n] * Math.sin(a); } return Math.hypot(re, im) / x.length; };
const render = (gate: number) => {
  const P = load(), p = new P(), out = new Float32Array(188 * 128); const L = 128;
  for (let b = 0; b * L < out.length; b++) { const inp = new Float32Array(L), o = [new Float32Array(L), new Float32Array(L)];
    for (let i = 0; i < L; i++) { const n = b * L + i; inp[i] = Math.sin(2 * Math.PI * 1000 * n / 48000) * .5 + Math.sin(2 * Math.PI * 3000 * n / 48000) * .0005; }
    p.process([[inp]], [o], { gate: new Float32Array([gate]), release: new Float32Array([.05]) }); out.set(o[0], b * L); }
  return out.subarray(4800);
};

describe("SPEC FFT gate", () => {
  it("passes everything at GATE 0 and removes a quiet partial at high GATE while keeping the loud one", () => {
    const clean = render(0), gated = render(.8);
    expect(toneEnergy(clean, 3000)).toBeGreaterThan(toneEnergy(clean, 1000) * .0005);
    expect(toneEnergy(gated, 3000)).toBeLessThan(toneEnergy(clean, 3000) * .5);
    expect(toneEnergy(gated, 1000)).toBeGreaterThan(toneEnergy(clean, 1000) * .7);
  });
});
