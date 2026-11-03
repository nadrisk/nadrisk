import { describe, expect, it } from "vitest";
import { euclid, trancePhrase, defaultTrance, defaultArp, applyEucl } from "./arp";
import { genBreak } from "./patternGen";
import { idmParams, IDM_MAX_DECAY } from "./idm";
import { applyXY } from "./xyMaps";
import type { Slot } from "@/hooks/useGroovebox";
import { DRUM_INIT, defaultPoly, default808 } from "./voices";
const pad = { name: "", engine: "drum", note: 48, level: 75, pan: 0, mute: false, solo: false, drum: { kind: "kick", ...DRUM_INIT.kick }, synth: { env: { a: .01, d: .3, s: .5, r: .2 } }, sampler: { start: 0, loop: false, pitch: 0, env: { a: 0, d: .3, s: 1, r: .1 }, sampleName: "" }, fx: [], choke: 0, poly: defaultPoly(), bass: default808() } as unknown as Slot;

describe("euclidean phrase rhythm", () => {
  it("spreads 3 hits over 8 steps as the tresillo", () => {
    expect(euclid(3, 8).map(Number)).toEqual([1, 0, 0, 1, 0, 0, 1, 0]);
  });
  it("rotation shifts the pattern", () => {
    expect(euclid(3, 8, 1).map(Number)).toEqual([0, 1, 0, 0, 1, 0, 0, 1]);
  });
  it("keeps the step notes and sets the phrase length", () => {
    const a = defaultArp(), out = applyEucl(a, { on: true, hits: 5, steps: 8, rot: 0, gate: .5 });
    expect(out.steps).toBe(8);
    expect(out.cells.map(c => c.deg)).toEqual(a.cells.map(c => c.deg));
    expect(out.cells.slice(0, 8).filter(c => c.on)).toHaveLength(5);
  });
});

describe("two-note trance rhythms", () => {
  it("332 plays a b . a b . a b twice", () => {
    const cells = trancePhrase("minor", { ...defaultTrance(), pattern: 0, spread: 0 });
    expect(cells.map(c => (c.on ? (c.deg ? "b" : "a") : ".")).join("")).toBe("ab.ab.abab.ab.ab");
    expect(cells[1].deg).toBe(7); // octave up in a 7-note scale
  });
});

describe("LATN generator", () => {
  it("writes every drum role", () => {
    const out = genBreak("LATN", { dens: 0, fill: 0, vary: 0, seed: 7 }, ["kick", "snare", "hat", "open", "perc"], [0, 1, 2, 3, 4], 16);
    for (const row of [0, 1, 2, 3, 4]) expect(out[row].pattern.slice(0, 16).some(Boolean)).toBe(true);
  });
});

describe("IDM stays percussive", () => {
  it("caps decay at 250 ms and loads old PING sets", () => {
    expect(IDM_MAX_DECAY).toBe(.25);
    expect(idmParams({ model: "metl", decay: 3 }).decay).toBe(.25);
    expect(idmParams({ model: "ping" as never }).model).toBe("zap");
  });
});

describe("XY TIGHT is plucky", () => {
  it("full TIGHT shortens decay and drops sustain", () => {
    const s = pad, synth = { ...s, engine: "synth" as const, xy: { x: -1, y: 0 } };
    const base = applyXY({ ...synth, xy: { x: 0, y: 0 } }).synth.clean!, tight = applyXY(synth).synth.clean!;
    expect(tight.env.d).toBeLessThan(base.env.d / 4);
    expect(tight.env.s).toBeLessThan(base.env.s * .2 + 1e-9);
  });
  it("hat opens to a long decay", () => {
    const s = pad, hat = { ...s, engine: "drum" as const, drum: { ...s.drum, kind: "hat" as const, env: { a: .001, d: .06, s: 0, r: .02 } }, xy: { x: 1, y: 0 } };
    expect(applyXY(hat).drum.env.d).toBeGreaterThan(.5);
  });
});

