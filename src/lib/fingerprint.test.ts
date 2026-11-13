import { describe, expect, it } from "vitest";
import { inputSignal } from "./fingerprint";

describe("hidden input signals", () => {
  it("retains the seven-character mode trigger", () => {
    expect(inputSignal("nadrisk")).toBe(1);
    expect(inputSignal("nadris")).toBe(0);
    expect(inputSignal("nadrisx")).toBe(0);
  });
  it("retains the four-character suffix trigger", () => {
    expect(inputSignal("acid")).toBe(2);
    expect(inputSignal("xyzacid")).toBe(2);
    expect(inputSignal("acix")).toBe(0);
  });
});