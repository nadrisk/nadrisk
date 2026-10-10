import { describe, it, expect } from "vitest";
import { phraseOrder } from "@/audio/arp";
describe("phraseOrder", () => {
  it("plain", () => expect(phraseOrder({ steps: 4 })).toEqual([0, 1, 2, 3]));
  it("first x3", () => expect(phraseOrder({ steps: 4, loop: { where: "first", len: 2, times: 3 } })).toEqual([0, 1, 0, 1, 0, 1, 2, 3]));
  it("last x2", () => expect(phraseOrder({ steps: 4, loop: { where: "last", len: 1, times: 2 } })).toEqual([0, 1, 2, 3, 3]));
});
