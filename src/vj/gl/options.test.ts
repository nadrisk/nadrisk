import { describe, expect, it } from "vitest";
import { cleanOpts, objectsFor, stepOpt, DEFAULT_OPTS, GROUNDS, OBJECTS, CAMS, WORLDS } from "./options";
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
  it("bus applies option steps", () => { const before = cleanOpts(vjVisualState().opts).form; vjSend({ t: "opt", key: "form", d: 1 }); expect(cleanOpts(vjVisualState().opts).form).toBe((before + 1) % 6); });
  it("offers SPACE, PLASMA and NONE without CAM", () => expect(WORLDS).toEqual(["SPACE", "PLASMA", "NONE"]));
  it("form changes preserve the selected palette", () => {
    expect(stepOpt({ ...DEFAULT_OPTS, palette: 4 }, "form", 1).palette).toBe(4);
  });
  it("surface, palette and effects never change the compiled program", () => {
    for (const world of ["SPACE", "PLASMA"] as const) {
      const base = sceneSource(world, DEFAULT_OPTS);
      for (const opts of [{ palette: 3 }, { skin: 3 }, { floor: 2 }, { effect: 2 }]) {
        expect(sceneSource(world, { ...DEFAULT_OPTS, ...opts })).toEqual(base);
      }
    }
  });
  it("geometry still selects the required program", () => {
    expect(sceneSource("SPACE", { ...DEFAULT_OPTS, object: 2 }).key).not.toBe(sceneSource("SPACE", DEFAULT_OPTS).key);
  });
});
