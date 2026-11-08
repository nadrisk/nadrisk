import { describe, expect, it } from "vitest";
import { bitFlip, hackMask, hackRng } from "./hack";
import { FX_DEFS, makeFx, migrateFx } from "./effects";

describe("hack circuit bend", () => {
  it("bit-flipped output stays within [-1, 1]", () => {
    for (let m = 0; m < 4096; m += 37) for (let x = -1.5; x <= 1.5; x += .05) { const y = bitFlip(x, m); expect(y).toBeGreaterThanOrEqual(-1); expect(y).toBeLessThanOrEqual(1); }
  });
  it("no shorted lines leaves the signal (to 12-bit precision)", () => { expect(Math.abs(bitFlip(.3, 0) - .3)).toBeLessThan(1e-3); });
  it("seeded chaos repeats exactly", () => { const a = hackRng(42), b = hackRng(42); const sa = Array.from({ length: 20 }, a), sb = Array.from({ length: 20 }, b); expect(sa).toEqual(sb); expect(hackMask(.7, hackRng(7))).toBe(hackMask(.7, hackRng(7))); });
  it("SHRT at 0 shorts nothing", () => { expect(hackMask(0, hackRng(1))).toBe(0); });
  it("old neuro.box loads as hack with starting values", () => {
    const [u] = migrateFx([{ id: 5, on: true, type: "neurobox", params: { reese: .9 } }]);
    expect(u.type).toBe("hack"); expect(u.id).toBe(5); expect(u.params.short).toBe(FX_DEFS.hack.params.short[0]); expect(u.params.reese).toBeUndefined();
  });
  it("morph loads without the old mutate value", () => {
    const [u] = migrateFx([{ id: 1, on: true, type: "morph", params: { cutoff: 900, mutate: .8 } }]);
    expect(u.params.mutate).toBeUndefined(); expect(u.params.cutoff).toBe(900); expect("mutate" in FX_DEFS.morph.params).toBe(false);
  });
});

import { hackMod, hackPattern, hackStep } from "./hack";
describe("hack GEN patterns", () => {
  it("same seed gives the same pattern, new seed a new one", () => { expect(hackPattern(9)).toEqual(hackPattern(9)); expect(hackPattern(9)).not.toEqual(hackPattern(10)); });
  it("no stuck lanes: 3+ levels and no level held over 3 steps", () => {
    for (let seed = 1; seed < 200; seed++) { const p = hackPattern(seed);
      for (let l = 0; l < 3; l++) { const v = p.slice(l * 16, l * 16 + 16); expect(new Set(v).size).toBeGreaterThanOrEqual(3); let run = 1; for (let i = 1; i < 16; i++) { run = v[i] === v[i - 1] ? run + 1 : 1; expect(run).toBeLessThanOrEqual(3); } }
      const sk = p.slice(48); expect(sk.every(x => x >= 0 && x <= 1)).toBe(true); expect(sk.some(x => x === 0)).toBe(true); }
  });
  it("DEPTH 0 plays exactly the knob", () => { expect(hackMod(.37, 0, 1)).toBe(.37); expect(hackMod(.37, 0, -1)).toBe(.37); });
  it("step follows the grid: 1/16 at 120 BPM is 0.125 s per step", () => { expect(hackStep(0, 120, 2, 16)).toBe(0); expect(hackStep(.125, 120, 2, 16)).toBe(1); expect(hackStep(2, 120, 2, 16)).toBe(0); expect(hackStep(.5, 120, 0, 4)).toBe(1); });
  it("old hack units load with no pattern and DEPTH 0", () => { const [u] = migrateFx([{ id: 2, on: true, type: "hack", params: { short: .5, chaos: .3 } }]); expect(u.params.depth).toBe(0); expect(u.params.seed).toBe(0); expect(u.params.chaos).toBe(.3); });
});

import { hackLimit, hackSlew } from "./hack";
describe("hack step modulator", () => {
  it("knob at 0 is fully off whatever the pattern does", () => { for (const v of [-1, -.5, .5, 1]) expect(hackMod(0, 1, v)).toBe(0); });
  it("SMTH 0 jumps straight to the step, SMTH up glides", () => { expect(hackSlew(0, .003, .125)).toBe(1); const k = hackSlew(1, .003, .125); expect(k).toBeGreaterThan(0); expect(k).toBeLessThan(.1); });
  it("limiter keeps peaks at the ceiling", () => { expect(hackLimit(.5, .89)).toBe(1); expect(2 * hackLimit(2, .89)).toBeCloseTo(.89); });
});

