import { describe, expect, it } from "vitest";
import { opticalField } from "./fields";
import { MODELS, quietReaction, vectorSegments, wireRadius } from "./models";
import { VjEngine } from "./engine";

describe("Optical VJ fields", () => {
  it("leaves POLY and WIRE unframed and gives the other models distinct finite fields", () => {
    for (const model of ["POLY", "WIRE"]) expect(opticalField(model, 2)).toEqual({ back: [], front: [] });
    const fields = MODELS.slice(2).filter(model => model !== "CAM" && model !== "MATRIX").map(model => opticalField(model, 2));
    expect(new Set(fields.map(field => JSON.stringify(field))).size).toBe(4);
    for (const field of fields) {
      expect(field.back.length + field.front.length).toBeGreaterThan(0);
      expect([...field.back, ...field.front].flat(2).every(Number.isFinite)).toBe(true);
    }
  });
  it("drum transients structurally deform each vector model", () => {
    for (const model of ["TESSERACT", "EYE", "STELLA", "SMILEY"]) {
      const quiet = vectorSegments(model, 2, 0);
      expect(vectorSegments(model, 2, 0, { ...quietReaction, kick: 1 })).not.toEqual(quiet);
      expect(vectorSegments(model, 2, 0, { ...quietReaction, snare: 1, snap: Math.PI / 2 })).not.toEqual(quiet);
    }
  });
  it("wire bursts expand vertices without changing the resting cage", () => {
    expect(wireRadius(.8, [1, 0, 0], quietReaction)).toBe(.8);
    expect(wireRadius(.8, [1, 0, 0], { ...quietReaction, kick: 1 })).toBeCloseTo(.992);
    expect(wireRadius(.8, [1, 0, 0], { ...quietReaction, snare: 1 })).toBeGreaterThan(.8);
  });
  it("eye orbit ring traces the actual waveform, not a simulated oscillator", () => {
    const silent = opticalField("EYE", 0, quietReaction, [0, 0, 0, 0]);
    const live = opticalField("EYE", 0, quietReaction, [.8, -.8, .8, -.8]);
    expect(live).not.toEqual(silent);
    expect(opticalField("EYE", 0)).toEqual(silent);
  });
  it("snap rotates the fourth dimension by ninety degrees on snares", () => {
    const engine = new VjEngine();
    engine.hit("snare", 1);
    expect(engine.snap).toBe(Math.PI / 2);
    expect(engine.reaction().snare).toBe(1);
    engine.hit("snare", 1);
    expect(engine.snap).toBe(Math.PI);
  });
  it("bounds the signal payload and sanitizes invalid live samples", () => {
    const engine = new VjEngine();
    engine.signal([Number.NaN, 2, -2, ...Array(200).fill(.2)], 4, 140, true);
    expect(engine.wave.length).toBe(128);
    expect(engine.wave.slice(0, 3)).toEqual([0, 1, -1]);
    expect([engine.beat, engine.bpm, engine.running]).toEqual([4, 140, true]);
  });
});