import { describe, expect, it } from "vitest";
import { cleanOpts, objectsFor, stepOpt, DEFAULT_OPTS, GROUNDS, OBJECTS, CAMS } from "./options";
import { sceneSource } from "./renderer";
import { vjSend, vjVisualState } from "../bus";

describe("AV world options", () => {
  it("every world, including CLOUDS and OCEAN, holds every shape", () => {
    for (let g = 0; g < GROUNDS.length; g++) expect(objectsFor(g)).toEqual(OBJECTS.map((_, i) => i));
  });
  it("PIPE is gone and PRISM became PYRAMID", () => { expect(OBJECTS).not.toContain("PIPE"); expect(OBJECTS[3]).toBe("PYRAMID"); });
  it("switching world picks that world's own travel", () => {
    expect(CAMS[stepOpt({ ...DEFAULT_OPTS, ground: 1 }, "ground", 1).cam]).toBe("DRIFT");
    expect(CAMS[stepOpt({ ...DEFAULT_OPTS, ground: 2 }, "ground", 1).cam]).toBe("DIVE");
  });
  it("an old saved PIPE falls back to no object", () => expect(cleanOpts({ ground: 2, object: 6 }).object).toBe(0));
  it("garbage from an old window is cleaned to defaults", () => expect(cleanOpts({ ground: 9, palette: -1 } as never)).toEqual({ ...DEFAULT_OPTS, ground: 0, palette: 0 }));
  it("bus applies option steps", () => { const before = vjVisualState().opts!.form; vjSend({ t: "opt", key: "form", d: 1 }); expect(vjVisualState().opts!.form).toBe((before + 1) % 6); });
  it("each combination gets its own program key", () => {
    expect(sceneSource("SPACE", { ...DEFAULT_OPTS, object: 2 }).key).not.toBe(sceneSource("SPACE", DEFAULT_OPTS).key);
    expect(sceneSource("SPACE", { ...DEFAULT_OPTS, skin: 3 }).src).toContain("#define SKIN 3");
    expect(sceneSource("PLASMA", { ...DEFAULT_OPTS, effect: 2 }).src).toContain("#define DITHER");
  });
});
