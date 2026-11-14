import { describe, expect, it } from "vitest";
import { bjorklund, euclid } from "./arp";
const s = (b: boolean[]) => b.map(x => (x ? "x" : ".")).join("");
describe("bjorklund", () => {
  it("tresillo 3/8", () => expect(s(bjorklund(3, 8))).toBe("x..x..x."));
  it("cinquillo 5/8", () => expect(s(bjorklund(5, 8))).toBe("x.xx.xx."));
  it("4/12", () => expect(s(bjorklund(4, 12))).toBe("x..x..x..x.."));
  it("7/16 keeps 7 hits", () => expect(euclid(7, 16).filter(Boolean)).toHaveLength(7));
  it("0 hits is silent", () => expect(bjorklund(0, 8).some(Boolean)).toBe(false));
});
import { genEucl } from "./patternGen";
describe("GEN EUCL", () => {
  it("repeats a 3/8 cycle across 16 steps", () => expect(genEucl({ hits: 3, len: 8, rot: 0 }, [0], 16)[0].pattern.slice(0, 16).join("")).toBe("1001001010010010"));
});
