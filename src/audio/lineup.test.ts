import { describe, expect, it } from "vitest";
import type { Slot } from "@/hooks/useGroovebox";
import { migrateEngine as acidTo808 } from "./lineup";
import { default808, defaultPoly, DRUM_INIT } from "./voices";
import { defaultSiren } from "./voices";
import { cleanOf } from "./clean";
import { applyXY, commitXY } from "./xyMaps";
import { idmParams } from "./idm";

const base = { name: "", engine: "drum", note: 48, level: 75, pan: 0, mute: false, solo: false, drum: { kind: "kick", ...DRUM_INIT.kick }, synth: { env: { a: .01, d: .3, s: .5, r: .2 } }, sampler: { start: 0, loop: false, pitch: 0, env: { a: 0, d: .3, s: 1, r: .1 }, sampleName: "" }, fx: [], choke: 0, poly: defaultPoly(), bass: default808(), siren: defaultSiren() } as unknown as Slot;
const pad = (p: Partial<Slot>): Slot => ({ ...base, ...p });

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
  it("falls back to NOIS for unknown IDM models", () => {
    expect(idmParams({ model: "nope" as never }).model).toBe("nois");
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
  it("SET writes the explored sound and keeps the dot where it is", () => {
    const s = pad({ engine: "808", xy: { x: .5, y: .5 } }), p = commitXY(s);
    expect(p.bass?.tone).toBeGreaterThan(s.bass.tone); expect(p.xy).toMatchObject({ x: .5, y: .5, ox: .5, oy: .5 });
    expect(applyXY({ ...s, ...p } as Slot).bass).toBe(p.bass);
  });
});
