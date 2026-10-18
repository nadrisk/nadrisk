import { describe, it, expect, vi, afterEach } from "vitest";
import { wavBytes, trimStart, barsSec, concat, requestInputStream, inputError } from "./liveInput";

describe("live input helpers", () => {
  it("encodes a WAV with the right size and header", () => {
    const b = wavBytes([new Float32Array([0, .5, -1]), new Float32Array([0, .5, 1])], 48000);
    const v = new DataView(b);
    expect(b.byteLength).toBe(44 + 12);
    expect(v.getUint32(24, true)).toBe(48000);
    expect(v.getInt16(44 + 4 * 2, true)).toBe(-32768);
  });
  it("trims input delay and bar length", () => {
    expect(trimStart(new Float32Array(1000), .01, 48000).length).toBe(520);
    expect(barsSec(2, 120)).toBe(4);
    expect(Array.from(concat([new Float32Array([1, 2]), new Float32Array([3])], 3))).toEqual([1, 2, 3]);
  });
});

describe("microphone arming", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("switches Safari to play-and-record before requesting the microphone", async () => {
    const session = { type: "playback" }, stream = {} as MediaStream;
    const getUserMedia = vi.fn(() => { expect(session.type).toBe("play-and-record"); return Promise.resolve(stream); });
    vi.stubGlobal("navigator", { audioSession: session, mediaDevices: { getUserMedia } });
    expect(await requestInputStream()).toBe(stream);
    expect(getUserMedia).toHaveBeenCalledWith({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  });
  it("restores playback on denied capture", async () => {
    const session = { type: "playback" };
    vi.stubGlobal("navigator", { audioSession: session, mediaDevices: { getUserMedia: () => Promise.reject(new DOMException("Denied", "NotAllowedError")) } });
    await expect(requestInputStream()).rejects.toMatchObject({ name: "NotAllowedError" });
    expect(session.type).toBe("playback");
  });
  it("distinguishes microphone permission from busy hardware", () => {
    expect(inputError({ name: "NotAllowedError" })).toBe("MIC BLOCKED");
    expect(inputError({ name: "NotReadableError" })).toBe("MIC BUSY");
    expect(inputError({ name: "NotFoundError" })).toBe("NO MIC FOUND");
  });
});
