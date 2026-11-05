import { describe, expect, it } from "vitest";
import { activeAtom, codeDoc, groupBlock, miniNotation } from "./codeDoc";
import type { DocPad } from "./bus";

const row = (hits: number[], n = 16) => Array.from({ length: n }, (_, i) => hits.includes(i) ? 1 : 0);
const pad = (o: Partial<DocPad> = {}): DocPad => ({ index: 0, name: "HOUSE KICK", engine: "drum", role: "kick", kind: "kick", note: 36, mute: false, solo: false, len: 16, steps: row([0, 4, 8, 12]), vel: Array(16).fill(1), chance: Array(16).fill(1), fx: [], ...o });
const at = (m: Record<number, string>) => Array.from({ length: 16 }, (_, i) => m[i] ?? null);
const kit = [pad(), pad({ index: 1, kind: "snare", steps: row([4, 12]) }), pad({ index: 2, kind: "hat", steps: row([0, 2, 4, 6, 8, 10, 12, 14]) }), pad({ index: 3, kind: "open", steps: row([2]) })];

describe("code doc", () => {
  it("four on the floor is bd*4", () => expect(groupBlock("drums", [pad()], false)[0].text).toBe('drums: s("bd*4")'));
  it("backbeat is [~ sd]*2", () => expect(miniNotation(at({ 4: "sd", 12: "sd" }))).toBe("[~ sd]*2"));
  it("four drum pads make one drums block", () => expect(codeDoc(kit, 124, "A").filter(l => /drums:/.test(l.text)).length).toBe(1));
  it("a whole kit stays short", () => expect(codeDoc(kit, 124, "A").length).toBeLessThanOrEqual(10));
  it("default sounds write no effect calls", () => expect(codeDoc(kit, 124, "A").some(l => /\.(lpf|room|gain|velocity|attack)/.test(l.text))).toBe(false));
  it("a muted group is written _drums:", () => expect(groupBlock("drums", [pad({ mute: true })], false)[0].text.startsWith("_drums:")).toBe(true));
  it("chance below 100% writes ?", () => { const c = Array(16).fill(1); c[0] = c[4] = c[8] = c[12] = .7; expect(groupBlock("drums", [pad({ chance: c })], false)[0].text).toBe('drums: s("bd?.3*4")'); });
  it("never mentions strudel", () => expect(codeDoc([...kit, pad({ index: 5, engine: "synth", kind: "tone", note: 60 })], 124, "A").map(l => l.text).join("\n").toLowerCase()).not.toContain("strudel"));
  it("highlights the atom playing in each layer, following ties", () => {
    const steps = [1, 2, 2, 0, ...Array(12).fill(0)], l = codeDoc([pad({ steps })], 128, "A").find(x => x.layers)!;
    expect(l.text.slice(activeAtom(l.layers![0], steps, 2)!.at).startsWith("bd")).toBe(true);
    expect(activeAtom(l.layers![0], steps, 3)).toBeNull();
  });
});
