import { describe, expect, it } from "vitest";
import { hasSatellites, MODELS, vectorSegments } from "./models";
import { VjEngine } from "./engine";

describe("VJ model routing", () => {
  it("allows the six orbiting satellites only on the first base POLY model", () => {
    expect(hasSatellites("POLY")).toBe(true);
    for (const name of ["WIRE", "TESSERACT", "EYE", "STELLA", "SMILEY", "TERRAIN", "CAM"]) expect(hasSatellites(name)).toBe(false);
  });
  it("cycles the sharp model roster in both directions", () => {
    const engine = new VjEngine();
    expect(MODELS).toEqual(["POLY", "WIRE", "TESSERACT", "EYE", "STELLA", "SMILEY", "TERRAIN", "CAM"]);
    engine.ctl(-1, 0);
    expect(engine.shapeName()).toBe("CAM");
    engine.ctl(1, 0);
    expect(engine.model).toBe(0);
    for (let i = 1; i < MODELS.length; i++) { engine.ctl(1, 0); expect(engine.shapeName().startsWith(MODELS[i])).toBe(true); }
  });
  it("up/down resize the object without changing its camera time or orientation", () => {
    const engine = new VjEngine();
    engine.ctl(0, 1);
    expect(engine.size).toBe(1.1);
    expect([engine.t, engine.rx, engine.ry]).toEqual([0, 0, 0]);
    engine.ctl(0, -1);
    expect(engine.size).toBe(1);
  });
  it("produces finite distinct geometry for every vector model", () => {
    for (const name of ["TESSERACT", "EYE", "STELLA", "SMILEY"]) {
      const segments = vectorSegments(name, 3, .8);
      expect(segments.length).toBeGreaterThan(10);
      expect(segments.flat(2).every(Number.isFinite)).toBe(true);
    }
    expect(vectorSegments("TESSERACT", 0, 0)).not.toEqual(vectorSegments("TESSERACT", 0, 1));
  });
  it("keeps morph state finite if a live event has no valid velocity", () => {
    const engine = new VjEngine();
    engine.hit("tone", Number.NaN);
    expect(engine.morph).toBe(.18);
  });
});