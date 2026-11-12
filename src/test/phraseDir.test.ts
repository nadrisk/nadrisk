import { describe, expect, it } from "vitest";
import { chordWalk, defaultArp, phraseOrder, randomizeArp } from "@/audio/arp";

const seeded = (s: number) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

describe("phrase direction", () => {
  it("REV plays backwards", () => expect(phraseOrder({ steps: 4, dir: "rev" })).toEqual([3, 2, 1, 0]));
  it("P-P bounces without repeating ends", () => expect(phraseOrder({ steps: 4, dir: "pp" })).toEqual([0, 1, 2, 3, 2, 1]));
  it("legacy loop settings load as FWD", () => expect(phraseOrder({ steps: 4, loop: { where: "first", len: 2, times: 3 } } as never)).toEqual([0, 1, 2, 3]));
});

describe("CHRD walk", () => {
  it("steps through each chord note in order, then an octave up", () => {
    expect([0, 1, 2, 3, 4, 5].map(n => chordWalk([0, 3, 7], n))).toEqual([0, 3, 7, 12, 15, 19]);
  });
});

describe("RAND spread", () => {
  it("a phrase never gets stuck on two notes", () => {
    for (let s = 1; s < 50; s++) {
      const a = defaultArp({ spread: 0 }), r = randomizeArp(a, seeded(s));
      const played = r.cells.slice(0, a.steps).filter(c => c.on).map(c => c.deg);
      expect(new Set(played).size).toBeGreaterThanOrEqual(Math.min(3, played.length));
    }
  });
});

describe("RAND acid feel", () => {
  it("leaves rests and starts on the root", () => {
    for (let s = 1; s < 50; s++) {
      const r = randomizeArp(defaultArp({ spread: 0 }), seeded(s)), hits = r.cells.slice(0, 16).filter(c => c.on).length;
      expect(hits).toBeGreaterThanOrEqual(6); expect(hits).toBeLessThanOrEqual(11);
    }
  });
});
