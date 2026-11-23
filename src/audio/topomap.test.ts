import { describe, it, expect } from "vitest";
import { mangleRow, pathAt, coprime, atRest, TOPO_LAWS } from "./topomap";

const four = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0];
const back = [0,0,1,0, 0,0,1,0, 0,0,1,0, 1,0,1,0];

describe("topomap", () => {
  it("plays the clean beat unchanged at the centre", () => {
    for (const law of TOPO_LAWS) expect(mangleRow(back, 16, law, { x: 0, y: 0 })).toEqual(back);
  });
  it("is deterministic for a puck position", () => {
    for (const law of TOPO_LAWS) expect(mangleRow(back, 16, law, { x: .4, y: -.7 })).toEqual(mangleRow(back, 16, law, { x: .4, y: -.7 }));
  });
  it("SHIFT is a permutation, so hit count is kept", () => {
    const out = mangleRow(back, 16, "SHIFT", { x: .3, y: .9 });
    expect(out.reduce((a, b) => a + b, 0)).toBe(back.filter(v => v === 1).length);
  });
  it("SHIFT multiplier is always coprime to the length", () => {
    expect(coprime(4, 16)).not.toBe(4); expect([3, 5]).toContain(coprime(4, 16)); expect(coprime(6, 7)).toBe(6);
  });
  it("SIEVE up adds hits, down removes them", () => {
    const n = (r: number[]) => r.reduce((a, b) => a + b, 0);
    expect(n(mangleRow(four, 16, "SIEVE", { x: 0, y: 1 }))).toBeGreaterThan(4);
    expect(n(mangleRow(four, 16, "SIEVE", { x: 0, y: -1 }))).toBeLessThanOrEqual(4);
  });
  it("R90 never empties a row", () => {
    expect(mangleRow(four, 16, "R90", { x: 1, y: 1 }).some(Boolean)).toBe(true);
  });
  it("paths stay inside the pad", () => {
    for (const p of ["RING", "SIGIL", "SNAKE"] as const) for (let k = 0; k < 40; k++) { const q = pathAt(p, k / 40); expect(Math.abs(q.x)).toBeLessThanOrEqual(1); expect(Math.abs(q.y)).toBeLessThanOrEqual(1); }
    expect(atRest(pathAt("FREE", .3))).toBe(true);
  });
});
