import { describe, it, expect } from "vitest";
import { adsr, holdAt } from "./voices";
import { arpNote } from "./musical";
import { phraseOrder } from "./arp";

const rec = () => { const ev: [string, number, number][] = []; const p = { value: 0, setValueAtTime: (v: number, t: number) => ev.push(["set", v, t]), linearRampToValueAtTime: (v: number, t: number) => ev.push(["ramp", v, t]), setTargetAtTime: (v: number, t: number) => ev.push(["target", v, t]), cancelAndHoldAtTime: (t: number) => ev.push(["hold", 0, t]), cancelScheduledValues: (t: number) => ev.push(["cancel", 0, t]) }; return { p: p as unknown as AudioParam, ev }; };

describe("synth envelope", () => {
  it("a note shorter than its attack releases at its gate from the reached level", () => {
    const { p, ev } = rec(); adsr(p, 0, { a: .5, d: .2, s: .5, r: .1 }, .1, 1);
    expect(ev[1][0]).toBe("ramp"); expect(ev[1][1]).toBeCloseTo(.2); expect(ev[1][2]).toBeCloseTo(.1);
    expect(ev[2]).toEqual(["target", 0, .1]);
  });
  it("stopping holds the current level instead of jumping", () => {
    const { p, ev } = rec(); holdAt(p, 1); expect(ev).toEqual([["hold", 0, 1]]);
  });
});

describe("Crave arp modes", () => {
  const c = [60, 64, 67];
  const run = (m: Parameters<typeof arpNote>[0], n: number) => Array.from({ length: n }, (_, k) => arpNote(m, k, c));
  it("UP1", () => expect(run("up", 4)).toEqual([60, 64, 67, 60]));
  it("UP2", () => expect(run("up2", 7)).toEqual([60, 64, 67, 72, 76, 79, 60]));
  it("DN1", () => expect(run("down", 3)).toEqual([67, 64, 60]));
  it("DN2", () => expect(run("down2", 6)).toEqual([79, 76, 72, 67, 64, 60]));
  it("U/D1 repeats the ends", () => expect(run("updown1", 6)).toEqual([60, 64, 67, 67, 64, 60]));
  it("U/D2 does not repeat the ends", () => expect(run("updown", 5)).toEqual([60, 64, 67, 64, 60]));
  it("ORDR keeps chord-shape order", () => expect(Array.from({ length: 3 }, (_, k) => arpNote("order", k, c, [67, 60, 64]))).toEqual([67, 60, 64]));
  it("phrase U/D1 repeats ends", () => expect(phraseOrder({ steps: 3, dir: "pp1" })).toEqual([0, 1, 2, 2, 1, 0]));
});