import { HACK_WORKLET } from "./hackWorklet";
function makeHack() {
  let Cls: any; const g: any = { sampleRate: 48000, currentTime: 0 };
  class AWP { port = { postMessage() {}, onmessage: null as any }; }
  const setTime = new Function("AudioWorkletProcessor", "registerProcessor", "sampleRate", "currentTime", HACK_WORKLET + "; return t => { currentTime = t; };")(AWP, (_: string, c: any) => { Cls = c; }, g.sampleRate, 0);
  const n = new Cls(); const p: any = { short: [.9], clock: [.3], starve: [.5], skip: [1], size: [.2], chaos: [0], lock: [0], bpm: [124] };
  const run = (inp: (i: number) => number, blocks: number) => { let peak = 0; for (let b = 0; b < blocks; b++) { const x = Float32Array.from({ length: 128 }, (_, i) => inp(b * 128 + i)), y = [new Float32Array(128), new Float32Array(128)]; n.process([[x, x]], [y], p); for (const v of y[0]) peak = Math.max(peak, Math.abs(v)); } return peak; };
  const render = (input: Float32Array, block: number) => { setTime(block * 128 / g.sampleRate); const output = [new Float32Array(128), new Float32Array(128)]; n.process([[input, input]], [output], p); return output[0]; };
  return { n, p, run, render };
}
describe("hack click regressions", () => {
  it("new effects start with all four destructive stages at zero", () => {
    const fx = makeFx("hack");
    for (const key of ["short", "clock", "starve", "skip"]) expect(fx.params[key]).toBe(0);
  });
  it("GEN alone is sample-exact transparent with clean knobs", () => {
    const { n, p, render } = makeHack();
    Object.assign(p, { short: [0], clock: [0], starve: [0], skip: [0] });
    n.port.onmessage({ data: { seed: 42, depth: 1, run: true } });
    let error = 0;
    for (let b = 0; b < 900; b++) {
      const x = Float32Array.from({ length: 128 }, (_, i) => .3 * Math.sin((b * 128 + i) * .02));
      const y = render(x, b); for (let i = 0; i < 128; i++) error = Math.max(error, Math.abs(y[i] - x[i]));
    }
    expect(error).toBe(0);
  });
  it("GEN steps never strand the stutter cursor past its captured segment", () => {
    const { n, p, render } = makeHack(); Object.assign(p, { short: [0], clock: [0], starve: [0], skip: [1], size: [.5], lock: [1] });
    n.port.onmessage({ data: { seed: 42, depth: 0, run: true } });
    let stranded = false;
    for (let b = 0; b < 1400; b++) { render(Float32Array.from({ length: 128 }, (_, i) => .3 * Math.sin((b * 128 + i) * .02)), b); stranded ||= n.rep > 0 && n.rpos > n.rl; }
    expect(stranded).toBe(false);
  });
  it("stutter entry, repeats and exit crossfade without waveform jumps", () => {
    const { p, render } = makeHack(); Object.assign(p, { short: [0], clock: [0], starve: [0], skip: [1] });
    let prev = 0, jump = 0;
    for (let b = 0; b < 500; b++) { if (b === 300) p.skip = [0]; const y = render(Float32Array.from({ length: 128 }, (_, i) => .3 * Math.sin((b * 128 + i) * .02)), b); for (const v of y) { jump = Math.max(jump, Math.abs(v - prev)); prev = v; } }
    expect(jump).toBeLessThan(.025);
  });
  it("SHRT mask and amount changes fade rather than switching rails in one sample", () => {
    const { p, render } = makeHack(); Object.assign(p, { short: [.3], clock: [0], starve: [0], skip: [0] });
    let prev = 0, jump = 0;
    for (let b = 0; b < 120; b++) { if (b === 60) p.short = [.95]; const y = render(new Float32Array(128).fill(.2), b); for (const v of y) { if (b >= 59) jump = Math.max(jump, Math.abs(v - prev)); prev = v; } }
    expect(jump).toBeLessThan(.025);
  });
});
describe("hack silence", () => {
  it("silent input gives exactly zero output with SHRT and SKIP up", () => { const { run } = makeHack(); expect(run(() => 0, 400)).toBe(0); });
  it("no stutter replay after the input stops", () => { const { run } = makeHack(); run(i => Math.sin(i * .05) * .5, 400); run(() => 0, 200); expect(run(() => 0, 400)).toBe(0); });
  it("transport stop clears the stutter memory", () => { const { n, run } = makeHack(); run(i => Math.sin(i * .05) * .5, 200); n.port.onmessage({ data: { run: false } }); expect(n.rep).toBe(0); expect(n.buf[0].every((v: number) => v === 0)).toBe(true); expect(run(() => 0, 200)).toBe(0); });
});
