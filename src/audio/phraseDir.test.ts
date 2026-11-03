import { describe, expect, it } from "vitest";
import { chordWalk, defaultArp, phraseOrder, randomizeArp } from "./arp";

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
  it("low SPRD moves at most one scale step between neighbours", () => {
    for (let s = 1; s < 30; s++) {
      const c = randomizeArp(defaultArp({ spread: 0 }), seeded(s)).cells;
      for (let i = 1; i < c.length; i++) expect(Math.abs(c[i].deg - c[i - 1].deg)).toBeLessThanOrEqual(2);
    }
  });
  it("a phrase never gets stuck on two notes", () => {
    for (let s = 1; s < 50; s++) {
      const a = defaultArp({ spread: 0 }), r = randomizeArp(a, seeded(s));
      const played = r.cells.slice(0, a.steps).filter(c => c.on).map(c => c.deg);
      expect(new Set(played).size).toBeGreaterThanOrEqual(Math.min(3, played.length));
    }
  });
});
