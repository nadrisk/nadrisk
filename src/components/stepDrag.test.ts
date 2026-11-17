import { expect, it } from "vitest";
import { draggedValue, inLengthGrip } from "./stepDrag";
it("does not jump on touch down or inside the four-pixel deadzone", () => {
  expect(draggedValue(.7, 0)).toBe(.7);
  expect(draggedValue(.7, 4)).toBe(.7);
});
it("adjusts by one percent over small deliberate movements", () => {
  expect(draggedValue(.5, 9)).toBe(.51);
  expect(draggedValue(.5, -9)).toBe(.49);
});
it("steps pitch by one degree without percentage rounding", () => {
  expect(draggedValue(.5, 23, 24)).toBe(13 / 24);
});
it("makes the right half accessible on phones and twelve pixels on desktop", () => {
  expect(inLengthGrip(16, 8, false)).toBe(true);
  expect(inLengthGrip(16, 9, false)).toBe(false);
  expect(inLengthGrip(40, 12, true)).toBe(true);
  expect(inLengthGrip(40, 13, true)).toBe(false);
});