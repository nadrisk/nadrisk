import { describe, it, expect } from "vitest";
import { genBreak, genRandom, bakePhrase, detectRole, type Role } from "./patternGen";
import { defaultArp } from "./arp";

const roles: Role[] = ["kick", "snare", "hat", "open", "perc", ...Array(11).fill("none")];
const all = Array.from({ length: 16 }, (_, i) => i);
const o = { dens: 0, fill: 0, vary: 0, seed: 7 };

describe("GEN breaks", () => {
  it("4/4 puts kicks on every beat and snare on 2 and 4", () => {
    const r = genBreak("4/4", o, roles, all, 16);
    expect([0, 4, 8, 12].every(c => r[0].pattern[c] === 1)).toBe(true);
    expect(r[1].pattern[4]).toBe(1); expect(r[1].pattern[12]).toBe(1);
  });
  it("density adds hits", () => {
    const n = (d: number) => genBreak("DNB", { ...o, dens: d }, roles, all, 16)[2].pattern.reduce((a, b) => a + b, 0);
    expect(n(1)).toBeGreaterThan(n(0));
  });
  it("leaves rows not listed and NONE rows untouched", () => {
    const r = genBreak("AMEN", o, roles, [0, 5], 16);
    expect(r[1]).toBeUndefined(); expect(r[5]).toBeUndefined(); expect(r[0]).toBeDefined();
  });
  it("IDM always lands a kick on the downbeat", () => expect(genBreak("IDM", o, roles, [0], 16)[0].pattern[0]).toBe(1));
  it("random respects rows", () => expect(Object.keys(genRandom({ dens: 1, velLo: .4, chance: 0, roll: 0, seed: 3 }, [2], 16))).toEqual(["2"]));
});

describe("roles", () => {
  it("detects open hats by name", () => expect(detectRole({ name: "HAT OP", engine: "drum", drum: { kind: "hat" } })).toBe("open"));
  it("override wins", () => expect(detectRole({ name: "KICK", engine: "drum", role: "perc" })).toBe("perc"));
});

describe("phrase bake", () => {
  it("writes a step for each lit phrase cell with its pitch", () => {
    const a = { ...defaultArp(), steps: 4, cells: [{ on: true, deg: 0, vel: 1, gate: .5 }, { on: false, deg: 0, vel: 1, gate: .5 }, { on: true, deg: 2, vel: .5, gate: .5 }, { on: true, deg: 0, vel: 1, gate: .5 }] };
    const b = bakePhrase(a, 16);
    expect(b.pattern.slice(0, 4)).toEqual([1, 0, 1, 1]);
    expect(b.pitch[0]).toBe(.5); expect(b.pitch[2]).toBeGreaterThan(.5); expect(b.vel[2]).toBe(.5);
  });
});
