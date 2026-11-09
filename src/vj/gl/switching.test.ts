import { describe, expect, it } from "vitest";
import { sceneSource } from "./renderer";
import { DEFAULT_OPTS, OBJECTS, MOTIONS, CAMS, FORMS } from "./options";
import { SPACE_SOURCES } from "./shaders";

describe("AV playback-safe switching", () => {
  it("all objects reuse the current world program", () => {
    const base = sceneSource("SPACE", DEFAULT_OPTS);
    OBJECTS.forEach((_, object) => expect(sceneSource("SPACE", { ...DEFAULT_OPTS, object })).toEqual(base));
  });
  it("all object movements reuse the current world program", () => {
    const base = sceneSource("SPACE", DEFAULT_OPTS);
    MOTIONS.forEach((_, motion) => expect(sceneSource("SPACE", { ...DEFAULT_OPTS, motion })).toEqual(base));
  });
  it("all camera movements reuse the current world program", () => {
    const base = sceneSource("SPACE", DEFAULT_OPTS);
    CAMS.forEach((_, cam) => expect(sceneSource("SPACE", { ...DEFAULT_OPTS, cam })).toEqual(base));
  });
  it("all plasma forms reuse one program", () => {
    const base = sceneSource("PLASMA", DEFAULT_OPTS);
    FORMS.forEach((_, form) => expect(sceneSource("PLASMA", { ...DEFAULT_OPTS, form })).toEqual(base));
  });
});

// Execute the scalar GLSL body itself, so the check cannot drift from the rendered shape.
const body = SPACE_SOURCES[0].match(/float sdPyramid\(vec3 p, float h\)\{([\s\S]*?)\n\}/)?.[1];
function pyramid(x: number, y: number, z: number) {
  if (!body || body.includes("vec3 q")) throw new Error("Pyramid lacks the closed planar distance field");
  const js = body.replace(/float /g, "let ");
  return new Function("p", "h", "max", "abs", "sqrt", js)({ x, y, z }, 1, Math.max, Math.abs, Math.sqrt) as number;
}
describe("closed PYRAMID", () => {
  it("has a flat base, including points close to its corners", () => {
    for (const [x, z] of [[0, 0], [.1, .1], [.49, .49]]) {
      expect(pyramid(x, 0, z)).toBeCloseTo(0, 8);
      expect(pyramid(x, -.01, z)).toBeCloseTo(.01, 8);
      expect(pyramid(x, .01, z)).toBeLessThan(0);
    }
  });
  it("is solid inside and bounded by its apex and sloped faces", () => {
    expect(pyramid(0, .5, 0)).toBeLessThan(0);
    expect(pyramid(0, 1, 0)).toBe(0);
    expect(pyramid(0, 1.1, 0)).toBeGreaterThan(0);
    expect(pyramid(.4, .5, 0)).toBeGreaterThan(0);
  });
});