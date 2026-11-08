import { describe, it, expect } from "vitest";
import { isResetTap } from "./reset";
import { DECK_HOME, MIX_HOME } from "./deck";
describe("mixer reset", () => {
  it("recognizes two nearby taps within 320ms", () => expect(isResetTap({ time: 100, x: 5, y: 18 }, { time: 300, x: 5, y: 18 })).toBe(true));
  it("does not reset after a slow second tap", () => expect(isResetTap({ time: 100, x: 5, y: 18 }, { time: 421, x: 5, y: 18 })).toBe(false));
  it("does not mistake a drag for a double tap", () => expect(isResetTap({ time: 100, x: 0, y: 0 }, { time: 200, x: 50, y: 0 })).toBe(false));
  it("resets filter to neutral zero", () => expect(DECK_HOME.filter).toBe(0));
  it("resets crossfader to centre zero", () => expect(MIX_HOME.xf).toBe(0));
  it("resets channel fader to full level", () => expect(DECK_HOME.gain).toBe(1));
  it("resets all EQ bands to flat", () => expect([DECK_HOME.low, DECK_HOME.mid, DECK_HOME.high]).toEqual([1, 1, 1]));
});