import { describe, it, expect } from "vitest";
import { encodeWav, trimStart, barsSec, concat } from "./liveInput";

describe("live input helpers", () => {
  it("encodes a WAV with the right size and header", async () => {
    const b = encodeWav([new Float32Array([0, .5, -1]), new Float32Array([0, .5, 1])], 48000);
    const v = new DataView(await b.arrayBuffer());
    expect(b.size).toBe(44 + 12);
    expect(v.getUint32(24, true)).toBe(48000);
    expect(v.getInt16(44 + 4 * 2, true)).toBe(-32768);
  });
  it("trims input delay and bar length", () => {
    expect(trimStart(new Float32Array(1000), .01, 48000).length).toBe(520);
    expect(barsSec(2, 120)).toBe(4);
    expect(Array.from(concat([new Float32Array([1, 2]), new Float32Array([3])], 3))).toEqual([1, 2, 3]);
  });
});
