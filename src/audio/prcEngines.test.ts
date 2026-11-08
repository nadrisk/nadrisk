import { describe, expect, it } from "vitest";
import { defaultIdm, IDM_MODELS, idmParams } from "./idm";
import { applyXY, xyLabels } from "./xyMaps";

const slot = (model: string) => ({ engine: "idm", idm: idmParams({ model: model as never }) }) as never;

describe("PRC modular engines", () => {
  it("has exactly three engines, all starting with DRV 0", () => {
    expect(IDM_MODELS).toEqual(["nois", "vco", "modl"]);
    for (const m of IDM_MODELS) expect(defaultIdm(m).drive).toBe(0);
  });
  it("maps retired models onto the nearest engine", () => {
    expect(idmParams({ model: "metl" as never }).model).toBe("modl");
    expect(idmParams({ model: "zap" as never }).model).toBe("vco");
    expect(idmParams({ model: "clik" as never }).model).toBe("nois");
    expect(idmParams({ model: "shrd" as never }).model).toBe("nois");
  });
  it("XY moves each engine's own controls and labels", () => {
    expect(xyLabels(slot("vco"))[0]).toBe("FOLD");
    expect(xyLabels(slot("modl"))[0]).toBe("STRK");
    const v = applyXY(slot("vco"), 1, 0) as { idm: { b: number } };
    expect(v.idm.b).toBeGreaterThan(defaultIdm("vco").b);
    const m = applyXY(slot("modl"), 0, 1) as { idm: { b: number; c: number } };
    expect(m.idm.b).toBeLessThan(defaultIdm("modl").b);
    expect(m.idm.c).toBeGreaterThan(defaultIdm("modl").c);
  });
});
