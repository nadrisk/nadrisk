import { describe, it, expect } from "vitest";
import { defaultLaser, laserParams, laserPitchAt, laserEnvelopeAt } from "./laser";
import { defaultSiren } from "./voices";

describe("LASER pitch envelope", () => {
  for (const amount of [-24, 0, 24]) {
    it(`starts at ${amount} semitones and returns exactly to root`, () => {
      expect(laserPitchAt(amount, 0, 3)).toBe(amount);
      expect(laserPitchAt(amount, 1, 3)).toBe(0);
      expect(laserPitchAt(amount, 2, 3)).toBe(0);
      expect(Math.abs(laserPitchAt(amount, .5, 3))).toBeLessThanOrEqual(Math.abs(amount));
    });
  }
  it("keeps older sirens in DUB and fills missing laser settings", () => {
    expect(defaultSiren().mode ?? "dub").toBe("dub");
    expect(laserParams()).toEqual(defaultLaser());
    expect(laserParams({ detune: 70 }).env).toEqual(defaultLaser().env);
    expect(laserParams({ amount: -12 }).amount).toBe(-12);
  });
  it("bounds imported envelope amount and changes curvature monotonically", () => {
    expect(laserPitchAt(100, 0, 3)).toBe(24);
    expect(laserPitchAt(-100, 0, 3)).toBe(-24);
    expect(laserPitchAt(24, .5, 5)).toBeLessThan(laserPitchAt(24, .5, 1));
  });
  it("uses the chosen starting patch while preserving old attack behavior", () => {
    expect(defaultLaser()).toMatchObject({ detune: 25, tone: 12000, amount: 24, attack: .01, decay: .75, curve: 4.8, env: { a: .001, d: .18, s: 1, r: .3 } });
    expect(laserParams({ amount: 12 }).attack).toBe(0);
    expect(laserParams({ attack: .025 }).attack).toBe(.025);
  });
  for (const attack of [0, .01, .1]) for (const amount of [-24, 0, 24]) {
    it(`bounds the ${attack}s attack at ${amount} semitones`, () => {
      const p = { ...defaultLaser(), attack, amount };
      expect(laserEnvelopeAt(p, 0)).toBe(attack ? 0 : amount);
      expect(laserEnvelopeAt(p, attack)).toBe(amount);
      expect(laserEnvelopeAt(p, attack + p.decay)).toBe(0);
      for (let i = 0; i <= 100; i++) expect(Math.abs(laserEnvelopeAt(p, i / 100))).toBeLessThanOrEqual(Math.abs(amount));
      if (attack) expect(laserEnvelopeAt(p, attack / 2)).toBeCloseTo(amount / 2, 10);
    });
  }
});