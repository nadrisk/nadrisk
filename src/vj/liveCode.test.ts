import { describe, expect, it } from "vitest";
import { LiveCode, atomSpan, miniNotation } from "./liveCode";
import { depthcore, MAX_RIBBONS } from "./depthcore";
import { MODELS, VjEngine } from "./engine";

const pad = { index: 0, name: "KICK", engine: "drum", role: "kick", notes: [36] };
const at = (m: Record<number, string>) => Array.from({ length: 16 }, (_, i) => m[i] ?? null);

describe("mini-notation", () => {
  it("four on the floor is bd*4", () => expect(miniNotation(at({ 0: "bd", 4: "bd", 8: "bd", 12: "bd" }))).toBe("bd*4"));
  it("backbeat snare is [~ sd]*2", () => expect(miniNotation(at({ 4: "sd", 12: "sd" }))).toBe("[~ sd]*2"));
  it("eighth hats are hh*8", () => expect(miniNotation(at({ 0: "hh", 2: "hh", 4: "hh", 6: "hh", 8: "hh", 10: "hh", 12: "hh", 14: "hh" }))).toBe("hh*8"));
  it("finds the k-th sounding atom", () => { const l = '$: note("[c3 e3]*4")'; expect(l.slice(...atomSpan(l, 1)!)).toBe("e3"); });
});

describe("typist", () => {
  it("eventually types the real block, then mutes and removes it", () => {
    const c = new LiveCode();
    for (const s of [0, 4, 8, 12]) c.hit("kick", 1, pad, s, s / 4);
    for (let i = 0; i < 4000; i++) c.tick(.02, 1, 128);
    expect(c.screen).toContain('$: s("bd*4")');
    for (let i = 0; i < 4000; i++) c.tick(.02, 12, 128);
    expect(c.screen.some(l => l.startsWith('_$: s("bd*4")'))).toBe(true);
    for (let i = 0; i < 4000; i++) c.tick(.02, 30, 128);
    expect(c.screen.some(l => l.includes("$:"))).toBe(false);
  });
});

describe("AV backdrops", () => {
  it("cycles only the four backdrops", () => {
    expect(MODELS).toEqual(["DEPTH", "CAM", "SWEEP", "NONE"]);
    const e = new VjEngine(); e.ctl(-1, 0); expect(e.shapeName()).toBe("NONE");
  });
  it("depthcore is one bounded ribbon fan", () => {
    expect(depthcore({ t: 0, open: 0, twist: 0, ribbons: 999 }).length).toBe(MAX_RIBBONS * 24);
  });
});
