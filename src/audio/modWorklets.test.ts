import { describe, expect, it } from "vitest";
import { MOD_WORKLETS } from "./modWorklets";

type Proc = { process: (i: Float32Array[][], o: Float32Array[][], p: Record<string, Float32Array>) => boolean };
const load = () => { const m: Record<string, new () => Proc> = {}; class Base {}
  new Function("AudioWorkletProcessor", "registerProcessor", "sampleRate", MOD_WORKLETS)(Base, (n: string, c: new () => Proc) => { m[n] = c; }, 48000); return m; };
const run = (name: string, params: Record<string, number>, sig: (n: number) => number, blocks = 750) => {
  const P = load()[name], p = new P(), L = 128, l = new Float32Array(blocks * L), r = new Float32Array(blocks * L);
  const pr = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, new Float32Array([v])]));
  for (let b = 0; b < blocks; b++) { const inp = new Float32Array(L), o = [new Float32Array(L), new Float32Array(L)];
    for (let i = 0; i < L; i++) inp[i] = sig(b * L + i); p.process([[inp, inp]], [o], pr); l.set(o[0], b * L); r.set(o[1], b * L); }
  return { l, r };
};
const peak = (x: Float32Array) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const diff = (a: Float32Array, b: Float32Array) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;
const saw = (n: number) => .5 * (((n * 220 / 48000) % 1) * 2 - 1);

describe("Juno chorus", () => {
  for (const mode of [0, 1, 2]) it(`mode ${mode} is stereo and bounded`, () => {
    const { l, r } = run("nad-juno", { mode, depth: .5, manual: 3.5, env: 0, noise: .2, width: .8 }, saw);
    expect(peak(l)).toBeLessThan(1.2); expect(diff(l, r)).toBeGreaterThan(.005);
  });
  it("width 0 is mono", () => { const { l, r } = run("nad-juno", { mode: 0, depth: .5, manual: 3.5, env: 0, noise: 0, width: 0 }, saw); expect(diff(l, r)).toBeLessThan(1e-6); });
});
describe("ADA flanger", () => {
  it("max ENH either sign never runs away", () => {
    for (const feedback of [.95, -.95]) { const { l } = run("nad-ada", { rate: .5, depth: 1, manual: 10, feedback, env: 1, width: 1 }, n => (n % 9600 < 64 ? .9 : 0) + saw(n)); expect(peak(l)).toBeLessThan(2.5); expect(Number.isFinite(peak(l))).toBe(true); }
  });
  it("is stereo with width and mono without", () => {
    const w = run("nad-ada", { rate: .5, depth: .6, manual: 2, feedback: .6, env: 0, width: 1 }, saw), m = run("nad-ada", { rate: .5, depth: .6, manual: 2, feedback: .6, env: 0, width: 0 }, saw);
    expect(diff(w.l, w.r)).toBeGreaterThan(.005); expect(diff(m.l, m.r)).toBeLessThan(1e-6);
  });
});
