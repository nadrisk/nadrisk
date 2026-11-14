import { describe, expect, it } from "vitest";
import { NOIZ_WORKLET } from "./noizWorklet";

type Proc = { process: (i: Float32Array[][], o: Float32Array[][], p: Record<string, Float32Array>) => boolean };
const make = () => { let C: new () => Proc = null!; new Function("AudioWorkletProcessor", "registerProcessor", "sampleRate", NOIZ_WORKLET)(class { port = { postMessage() {} }; }, (_: string, c: new () => Proc) => { C = c; }, 48000); return new C(); };
const run = (sig: (n: number) => number, prm: Record<string, number>) => {
  const p = make(), x = Float32Array.from({ length: 4096 }, (_, n) => sig(n)), o = [new Float32Array(4096), new Float32Array(4096)];
  p.process([[x, x]], [o], Object.fromEntries(Object.entries({ amt: .5, nmode: 0, tone: 6000, pre: 16000, width: 0, ...prm }).map(([k, v]) => [k, new Float32Array([v])])));
  return { x, y: o[0] };
};

describe("noiz~", () => {
  it("silence in gives silence out", () => { const { y } = run(() => 0, {}); expect(Math.max(...y.map(Math.abs))).toBe(0); });
  it("AMT 0 returns the dry signal", () => { const { x, y } = run(n => Math.sin(n / 20), { amt: 0 }); expect([...y]).toEqual([...x]); });
  it("CRSP adds noise only on positive excursions", () => {
    const { x, y } = run(n => (Math.floor(n / 512) % 2 ? -.5 : .5), {});
    let pos = 0, neg = 0; for (let n = 0; n < 4096; n++) { const d = Math.abs(y[n] - x[n]); if (x[n] > 0) pos += d; else neg += d; }
    expect(pos).toBeGreaterThan(1); expect(neg).toBeLessThan(pos * .02);
  });
});
