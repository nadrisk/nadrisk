import { describe, expect, it } from "vitest";
import { MAX_IMPULSES, padOrigin, ReactionPool, reactionKind, sampleReactions } from "./reactions";

describe("pad reactions", () => {
  it("maps 16 pads to distinct 4x4 origins", () => {
    const o = new Set(Array.from({ length: 16 }, (_, i) => padOrigin(i).join()));
    expect(o.size).toBe(16); expect(padOrigin(0)).toEqual([.125, .125]); expect(padOrigin(15)).toEqual([.875, .875]);
  });
  it("chooses reaction by sound type", () => {
    expect(reactionKind("kick")).toBe("ring"); expect(reactionKind("tone", "808")).toBe("ring");
    expect(reactionKind("snare")).toBe("sweep"); expect(reactionKind("hat")).toBe("spark");
    expect(reactionKind("tone", "sampler")).toBe("scan"); expect(reactionKind("tone", "synth")).toBe("wash");
  });
  it("caps the pool and decays to nothing", () => {
    const p = new ReactionPool();
    for (let i = 0; i < 50; i++) p.push("kick", 1, { index: i % 16, name: "", engine: "drum", role: "kick", notes: [36] });
    expect(p.items.length).toBe(MAX_IMPULSES);
    for (let i = 0; i < 400; i++) p.step(.05);
    expect(p.items.length).toBe(0);
  });
  it("reverb lengthens the trail and the hit lights its own spot", () => {
    const p = new ReactionPool();
    p.push("kick", 1, { index: 5, name: "", engine: "drum", role: "kick", notes: [36] });
    p.push("kick", 1, { index: 5, name: "", engine: "drum", role: "kick", notes: [36], fx: [{ type: "reverb", mix: 1 }] });
    expect(p.items[1].life).toBeGreaterThan(p.items[0].life * 2);
    const [x, y] = padOrigin(5), o = { light: 0, hue: 0 };
    expect(sampleReactions(p.items, x, y, 1, o).light).toBeGreaterThan(.3);
  });
});
