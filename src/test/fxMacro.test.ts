import { describe, expect, it } from "vitest";
import { makeFx } from "@/audio/effects";
import { macroFxParams, macroParamsOf, type FxMacroMapping } from "@/audio/fxMacro";
const fx = makeFx("metal", { metal: .4, drive: .2 });
const m = (param: string, axis: "x" | "y", depth = .5, owner = "p0"): FxMacroMapping => ({ id: `${owner}${param}${axis}`, owner, fx: fx.id, param, axis, depth });
describe("effect macros", () => {
  it("centre and non-macro modes preserve saved sounds", () => {
    expect(macroFxParams("p0", fx, [m("metal", "x")], { mode: "macro", x: 0, y: 0 })).toEqual(fx.params);
    expect(macroFxParams("p0", fx, [m("metal", "x")], { mode: "clock", x: 1, y: 1 })).toEqual(fx.params);
  });
  it("X and Y independently drive multiple parameters without overwriting each other", () => {
    const p = macroFxParams("p0", fx, [m("metal", "x"), m("drive", "y")], { mode: "macro", x: 1, y: -.2 });
    expect(p.metal).toBeCloseTo(.9); expect(p.drive).toBeCloseTo(.1); expect(fx.params.metal).toBe(.4);
  });
  it("inversion and stacked axes sum then stay in safe ranges", () => {
    const p = macroFxParams("p0", fx, [m("metal", "x", -1), m("metal", "y", .5)], { mode: "macro", x: 1, y: 1 });
    expect(p.metal).toBe(0);
  });
  it("targets are isolated by both pad and effect identity, with no three-target cap", () => {
    const maps = Array.from({ length: 12 }, (_, i) => m("metal", "x", .5, `p${i}`));
    for (let i = 0; i < 12; i++) expect(macroFxParams(`p${i}`, fx, maps, { mode: "macro", x: 1, y: 0 }).metal).toBeCloseTo(.9);
    expect(macroFxParams("p12", fx, maps, { mode: "macro", x: 1, y: 0 }).metal).toBe(.4);
    expect(macroFxParams("p0", { ...fx, id: fx.id + 99 }, maps, { mode: "macro", x: 1, y: 0 }).metal).toBe(.4);
  });
  it("structural switches are not macro targets", () => {
    expect(macroParamsOf("metal")).not.toContain("track"); expect(macroParamsOf("delay")).not.toContain("mode");
  });
  it("macro mode never also changes instrument timbre", async () => {
    const { mangleOffset } = await import("@/audio/mangleTimbre");
    expect(mangleOffset({ padRole: "bass" }, { mode: "macro", x: 1, y: 1 })).toEqual({ x: 0, y: 0 });
  });
});