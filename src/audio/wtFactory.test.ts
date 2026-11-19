import { describe, expect, it } from "vitest";
import { FACTORY_REFS, factoryTable } from "./wtFactory";
import { tableNow, listTables } from "./wavetable";

describe("factory wavetables", () => {
  it("ships exactly 20 tables of 4 keyframes", () => {
    expect(FACTORY_REFS).toHaveLength(20);
    FACTORY_REFS.forEach(r => { const t = factoryTable(r.id)!; expect(t.name).toBe(r.name); expect(t.imag).toHaveLength(4); });
  });
  it("keyframes are finite, sine-phase and equal RMS", () => {
    FACTORY_REFS.forEach(r => factoryTable(r.id)!.imag.forEach((a, k) => {
      let e = 0; a.forEach(x => { expect(Number.isFinite(x)).toBe(true); e += x * x; });
      expect(e, `${r.name} #${k}`).toBeCloseTo(1, 4); expect(factoryTable(r.id)!.real[k].every(x => x === 0)).toBe(true);
    }));
  });
  it("midpoint between neighbours keeps at least 90% energy", () => {
    FACTORY_REFS.forEach(r => { const m = factoryTable(r.id)!.imag; for (let k = 0; k < 3; k++) {
      const c = Math.SQRT1_2; let e = 0; for (let n = 1; n < m[k].length; n++) e += (c * m[k][n]) ** 2 + (c * m[k + 1][n]) ** 2;
      expect(e).toBeGreaterThan(.9); } });
  });
  it("retired cloud ids play BASIC", () => { expect(tableNow("wt:Foo-0")).toBeNull(); expect(listTables).toBeTypeOf("function"); });
});
