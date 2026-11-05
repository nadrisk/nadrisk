import { describe, expect, it } from "vitest";
import { activeAtom, miniNotation, padBlock, strudelDoc } from "./strudelDoc";
import type { DocPad } from "./bus";

const row = (hits: number[], n = 16) => Array.from({ length: n }, (_, i) => hits.includes(i) ? 1 : 0);
const pad = (o: Partial<DocPad> = {}): DocPad => ({ index: 0, name: "HOUSE KICK", engine: "drum", role: "kick", kind: "kick", note: 36, mute: false, solo: false, len: 16, steps: row([0, 4, 8, 12]), vel: Array(16).fill(1), chance: Array(16).fill(1), fx: [], ...o });
const at = (m: Record<number, string>) => Array.from({ length: 16 }, (_, i) => m[i] ?? null);

describe("strudel doc", () => {
  it("four on the floor is bd*4", () => expect(padBlock(pad(), false)[1].text).toBe('$: s("bd*4")'));
  it("backbeat is [~ sd]*2", () => expect(miniNotation(at({ 4: "sd", 12: "sd" }))).toBe("[~ sd]*2"));
  it("muted pad becomes _$:", () => expect(padBlock(pad({ mute: true }), false)[1].text.startsWith("_$:")).toBe(true));
  it("other pads mute when one is soloed", () => expect(padBlock(pad(), true)[1].text.startsWith("_$:")).toBe(true));
  it("chance below 100% writes ?", () => { const c = Array(16).fill(1); c[0] = c[4] = c[8] = c[12] = .7; expect(padBlock(pad({ chance: c }), false)[1].text).toBe('$: s("bd?0.3*4")'); });
  it("track length 8 writes .fast(16/8)", () => expect(padBlock(pad({ len: 8, steps: row([0, 4], 8), vel: Array(8).fill(1), chance: Array(8).fill(1) }), false).some(l => l.text.includes(".fast(16/8)"))).toBe(true));
  it("synth pads use note() and .s()", () => { const b = padBlock(pad({ engine: "synth", kind: "tone", note: 60 }), false); expect(b[1].text).toBe('$: note("c4*4")'); expect(b.some(l => l.text.includes('.s("sawtooth")'))).toBe(true); });
  it("highlights the atom playing, following ties", () => {
    const d = strudelDoc([pad({ steps: [1, 2, 2, 0, ...Array(12).fill(0)] })], 128, "A"), l = d.find(x => x.atoms)!;
    expect(l.text.slice(activeAtom(l, [1, 2, 2, 0, ...Array(12).fill(0)], 2)!.at).startsWith("bd")).toBe(true);
    expect(activeAtom(l, [1, 2, 2, 0, ...Array(12).fill(0)], 3)).toBeNull();
  });
});
