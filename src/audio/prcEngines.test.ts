import { describe, expect, it } from "vitest";
import { defaultIdm, IDM_MAX_DECAY, IDM_MODELS, IDM_ROUTS, idmParams } from "./idm";
import { applyXY, xyLabels } from "./xyMaps";
import { pianoPick, PIANO_ROOTS } from "./pianoSamples";

const slot = (model: string, x = 0, y = 0) => ({ engine: "idm", idm: idmParams({ model: model as never }), xy: { x, y } }) as never;

describe("PRC modular engines", () => {
  it("has two engines with six routings each, DRV starting at 0", () => {
    expect(IDM_MODELS).toEqual(["nois", "vco"]);
    for (const m of IDM_MODELS) { expect(defaultIdm(m).drive).toBe(0); expect(IDM_ROUTS[m]).toHaveLength(6); }
  });
  it("keeps decay snappy (max 150 ms) and routing in 1..6", () => {
    expect(IDM_MAX_DECAY).toBe(.15);
    expect(idmParams({ model: "nois", decay: 2 }).decay).toBe(.15);
    expect(idmParams({ model: "vco", rout: 9 }).rout).toBe(5);
  });
  it("maps retired models onto the nearest engine and routing", () => {
    expect(idmParams({ model: "metl" as never })).toMatchObject({ model: "nois", rout: 0 });
    expect(idmParams({ model: "zap" as never })).toMatchObject({ model: "vco", rout: 4 });
    expect(idmParams({ model: "shrd" as never })).toMatchObject({ model: "nois", rout: 3 });
    expect(idmParams({ model: "modl" as never })).toMatchObject({ model: "vco", rout: 3 });
  });
  it("XY: X moves the model knob, Y moves tune + pitch env", () => {
    expect(xyLabels(slot("nois"))[0]).toBe("COLR");
    expect(xyLabels(slot("vco"))[0]).toBe("FOLD");
    const v = applyXY(slot("vco", 1, 0)) as { idm: { a: number } };
    expect(v.idm.a).toBeGreaterThan(defaultIdm("vco").a);
    const u = applyXY(slot("nois", 0, 1)) as { idm: { tune: number; penv: number } };
    expect(u.idm.tune).toBeGreaterThan(defaultIdm("nois").tune);
    expect(u.idm.penv).toBeGreaterThan(defaultIdm("nois").penv);
  });
});

describe("sampled grand piano", () => {
  it("bundles recordings and re-pitches by at most 3 semitones", () => {
    expect(PIANO_ROOTS.length).toBeGreaterThanOrEqual(12);
    const roots = PIANO_ROOTS.map(r => r.midi);
    for (let m = 24; m <= 96; m++) expect(Math.abs(Math.log2(pianoPick(m, roots).rate) * 12)).toBeLessThanOrEqual(3);
    expect(pianoPick(60, roots)).toEqual({ root: 60, rate: 1 });
  });
});
