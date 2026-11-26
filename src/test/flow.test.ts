import { describe, it, expect } from "vitest";
import { flowPath, FLOW_SHAPES } from "@/audio/runes";
import { applyFlow, type Row } from "@/audio/runeCompiler";

const row = (): Row => ({ pattern: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], vel: Array(16).fill(1), chance: Array(16).fill(1), ratchet: Array(16).fill(1), pitch: Array.from({ length: 16 }, (_, i) => i) });

describe("FLOW lane", () => {
  it("every shape visits valid cells and most are true reorderings", () => {
    for (const f of FLOW_SHAPES) { const p = flowPath(f.id, 16); expect(p).toHaveLength(16); p.forEach(x => expect(x).toBeGreaterThanOrEqual(0)); }
    expect(flowPath("serpent", 16).slice(4, 8)).toEqual([7, 6, 5, 4]);
    expect(flowPath("reverse", 8)).toEqual([7, 6, 5, 4, 3, 2, 1, 0]);
    expect(new Set(flowPath("spiral", 16)).size).toBe(16);
    expect(new Set(flowPath("knight", 16)).size).toBe(16);
  });
  it("AMT rotates where the walk starts", () => { expect(flowPath("raster", 16, 0)[0]).toBe(0); expect(flowPath("raster", 16, 1)[0]).toBe(15); });
  it("reorders the played steps and respects scope", () => {
    const rows = { 0: row(), 1: row() };
    applyFlow([{ rune: "snake", shape: "reverse", start: 0, len: 4, amt: 0, spd: .5, rate: "1/16", scope: "melo" }], rows, ["rhythm", "bass"], 16);
    expect(rows[1].pitch![0]).toBe(15); expect(rows[0].pitch![0]).toBe(0);
  });
});
