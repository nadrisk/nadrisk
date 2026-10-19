import { describe, it, expect } from "vitest";
import { ADVANCED_WORKLETS } from "./advanced";
import { reverbMixLaw } from "./effects";

const SR = 48000;
function makeReverb() {
  const reg: Record<string, any> = {};
  new Function("AudioWorkletProcessor", "registerProcessor", "sampleRate", "currentFrame", ADVANCED_WORKLETS)(class {}, (n: string, c: any) => (reg[n] = c), SR, 0);
  return new reg["nad-reverb"]();
}

function run(size: number, dens: number, seconds: number, src: (i: number) => number) {
  const r = makeReverb(), p = { size: [size], density: [dens], damp: [6000] }, L: number[] = [], R: number[] = [], X: number[] = [];
  for (let b = 0; b < Math.ceil(seconds * SR / 128); b++) {
    const x = [new Float32Array(128), new Float32Array(128)], y = [new Float32Array(128), new Float32Array(128)];
    for (let n = 0; n < 128; n++) x[0][n] = x[1][n] = src(b * 128 + n);
    r.process([x], [y], p);
    for (let n = 0; n < 128; n++) { L.push(y[0][n]); R.push(y[1][n]); X.push(x[0][n]); }
  }
  return { L, R, X };
}
const click = (i: number) => (i === 0 ? 1 : 0);
const windowDb = (L: number[], R: number[], t: number) => { let e = 0; const a = Math.round(t * SR); for (let i = a; i < a + 4800; i++) e += L[i] ** 2 + R[i] ** 2; return 10 * Math.log10(e / 4800 + 1e-20); };

describe("nad-reverb", () => {
  it("decays about 60 dB over the SIZE time, without cutting off early", () => {
    const { L, R } = run(3, 0.6, 3.3, click);
    const ref = Math.max(...[0.05, 0.1, 0.15, 0.2, 0.3].map(t => windowDb(L, R, t)));
    expect(ref - windowDb(L, R, 1.5)).toBeGreaterThan(15);
    expect(ref - windowDb(L, R, 1.5)).toBeLessThan(45);
    expect(ref - windowDb(L, R, 3)).toBeGreaterThan(45);
  });
  it("stays bounded at max size", () => {
    const { L, R } = run(20, 1, 3, click);
    expect(L.every(Number.isFinite)).toBe(true);
    expect(windowDb(L, R, 2.8)).toBeLessThan(windowDb(L, R, 0.3));
  });
  it("left and right are decorrelated", () => {
    const { L, R } = run(3, 0.6, 1, click);
    let lr = 0, ll = 0, rr = 0;
    for (let i = 4800; i < L.length; i++) { lr += L[i] * R[i]; ll += L[i] ** 2; rr += R[i] ** 2; }
    expect(Math.abs(lr / Math.sqrt(ll * rr))).toBeLessThan(0.5);
  });
  it("wet loudness stays near dry across SIZE and DENS", () => {
    for (const [size, dens] of [[0.5, 0.1], [2.5, 0.6], [20, 0.9]]) {
      let seed = 7; const noise = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
      const { L, R, X } = run(size, dens, 3, noise);
      let ein = 0, eout = 0; for (let i = SR * 1.5; i < L.length; i++) { ein += X[i] ** 2; eout += (L[i] ** 2 + R[i] ** 2) / 2; }
      expect(Math.abs(10 * Math.log10(eout / ein))).toBeLessThan(4);
    }
  });
  it("tail has no strong ringing peak", () => {
    const { L } = run(4, 0.6, 1.2, click);
    const seg = L.slice(SR * 0.5, SR * 0.5 + 8192), mags: number[] = [];
    for (let k = 20; k < 1400; k += 2) { let re = 0, im = 0; for (let i = 0; i < seg.length; i++) { const a = 2 * Math.PI * k * i / seg.length; re += seg[i] * Math.cos(a); im += seg[i] * Math.sin(a); } mags.push(Math.hypot(re, im)); }
    const mean = mags.reduce((a, b) => a + b, 0) / mags.length;
    expect(Math.max(...mags) / mean).toBeLessThan(6);
  });
});

describe("reverb onset", () => {
  it("starts with the note instead of swelling in late", () => {
    const { L, R } = run(8, 0.6, 0.4, click);
    expect(windowDb(L, R, 0) - windowDb(L, R, 0.15)).toBeGreaterThan(-3);
  });
});

describe("reverb MIX law", () => {
  it("is pure dry at 0% and pure wet at 100%", () => {
    expect(reverbMixLaw(0)).toEqual([1, 0]);
    const [d, w] = reverbMixLaw(1); expect(d).toBeCloseTo(0, 6); expect(w).toBe(1);
  });
  it("keeps dry full up to 50% and wet full from 50%", () => {
    expect(reverbMixLaw(0.25)[0]).toBe(1);
    expect(reverbMixLaw(0.5)).toEqual([1, 1]);
    expect(reverbMixLaw(0.75)[1]).toBe(1);
    expect(reverbMixLaw(0.25)[1]).toBeGreaterThan(0.6);
  });
});

describe("tape delay MIX", () => {
  it("uses the same dry-hold law as reverb", async () => {
    const src = (await import("node:fs")).readFileSync(new URL("./effects.ts", import.meta.url), "utf8");
    expect(src).toMatch(/type === "reverb" \|\| type === "delay" \? reverbMixLaw\(mix\)/);
  });
});
