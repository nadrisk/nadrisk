import { describe, it, expect } from "vitest";
import { shiftRow } from "./rowShift";
const bank = (row: number[], len = 8) => ({ pattern: [row], lengths: [len], vel: [row.map((_, i) => i / 10)], chance: [row.map(() => 1)], steps: 16 }) as any;
describe("shiftRow", () => {
  it("+1 moves steps right and wraps", () => expect(shiftRow(bank([1,0,0,0,0,0,0,1]), 0, 1).pattern[0]).toEqual([1,1,0,0,0,0,0,0]));
  it("-1 moves steps left", () => expect(shiftRow(bank([0,1,0,0,0,0,0,0]), 0, -1).pattern[0]).toEqual([1,0,0,0,0,0,0,0]));
  it("stays inside track length", () => expect(shiftRow(bank([1,0,0,0,1,1], 4), 0, 1).pattern[0]).toEqual([0,1,0,0,1,1]));
  it("moves velocity with notes", () => expect(shiftRow(bank([1,0,0,0]), 0, 1).vel[0][1]).toBe(0));
  it("wrapped tie becomes a hit", () => expect(shiftRow(bank([0,0,1,2], 4), 0, 1).pattern[0]).toEqual([1,0,0,1]));
});
