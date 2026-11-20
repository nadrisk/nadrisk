import { describe, expect, it } from "vitest";
import { DigiCore, digiTimes } from "./digiDelay";
import { SYNC_DIVS, FX_DEFS, fxMixLaw } from "./effects";

const P = { tl: .01, tr: .01, ping: 0, fb: .35, hp: 20, damp: 20000, duck: 0 };
const run = (core: DigiCore, l: Float32Array, p: Record<string, number>, r = l) => { const a = new Float32Array(l.length), b = new Float32Array(l.length); core.process(l, r, a, b, p); return [a, b]; };

describe("digi.delay", () => {
  it("holds dry at unity through 50% MIX while wet reaches unity", () => {
    expect(fxMixLaw("digi", 0)).toEqual([1, 0]);
    expect(fxMixLaw("digi", .3)[0]).toBe(1);
    expect(fxMixLaw("digi", .3)[1]).toBeCloseTo(.809016994);
    expect(fxMixLaw("digi", .5)).toEqual([1, 1]);
    expect(fxMixLaw("digi", .75)[0]).toBeCloseTo(Math.SQRT1_2);
    expect(fxMixLaw("digi", .75)[1]).toBe(1);
    expect(fxMixLaw("digi", 1)).toEqual([0, 1]);
  });
  it("Hermite passes through its sample points", () => {
    expect(DigiCore.herm(.1, .5, -.3, .9, 0)).toBeCloseTo(.5); expect(DigiCore.herm(.1, .5, -.3, .9, 1)).toBeCloseTo(-.3);
  });
  it("sync times follow the tempo: 1/8 at 120 BPM is 0.25 s, DOT offset 0.375 s", () => {
    const i = SYNC_DIVS.findIndex(d => d[0] === "1/8");
    expect(digiTimes({ sync: i, offs: 1 }, 120, SYNC_DIVS)).toEqual([.25, .375]);
  });
  it("defaults start at 1/8, DUAL, no offset, FDBK 35%, MIX 30%", () => {
    const d = FX_DEFS.digi.params; expect(SYNC_DIVS[d.sync[0]][0]).toBe("1/8"); expect(d.mode[0]).toBe(0); expect(d.offs[0]).toBe(0); expect(d.feedback[0]).toBe(.35); expect(d.duck[0]).toBe(0); expect(d.mix[0]).toBe(.3);
  });
  it("an impulse comes back after the delay time", () => {
    const c = new DigiCore(1000), x = new Float32Array(30); x[0] = 1; const [a] = run(c, x, P);
    const peak = a.reduce((m, v, k) => Math.abs(v) > Math.abs(a[m]) ? k : m, 0); expect(peak).toBe(10);
  });
  it("feedback at maximum stays bounded", () => {
    const c = new DigiCore(1000); let mx = 0;
    for (let k = 0; k < 200; k++) { const x = new Float32Array(128).fill(k < 5 ? 1 : 0); const [a, b] = run(c, x, { ...P, fb: 1 }); a.forEach(v => { mx = Math.max(mx, Math.abs(v)); }); b.forEach(v => { mx = Math.max(mx, Math.abs(v)); }); }
    expect(mx).toBeLessThanOrEqual(1);
  });
  it("DUCK pushes repeats down only while dry input plays", () => {
    const c = new DigiCore(1000), loud = new Float32Array(200).fill(.5);
    run(c, loud, { ...P, duck: 1 }); expect(c.g).toBeLessThan(.2);
    for (let k = 0; k < 10; k++) run(c, new Float32Array(200), { ...P, duck: 1, fb: .9 });
    expect(c.g).toBeGreaterThan(.95);
  });
});
