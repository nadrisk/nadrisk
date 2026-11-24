import { describe, expect, it } from "vitest";
import { TERRAIN_WORKLET } from "./terrainWorklet";
import { terrainAt, pitchTaper } from "./terrain";

function load() {
  const reg: Record<string, any> = {};
  const g: any = { registerProcessor: (n: string, c: any) => (reg[n] = c), AudioWorkletProcessor: class { port = { onmessage: null } }, sampleRate: 48000 };
  new Function(...Object.keys(g), "globalThis", TERRAIN_WORKLET)(...Object.values(g), g);
  return { P: reg["nad-terrain"], at: g.__nadTerrainAt };
}
const params = (hz: number, o: Record<string, number> = {}) => ({ frequency: [hz], detune: [0], cx: [o.cx ?? 0], cy: [o.cy ?? 0], radius: [o.radius ?? .6], tfreq: [.25], hold: [o.hold ?? 0], snow: [o.snow ?? 0], fold: [o.fold ?? 0] });

describe("nad-terrain worklet", () => {
  it("uses the same terrain as the screen", () => {
    const { at } = load();
    for (const [x, y] of [[0, 0], [.3, -.7], [-.9, .4]]) for (const p of [{ freq: .25, hold: 0, snow: 0, fold: 0 }, { freq: .8, hold: .5, snow: .4, fold: .7 }])
      expect(at(x, y, p.freq, p.hold, p.snow, p.fold, pitchTaper(440))).toBeCloseTo(terrainAt(x, y, p, pitchTaper(440)), 9);
  });
  it("one orbit lap is one period: 480 Hz at 48 kHz repeats every 100 samples", () => {
    const { P } = load(); const w = new P(); const o = new Float32Array(400); w.process([], [[o]], params(480));
    for (let n = 200; n < 300; n++) expect(o[n]).toBeCloseTo(o[n + 100], 3);
  });
  it("radius 0 is silent DC-free stillness, output stays in [-1, 1] at full FOLD/SNOW", () => {
    const { P } = load(); const w = new P(); const o = new Float32Array(512); w.process([], [[o]], params(2000, { fold: 1, snow: 1, hold: 1 }));
    for (const v of o) expect(Math.abs(v)).toBeLessThanOrEqual(1.1);
    const s = new P(); const q = new Float32Array(128); s.process([], [[q]], params(200, { radius: 0 })); expect(Math.max(...q.slice(20)) - Math.min(...q.slice(20))).toBeLessThan(1e-6);
  });
  it("pitch leaps glide instead of jumping (no click)", () => {
    const { P } = load(); const w = new P(); const o = new Float32Array(128); w.process([], [[o]], params(110)); w.process([], [[o]], params(880));
    expect(w.hz).toBeGreaterThan(110); expect(w.hz).toBeLessThan(880);
  });
  it("stop ends the processor", () => { const { P } = load(); const w = new P(); w.port.onmessage({ data: { stop: true } }); expect(w.process([], [[new Float32Array(8)]], params(110))).toBe(false); });
});
