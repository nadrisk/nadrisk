import { describe, it, expect } from "vitest";
import { noteCents, isSlotMono } from "./pitchFmt";

describe("pitchFmt", () => {
  it("reads notes and cents", () => {
    expect(noteCents(440)).toBe("A4");
    expect(noteCents(445)).toBe("A4+20c");
  });
  it("only mono pads glide", () => {
    expect(isSlotMono({ engine: "synth", synthVoices: 1 })).toBe(true);
    expect(isSlotMono({ engine: "synth", synthVoices: 8 })).toBe(false);
    expect(isSlotMono({ engine: "808" })).toBe(true);
    expect(isSlotMono({ engine: "sampler", samplerMode: "one" })).toBe(true);
    expect(isSlotMono({ engine: "sampler", samplerMode: "adsr" })).toBe(false);
    expect(isSlotMono({ engine: "idm" })).toBe(false);
  });
});
