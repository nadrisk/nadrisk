import { describe, expect, it } from "vitest";
import { framePair, harmonics, parseWav, toFrames, FRAME } from "./wavetable";

const wav = (samples: Float32Array, clm?: number) => {
  const extra = clm ? 8 + 16 : 0, b = new ArrayBuffer(44 + extra + samples.length * 2), v = new DataView(b); let o = 0;
  const s = (x: string) => { for (const c of x) v.setUint8(o++, c.charCodeAt(0)); };
  s("RIFF"); v.setUint32(o, b.byteLength - 8, true); o += 4; s("WAVEfmt "); v.setUint32(o, 16, true); o += 4;
  v.setUint16(o, 1, true); v.setUint16(o + 2, 1, true); v.setUint32(o + 4, 44100, true); v.setUint32(o + 8, 88200, true); v.setUint16(o + 12, 2, true); v.setUint16(o + 14, 16, true); o += 16;
  if (clm) { s("clm "); v.setUint32(o, 16, true); o += 4; s(`<!>${clm}`.padEnd(16, " ")); }
  s("data"); v.setUint32(o, samples.length * 2, true); o += 4; samples.forEach(x => { v.setInt16(o, Math.round(x * 32767), true); o += 2; });
  return b;
};

describe("wavetable", () => {
  it("splits a 2048-sample table into frames", () => {
    const d = new Float32Array(FRAME * 4).map((_, i) => Math.sin(i / FRAME * Math.PI * 2));
    expect(toFrames(parseWav(wav(d)).data)).toHaveLength(4);
  });
  it("honours Serum clm frame size", () => {
    const d = new Float32Array(1024 * 3).map((_, i) => Math.sin(i / 1024 * Math.PI * 2));
    const r = parseWav(wav(d, 1024)); expect(r.frameSize).toBe(1024);
    const f = toFrames(r.data, r.frameSize); expect(f).toHaveLength(3); expect(f[0]).toHaveLength(FRAME);
  });
  it("a sine frame has energy only in harmonic 1", () => {
    const f = new Float32Array(FRAME).map((_, i) => Math.sin(i / FRAME * Math.PI * 2)), h = harmonics(f);
    expect(h.imag[1]).toBeCloseTo(1, 3); expect(Math.abs(h.imag[2])).toBeLessThan(1e-6);
  });
  it("keeps each frame on oscillator k % 2 with equal-power weights", () => {
    const a = framePair(0.5, 5); expect(a.frames).toEqual([2, 3]); expect(a.weights[0]).toBeCloseTo(1);
    const b = framePair(0.6, 5); expect(b.frames).toEqual([2, 3]); expect(b.weights[0] ** 2 + b.weights[1] ** 2).toBeCloseTo(1);
    const c = framePair(0.8, 5); expect(c.frames[1]).toBe(3); expect(c.frames[0]).toBe(4);
  });
});
