import { describe, expect, it } from "vitest";
import { LiveCode, lineText } from "./liveCode";
import { MODELS, VjEngine } from "./engine";

const pad = { index: 0, name: "KICK", engine: "drum", role: "kick", notes: [36] };

describe("live code", () => {
  it("writes the steps a pad actually hit", () => {
    const c = new LiveCode();
    c.hit("kick", 1, pad, 0, 0); c.hit("kick", 1, pad, 4, 1);
    const [l] = c.lines(1, 0, 10);
    expect(l.text.startsWith('p1: s("[bd ~ ~ ~] [bd ~ ~ ~] ~ ~")')).toBe(true);
    expect(l.text.slice(...l.span!)).toBe("bd");
  });
  it("comments idle pads then drops them", () => {
    const c = new LiveCode(); c.hit("snare", 1, { ...pad, index: 2 }, 4, 0);
    expect(c.lines(10, 0, 1)[0].text.startsWith("// p3")).toBe(true);
    expect(c.lines(20, 0, 1)).toHaveLength(0);
  });
  it("tone pads use note names", () => {
    expect(lineText({ pad: { ...pad, engine: "synth" }, kind: "tone", tok: ["c3", ...Array(15).fill(null)], vel: .8 }).text).toContain('note("[c3 ~ ~ ~] ~ ~ ~").s("synth")');
  });
  it("cycles only the four backdrops", () => {
    expect(MODELS).toEqual(["DEPTH", "CAM", "SWEEP", "NONE"]);
    const e = new VjEngine(); e.ctl(-1, 0); expect(e.shapeName()).toBe("NONE");
  });
});
