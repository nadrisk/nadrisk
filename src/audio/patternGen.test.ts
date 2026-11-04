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

import { genBreak as gb2, genRandom as gr2 } from "./patternGen";
describe("PRC-aware generators", () => {
  const roles = Array(16).fill("perc") as any[], o = { dens: .5, fill: .5, vary: 0, seed: 11 };
  it("different PRC models get different lanes", () => {
    const res = gb2("AMEN", o, roles, [0, 1, 2, 3], 16, ["clik", "zap", "metl", "shrd"]);
    const rows = [0, 1, 2, 3].map(i => res[i].pattern.slice(0, 16).join(""));
    expect(new Set(rows).size).toBe(4);
  });
  it("two pads with the same model interlock instead of doubling", () => {
    const res = gb2("DNB", o, roles, [0, 1], 16, ["metl", "metl"]);
    expect(res[0].pattern.join("")).not.toBe(res[1].pattern.join(""));
  });
  it("PRC ghost hits keep 70-90% chance", () => {
    for (let seed = 1; seed < 30; seed++) { const res = gb2("4/4", { ...o, seed }, roles, [0], 32, ["nois"]);
      res[0].chance.forEach((c, i) => { if (res[0].pattern[i] && c < 1) { expect(c).toBeGreaterThanOrEqual(.7); expect(c).toBeLessThanOrEqual(.9); } }); }
  });
  it("RANDOM gives PRC rows ratchets and off-beat weight", () => {
    let off = 0, on = 0, rolls = 0;
    for (let seed = 1; seed < 40; seed++) { const r = gr2({ dens: .8, velLo: .4, chance: 0, roll: 0, seed }, [0], 16, ["clik"])[0];
      r.pattern.forEach((v, c) => { if (!v) return; if (c % 4 === 0) on++; else off++; if (r.ratchet[c] > 1) rolls++; }); }
    expect(off).toBeGreaterThan(on * 3); expect(rolls).toBeGreaterThan(0);
  });
});
