import { describe, it, expect } from "vitest";
import { ADVANCED_WORKLETS } from "./advanced";

const SR = 48000;
function makeReverb() {
  const reg: Record<string, any> = {};
  new Function("AudioWorkletProcessor", "registerProcessor", "sampleRate", "currentFrame", ADVANCED_WORKLETS)(class {}, (n: string, c: any) => (reg[n] = c), SR, 0);
  return new reg["nad-reverb"]();
}

/** Returns RMS (dB) of each 0.1 s window after a click, plus left/right samples. */
function impulse(size: number, seconds: number) {
  const r = makeReverb(), p = { size: [size], density: [0.6], damp: [6000] };
  const blocks = Math.ceil(seconds * SR / 128), win = SR / 10, rms: number[] = [], L: number[] = [], R: number[] = [];
  let acc = 0, cnt = 0, peak = 0;
  for (let b = 0; b < blocks; b++) {
    const x = [new Float32Array(128), new Float32Array(128)];
    if (b === 0) { x[0][0] = 1; x[1][0] = 1; }
    const y = [new Float32Array(128), new Float32Array(128)];
    r.process([x], [y], p);
    for (let n = 0; n < 128; n++) { L.push(y[0][n]); R.push(y[1][n]); acc += y[0][n] ** 2 + y[1][n] ** 2; peak = Math.max(peak, Math.abs(y[0][n])); if (++cnt === win) { rms.push(10 * Math.log10(acc / win + 1e-20)); acc = 0; cnt = 0; } }
  }
  return { rms, L, R, peak };
}

describe("nad-reverb", () => {
  it("decays about 60 dB over the SIZE time, without cutting off early", () => {
    const { rms } = impulse(3, 4);
    const ref = Math.max(...rms.slice(0, 5));
    const at = (s: number) => ref - rms[Math.round(s * 10)];
    expect(at(1.5)).toBeGreaterThan(15);
    expect(at(1.5)).toBeLessThan(45);   // half-way: still a real tail
    expect(at(3)).toBeGreaterThan(45);
    expect(at(3)).toBeLessThan(80);
  });
  it("stays bounded at max size", () => {
    expect(impulse(20, 3).peak).toBeLessThan(2);
  });
  it("left and right are decorrelated", () => {
    const { L, R } = impulse(3, 1);
    let lr = 0, ll = 0, rr = 0;
    for (let i = 4800; i < L.length; i++) { lr += L[i] * R[i]; ll += L[i] ** 2; rr += R[i] ** 2; }
    expect(Math.abs(lr / Math.sqrt(ll * rr))).toBeLessThan(0.5);
  });
});
