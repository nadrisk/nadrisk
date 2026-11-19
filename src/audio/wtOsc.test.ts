import { describe, expect, it } from "vitest";
import { WT_OSC_WORKLET, buildMips } from "./wtOsc";
import { buildTable } from "./wavetable";

type P = { port: { onmessage: (e: { data: unknown }) => void }; process: (i: unknown, o: Float32Array[][], p: Record<string, Float32Array>) => boolean };
const make = () => { let C: new () => P = null!; (globalThis as { __nadWt?: unknown }).__nadWt = undefined;
  new Function("AudioWorkletProcessor", "registerProcessor", "sampleRate", WT_OSC_WORKLET)(class { port = {} as P["port"]; }, (_: string, c: new () => P) => { C = c; }, 48000); return new C(); };

describe("nad-wt oscillator", () => {
  it("sweeping across very different frames stays continuous", () => {
    // 64 frames alternating sine / square: worst case for frame-swap clicks
    const frames = Array.from({ length: 64 }, (_, k) => Float32Array.from({ length: 2048 }, (_, i) => k % 2 ? (i < 1024 ? 1 : -1) : Math.sin(i / 2048 * Math.PI * 2)));
    const t = buildTable("t", "t", frames), p = make();
    p.port.onmessage({ data: { table: buildMips(t) } }); p.port.onmessage({ data: { use: "t" } });
    const run = (pos: (b: number) => number) => { let prev = 0, maxJump = 0;
    for (let b = 0; b < 400; b++) { const o = [[new Float32Array(128)]];
      p.process([], o, { frequency: new Float32Array([110]), detune: new Float32Array([0]), pos: new Float32Array([pos(b)]) });
      for (const v of o[0][0]) { if (b === 0) { prev = v; continue; } maxJump = Math.max(maxJump, Math.abs(v - prev)); prev = v; } } return maxJump; };
    const still = run(() => 1 / 63), sweep = run(b => Math.abs(((b / 100) % 2) - 1));
    // a sweep never steps harder than the sharpest frame's own edges (a phase reset or hard swap would)
    expect(sweep).toBeLessThan(still * 1.15);
  });
});

import { matchNeighbourPhases } from "./wtOsc";
describe("neighbour phase matching", () => {
  it("opposite-phase frames keep full energy halfway through a sweep", () => {
    const H = 8, re = [new Float32Array(H), new Float32Array(H)], im = [new Float32Array(H), new Float32Array(H)];
    im[0][3] = 1; im[1][3] = -1; re[0][1] = 1; re[1][1] = 1;
    const { real, imag } = matchNeighbourPhases(re, im);
    expect(Math.hypot((real[0][3] + real[1][3]) / 2, (imag[0][3] + imag[1][3]) / 2)).toBeCloseTo(1); // naive mix gives 0
  });
  it("leaves frames that already agree untouched", () => {
    const re = [Float32Array.from([0, 1, .5]), Float32Array.from([0, .8, .2])], im = [Float32Array.from([0, .3, 0]), Float32Array.from([0, .5, .1])];
    const { real, imag } = matchNeighbourPhases(re, im);
    expect(Array.from(real[1])).toEqual(Array.from(re[1])); expect(Array.from(imag[1])).toEqual(Array.from(im[1]));
  });
});
describe("sweep loudness", () => {
  it("halfway between unrelated frames stays near the frames' own level", () => {
    const frames = [Float32Array.from({ length: 2048 }, (_, i) => Math.sin(i / 2048 * Math.PI * 2)), Float32Array.from({ length: 2048 }, (_, i) => Math.sin(i / 2048 * Math.PI * 6))];
    const p = make(), t = buildTable("u", "u", frames); p.port.onmessage({ data: { table: buildMips(t) } }); p.port.onmessage({ data: { use: "u" } });
    const rms = (pos: number) => { let e = 0, c = 0; for (let b = 0; b < 800; b++) { const o = [[new Float32Array(128)]]; p.process([], o, { frequency: new Float32Array([110]), detune: new Float32Array([0]), pos: new Float32Array([pos]) }); if (b > 400) for (const v of o[0][0]) { e += v * v; c++; } } return Math.sqrt(e / c); };
    const edge = rms(0), mid = rms(.5);
    expect(mid / edge).toBeGreaterThan(.9); // plain mix would drop to ~0.71
  });
});
