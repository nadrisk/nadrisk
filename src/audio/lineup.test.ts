import { describe, expect, it } from "vitest";
import { acidTo808, blankSlots, type Slot } from "@/hooks/useGroovebox";
import { cleanOf } from "./clean";
import { applyXY, commitXY } from "./xyMaps";
import { idmParams } from "./idm";

const pad = (p: Partial<Slot>): Slot => ({ ...blankSlots()[0], ...p });

describe("instrument lineup", () => {
  it("loads old POLY-REESE pads as BAS in REESE mode", () => {
    const s = acidTo808(pad({ engine: "poly", poly: { ...pad({}).poly, mode: "reese", reese: { detune: 30 } } }));
    expect(s.engine).toBe("808"); expect(s.bass.mode).toBe("reese"); expect(s.bass.reese?.detune).toBe(30);
  });
  it("loads old POLY chord pads as an 8-voice SYN", () => {
    const s = acidTo808(pad({ engine: "poly" }));
    expect(s.engine).toBe("synth"); expect(cleanOf(s.synth).voices).toBe(8);
  });
  it("loads old SIREN pads as a mono SYN", () => {
    const s = acidTo808(pad({ engine: "siren" }));
    expect(s.engine).toBe("synth"); expect(cleanOf(s.synth).voices).toBe(1);
  });
  it("keeps SYN voices between 1 and 8", () => {
    expect(cleanOf({ clean: { voices: 0 } }).voices).toBe(1);
    expect(cleanOf({ clean: { voices: 12 } }).voices).toBe(8);
  });
  it("falls back to METL for unknown IDM models", () => {
    expect(idmParams({ model: "nope" as never }).model).toBe("metl");
  });
});

describe("instrument XY", () => {
  it("leaves the saved sound untouched at the centre", () => {
    const s = pad({ engine: "synth", xy: { x: 0, y: 0 } });
    expect(applyXY(s)).toBe(s);
  });
  it("brightens SYN upward and opens it rightward", () => {
    const s = pad({ engine: "synth" }), c = cleanOf(s.synth);
    const up = cleanOf(applyXY({ ...s, xy: { x: 1, y: 1 } }).synth);
    expect(up.cutoff).toBeGreaterThan(c.cutoff); expect(up.env.r).toBeGreaterThan(c.env.r);
    const down = cleanOf(applyXY({ ...s, xy: { x: -1, y: -1 } }).synth);
    expect(down.cutoff).toBeLessThan(c.cutoff); expect(down.env.r).toBeLessThan(c.env.r);
  });
  it("COMMIT writes the explored sound and returns the pad to centre", () => {
    const s = pad({ engine: "808", xy: { x: .5, y: .5 } }), p = commitXY(s);
    expect(p.bass?.tone).toBeGreaterThan(s.bass.tone); expect(p.xy).toMatchObject({ x: 0, y: 0 });
  });
});
