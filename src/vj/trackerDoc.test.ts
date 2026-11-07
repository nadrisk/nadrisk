import { describe, expect, it } from "vitest";
import { cell, hex, trackerDoc } from "./trackerDoc";
import type { DocPad } from "./bus";
const pad = (o: Partial<DocPad> = {}): DocPad => ({ index: 0, name: "KICK", engine: "drum", role: "kick", kind: "kick", note: 36, mute: false, solo: false, len: 16, steps: [1, 2, 0, ...Array(13).fill(0)], vel: Array(16).fill(1), chance: Array(16).fill(1), fx: [], ...o });
describe("tracker doc", () => {
  it("writes hits, ties and rests", () => { const p = pad(); expect([cell(p, 0), cell(p, 1), cell(p, 2)]).toEqual(["BD- 7F ", "|   |  ", "··· ·· "]); });
  it("velocity is hex 00–7F", () => expect([hex(0), hex(.5), hex(1)]).toEqual(["00", "40", "7F"]));
  it("notes use tracker pitch names", () => expect(cell(pad({ engine: "synth", kind: "tone", note: 61 }), 0).startsWith("C#4")).toBe(true));
  it("solo dims other columns", () => expect(trackerDoc([pad(), pad({ index: 1, solo: true })], 120, "A", 0).cols.map(c => c.muted)).toEqual([true, false]));
  it("32-step tracks page with the transport", () => { const s = Array(32).fill(0); s[20] = 1; const d = trackerDoc([pad({ steps: s, len: 32, vel: Array(32).fill(1), chance: Array(32).fill(1) })], 120, "A", 18); expect(d.page).toBe(1); expect(d.rows[4].cells[0]).toBe("BD- 7F "); });
  it("chance marks only probability-limited hits", () => { const chance = Array(16).fill(1); chance[0] = .7; const p = pad({ chance }); expect(cell(p, 0)).toBe("BD- 7F?"); expect(cell(p, 2)).toBe("··· ·· "); });
});
