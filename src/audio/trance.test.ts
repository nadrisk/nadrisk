import { describe, expect, it } from "vitest";
import { trancePhrase, defaultTrance } from "./arp";
describe("trance phrases", () => {
  it("ROLL rests on every downbeat and keeps 16 steps", () => {
    const c = trancePhrase("minor", defaultTrance());
    expect(c).toHaveLength(16); [0, 4, 8, 12].forEach(i => expect(c[i].on).toBe(false)); expect(c[1].on).toBe(true);
  });
  it("density 0 keeps only downbeats", () => {
    const c = trancePhrase("minor", { ...defaultTrance(), pattern: 2, density: 0 });
    c.forEach((s, i) => expect(s.on).toBe(i % 4 === 0));
  });
});
