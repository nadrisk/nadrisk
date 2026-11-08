import { describe, expect, it } from "vitest";
import { cleanOpts, objectsFor, stepOpt, DEFAULT_OPTS, GROUNDS, OBJECTS } from "./options";
import { sceneSource } from "./renderer";
import { vjSend, vjVisualState } from "../bus";

describe("AV world options", () => {
  it("CLOUDS is pure flight with no object", () => expect(objectsFor(GROUNDS.indexOf("CLOUDS"))).toEqual([0]));
  it("PIPE only exists in ENDLESS", () => {
    for (let g = 0; g < GROUNDS.length; g++) expect(objectsFor(g).includes(OBJECTS.indexOf("PIPE"))).toBe(GROUNDS[g] === "ENDLESS");
  });
  it("switching ground drops an object the new ground can't hold", () => {
    const o = stepOpt({ ...DEFAULT_OPTS, ground: 2, object: 6 }, "ground", 1);
    expect(GROUNDS[o.ground]).toBe("CLOUDS"); expect(o.object).toBe(0);
  });
  it("object stepping wraps through the allowed list", () => {
    let o = { ...DEFAULT_OPTS, ground: 0, object: 0 }; const seen: number[] = [];
    for (let i = 0; i < 6; i++) { o = stepOpt(o, "object", 1); seen.push(o.object); }
    expect(seen).toEqual([1, 2, 3, 4, 5, 0]);
  });
  it("garbage from an old window is cleaned to defaults", () => expect(cleanOpts({ ground: 9, palette: -1 } as never)).toEqual({ ...DEFAULT_OPTS, ground: 0, palette: 0 }));
  it("bus applies option steps", () => { const before = vjVisualState().opts!.form; vjSend({ t: "opt", key: "form", d: 1 }); expect(vjVisualState().opts!.form).toBe((before + 1) % 6); });
  it("each combination gets its own program key", () => {
    expect(sceneSource("SPACE", { ...DEFAULT_OPTS, object: 2 }).key).not.toBe(sceneSource("SPACE", DEFAULT_OPTS).key);
    expect(sceneSource("PLASMA", { ...DEFAULT_OPTS, effect: 2 }).src).toContain("#define DITHER");
  });
});
