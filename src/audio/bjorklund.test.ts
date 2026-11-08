import { describe, expect, it } from "vitest";
import { bjorklund, euclid } from "./arp";
import { voiceLead } from "./harmony";
const s = (b: boolean[]) => b.map(x => (x ? "x" : ".")).join("");
describe("bjorklund", () => {
  it("tresillo 3/8", () => expect(s(bjorklund(3, 8))).toBe("x..x..x."));
  it("cinquillo 5/8", () => expect(s(bjorklund(5, 8))).toBe("x.xx.xx."));
  it("4/12", () => expect(s(bjorklund(4, 12))).toBe("x..x..x..x.."));
  it("7/16 keeps 7 hits", () => expect(euclid(7, 16).filter(Boolean)).toHaveLength(7));
  it("0 hits is silent", () => expect(bjorklund(0, 8).some(Boolean)).toBe(false));
});
describe("voiceLead", () => {
  it("C major to A minor holds C and E and moves G to A", () => expect(voiceLead([60, 64, 67], [57, 60, 64])).toEqual([60, 64, 69]));
  it("C major to F major stays close", () => expect(voiceLead([60, 64, 67], [65, 69, 72])).toEqual([60, 65, 69]));
  it("no previous chord leaves it unchanged", () => expect(voiceLead(null, [60, 64, 67])).toEqual([60, 64, 67]));
});
