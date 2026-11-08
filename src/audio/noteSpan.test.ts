import { describe, it, expect } from "vitest";
import { setSpan, spanOf } from "./noteSpan";
const r = (s: string) => s.split("").map(Number) as (0 | 1 | 2)[];
describe("noteSpan", () => {
  it("stretches", () => expect(setSpan(r("10000000"), 0, 4)).toEqual(r("12220000")));
  it("shrinks to 1", () => expect(setSpan(r("12220000"), 0, 1)).toEqual(r("10000000")));
  it("stops before the next note", () => expect(setSpan(r("10010000"), 0, 8)).toEqual(r("12210000")));
  it("stops at row length", () => expect(spanOf(setSpan(r("00001000"), 4, 9, 6)!, 4, 6)).toBe(2));
  it("ignores non-hits", () => expect(setSpan(r("00000000"), 0, 3)).toBeNull());
});

import { setSpan as setSpanAbs } from "./noteSpan";
describe("absorb drag", () => {
  it("normal drag stops before next note", () => { expect(setSpanAbs([1,0,1,0] as any, 0, 4)).toEqual([1,2,1,0]); });
  it("held drag absorbs notes and keeps remainder", () => { expect(setSpanAbs([1,0,1,2,2,0] as any, 0, 4, 6, true)).toEqual([1,2,2,2,1,0]); });
});
