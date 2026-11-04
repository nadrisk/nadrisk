import { describe, it, expect } from "vitest";
import { tieSpan } from "@/audio/tie";
import { spreadDeg } from "@/audio/arp";

describe("double-tap tie", () => {
  it("fills the gap from the previous note to the tapped note", () => {
    expect(tieSpan([1, 0, 0, 0, 1, 0], 4)).toEqual([1, 2, 2, 2, 2, 0]);
  });
  it("swallows notes in between", () => {
    expect(tieSpan([1, 0, 1, 1, 0, 1], 5)).toEqual([1, 0, 1, 1, 2, 2]);
    expect(tieSpan([1, 1, 0, 1], 3)).toEqual([1, 1, 2, 2]);
  });
  it("does nothing without an earlier note", () => {
    expect(tieSpan([0, 0, 1, 0], 2)).toBeNull();
  });
  it("leaves an existing tie alone", () => {
    expect(tieSpan([1, 2, 2], 2)).toBeNull();
  });
});

describe("live phrase spread", () => {
  it("plays the pattern as written at 50%", () => {
    expect([0, 2, 4, 7].map(d => spreadDeg(d, .5))).toEqual([0, 2, 4, 7]);
  });
  it("collapses to the root at 0 and doubles at 100%", () => {
    expect(spreadDeg(4, 0)).toBe(0);
    expect(spreadDeg(4, 1)).toBe(8);
  });
});

import { tieSpan as tieSpan2 } from "@/audio/tie";
import { it as it2, expect as expect2 } from "vitest";
it2("ties from an earlier note to an empty step", () => {
  expect2(tieSpan2([1, 0, 0, 0, 0, 0], 4)).toEqual([1, 2, 2, 2, 2, 0]);
});
