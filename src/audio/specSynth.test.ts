import { describe, expect, it } from "vitest";
import { SPEC_SYNTH_WORKLET, thrDb } from "./specSynthWorklet";

type Proc = { port: { postMessage: () => void }; process: (i: Float32Array[][], o: Float32Array[][], p: Record<string, Float32Array>) => boolean };
const load = (): new () => Proc => {
  let Cls: (new () => Proc) | undefined;
  class Base { port = { postMessage() {} }; }
  new Function("AudioWorkletProcessor", "registerProcessor", "sampleRate", SPEC_SYNTH_WORKLET)(Base, (_: string, c: new () => Proc) => { Cls = c; }, 48000);
  return Cls!;
};
const amp = (x: Float32Array, f: number) => { let re = 0, im = 0; for (let n = 0; n < x.length; n++) { const a = 2 * Math.PI * f * n / 48000; re += x[n] * Math.cos(a); im += x[n] * Math.sin(a); } return 2 * Math.hypot(re, im) / x.length; };
// Tones at 0, -10, -20, -30, -50 dB relative to the loudest (bin-centred frequencies).
const TONES: [number, number][] = [[1500, 0], [3000, -10], [4500, -20], [6000, -30], [7500, -50]];
const sig = (n: number) => TONES.reduce((s, [f, db]) => s + .5 * 10 ** (db / 20) * Math.sin(2 * Math.PI * f * n / 48000), 0);
const render = (gate: number) => {
  const P = load(), p = new P(), L = 128, out = new Float32Array(300 * L);
  for (let b = 0; b * L < out.length; b++) { const inp = new Float32Array(L), o = [new Float32Array(L), new Float32Array(L)];
    for (let i = 0; i < L; i++) inp[i] = sig(b * L + i);
    p.process([[inp]], [o], { gate: new Float32Array([gate]), release: new Float32Array([.05]) }); out.set(o[0], b * L); }
  return out.subarray(9600, 9600 + 24000);
};
const db = (x: number) => 20 * Math.log10(x + 1e-12);

describe("SPEC FFT gate", () => {
  it("matches the calibration points", () => {
    expect(thrDb(.25)).toBe(-40); expect(thrDb(.5)).toBe(-25); expect(thrDb(.75)).toBe(-12); expect(thrDb(1)).toBe(-3);
    expect(thrDb(.375)).toBeCloseTo(-32.5);
  });
  it("GATE 0 reproduces the input", () => {
    const o = render(0); TONES.forEach(([f, d]) => expect(Math.abs(db(amp(o, f)) - db(.5 * 10 ** (d / 20)))).toBeLessThan(.5));
  });
  it("removes weak components in order of level while the strongest stays", () => {
    const lvl = (g: number) => { const o = render(g); return TONES.map(([f]) => db(amp(o, f))); };
    const clean, g25 = lvl(.25), g50 = lvl(.5), g75 = lvl(.75), g100 = lvl(1);
    for (const g of [g25, g50, g75]) expect(Math.abs(g[0] - clean[0])).toBeLessThan(1);
    // At 100% the -3 dB threshold also trims the strongest tone's window skirt, so it loses a few dB but stays.
    expect(g100[0] - clean[0]).toBeGreaterThan(-5);
    expect(g25[4] - clean[4]).toBeLessThan(-20); expect(Math.abs(g25[3] - clean[3])).toBeLessThan(1.5);
    expect(g50[3] - clean[3]).toBeLessThan(-20); expect(Math.abs(g50[2] - clean[2])).toBeLessThan(1.5);
    expect(g75[2] - clean[2]).toBeLessThan(-20); expect(g75[1] - clean[1]).toBeGreaterThan(-5);
    expect(g100[1] - clean[1]).toBeLessThan(-20);
  });
});
