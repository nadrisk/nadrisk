import { describe, expect, it } from "vitest";
import { codeLines } from "./nadCode";
import type { DocPad } from "./bus";

const pad = (o: Partial<DocPad> = {}): DocPad => ({ index: 0, name: "UKG KICK", engine: "drum", role: "kick", kind: "kick", note: 36, mute: false, solo: false, len: 16, steps: Array.from({ length: 16 }, (_, i) => i % 4 === 0 ? 1 : 0), vel: Array(16).fill(.7), chance: Array(16).fill(1), fx: [], ...o });

describe("NAD code overlay lines", () => {
  it("writes one patch line per pad with its steps", () => {
    const l = codeLines([pad()], 0, "A", 124);
    expect(l[0].text).toBe("nad.rack[A] @ 124bpm >>");
    expect(l[1].text.startsWith("$01 kick.ukgkic |> x . . . x")).toBe(true);
  });
  it("highlights the playing step and dims muted pads", () => {
    const l = codeLines([pad({ mute: true })], 4, "A", 120)[1];
    expect(l.text[l.hi!]).toBe("x"); expect(l.muted).toBe(true);
  });
  it("shows ties and chance steps", () => {
    const s = Array(16).fill(0); s[0] = 1; s[1] = 2; s[2] = 1; const ch = Array(16).fill(1); ch[2] = .5;
    expect(codeLines([pad({ steps: s, chance: ch })], 0, "A", 120)[1].text).toContain("|> x = ? .");
  });
});
