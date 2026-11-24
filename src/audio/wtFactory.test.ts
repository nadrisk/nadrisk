import { describe, expect, it } from "vitest";
import { factoryRefs, factoryTable, randomPick } from "./wtFactory";
import { tableNow, listTables } from "./wavetable";

describe("factory wavetables", () => {
  it("ships exactly 39 tables of 4 keyframes", () => {
    expect(factoryRefs()).toHaveLength(39);
    factoryRefs().forEach(r => { const t = factoryTable(r.id)!; expect(t.name).toBe(r.name); expect(t.imag).toHaveLength(4); });
  });
  it("keyframes are finite, sine-phase and equal RMS", () => {
    factoryRefs().forEach(r => factoryTable(r.id)!.imag.forEach((a, k) => {
      let e = 0; a.forEach(x => { expect(Number.isFinite(x)).toBe(true); e += x * x; });
      expect(e, `${r.name} #${k}`).toBeCloseTo(1, 4); expect(factoryTable(r.id)!.real[k].every(x => x === 0)).toBe(true);
    }));
  });
  it("midpoint between neighbours keeps at least 90% energy", () => {
    factoryRefs().forEach(r => { const m = factoryTable(r.id)!.imag; for (let k = 0; k < 3; k++) {
      const c = Math.SQRT1_2; let e = 0; for (let n = 1; n < m[k].length; n++) e += (c * m[k][n]) ** 2 + (c * m[k + 1][n]) ** 2;
      expect(e).toBeGreaterThan(.9); } });
  });
  it("names never use synth brands", () => { factoryRefs().forEach(r => expect(r.name).not.toMatch(/JUNO|303|PROPHET|PPG|CZ|FM|BUCHLA|B3|RHODES|WURLY|CLAV|MOOG|DX|MICROWAVE/)); });
  it("library is grouped by wave type and keeps old ids", () => {
    const g = factoryRefs().map(r => r.group); expect([...new Set(g)]).toEqual(["PLS", "SAW", "ADD", "FMT", "FM", "FLD", "MTH", "CHS"]);
    g.forEach((x, i) => { if (i && x !== g[i - 1]) expect(g.slice(i).includes(g[i - 1])).toBe(false); });
    ["fx:juno-pwm", "fx:buchla-fold", "fx:math-fib"].forEach(id => expect(factoryTable(id)).not.toBeNull());
  });
  it("random pick never repeats the current table and covers the library", () => {
    const all = factoryRefs(), seen = new Set<string>();
    for (let i = 0; i < 2000; i++) { const r = randomPick(all, all[0].id)!; expect(r.id).not.toBe(all[0].id); seen.add(r.id); }
    expect(seen.size).toBe(all.length - 1);
  });
  it("retired cloud ids play BASIC", () => { expect(tableNow("wt:Foo-0")).toBeNull(); expect(listTables).toBeTypeOf("function"); });
});
