import { describe, expect, it } from "vitest";
import { CONDS, condPass, nudgeSec } from "./stepCond";
const plays = (name: string) => [0, 1, 2, 3, 4, 5, 6, 7].map(c => condPass(CONDS.indexOf(name as never), c) ? 1 : 0).join("");
describe("trig conditions", () => {
  it("ALL plays every loop", () => expect(plays("ALL")).toBe("11111111"));
  it("1:2 plays the first of every two loops", () => expect(plays("1:2")).toBe("10101010"));
  it("2:2 plays the second of every two loops", () => expect(plays("2:2")).toBe("01010101"));
  it("4:4 plays only the fourth loop", () => expect(plays("4:4")).toBe("00010001"));
  it("1ST plays only the first loop after PLAY", () => expect(plays("1ST")).toBe("10000000"));
  it("!1ST skips only the first loop", () => expect(plays("!1ST")).toBe("01111111"));
});
describe("nudge", () => {
  it("centre is on the grid", () => expect(nudgeSec(.5, .12)).toBe(0));
  it("full nudge moves 40% of a 16th", () => { expect(nudgeSec(1, .1)).toBeCloseTo(.04); expect(nudgeSec(0, .1)).toBeCloseTo(-.04); });
});
