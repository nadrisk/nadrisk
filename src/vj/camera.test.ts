import { afterEach, describe, expect, it, vi } from "vitest";
import { VjCamera } from "./camera";
import { ditherCamera, meterDb, noteName } from "./raster";
import { VjEngine } from "./engine";

afterEach(() => vi.restoreAllMocks());

function media() {
  const stop = vi.fn(), track = { stop, addEventListener: vi.fn() };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  return { stream, stop };
}

describe("CAM privacy and raster", () => {
  it("requests video only and stops every track on exit", async () => {
    const { stream, stop } = media(), get = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: get } });
    const camera = new VjCamera(); await camera.start();
    expect(get.mock.calls[0][0]).toEqual({ audio: false, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
    expect(camera.status).toBe("live");
    camera.stop(); expect(stop).toHaveBeenCalledOnce(); expect(camera.video.srcObject).toBeNull();
  });
  it("stops a late permission response after CAM has been left", async () => {
    const { stream, stop } = media(); let resolve: ((s: MediaStream) => void) | undefined;
    const pending = new Promise<MediaStream>(r => { resolve = r; });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: () => pending } });
    const camera = new VjCamera(), opening = camera.start(); camera.stop(); resolve?.(stream); await opening;
    expect(stop).toHaveBeenCalledOnce(); expect(camera.status).toBe("off"); expect(camera.video.srcObject).toBeNull();
  });
  it("handles permission denial and allows retry", async () => {
    const { stream } = media(), get = vi.fn().mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError")).mockResolvedValueOnce(stream);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: get } });
    const camera = new VjCamera(); await camera.start(); expect(camera.status).toBe("denied");
    await camera.start(); expect(camera.status).toBe("live"); camera.stop();
  });
  it("uses exactly two theme colours with the same 8x8 half-tone threshold", () => {
    const data = new Uint8ClampedArray(8 * 8 * 4).fill(128), out = new Uint32Array(64);
    ditherCamera(data, out, 8, 8, 123, 456);
    expect(new Set(out)).toEqual(new Set([123, 456]));
    expect(Array.from(out).filter(v => v === 123)).toHaveLength(32);
    const quiet = Array.from(out); ditherCamera(data, out, 8, 8, 123, 456, 1);
    expect(Array.from(out).filter(v => v === 123).length).toBeGreaterThan(quiet.filter(v => v === 123).length);
  });
  it("retains actual pad notes and measured output values for CAM", () => {
    const engine = new VjEngine(), pad = { index: 3, name: "ACID", role: "bass", engine: "808", notes: [37, 40, 44] };
    engine.hit("tone", .7, pad); engine.signal([0, .5], 8, 138, true, .5, .25, 7, "B");
    expect(engine.pad).toEqual(pad); expect(engine.velocity).toBe(.7);
    expect([engine.peak, engine.rms, engine.step, engine.bank]).toEqual([.5, .25, 7, "B"]);
    expect(noteName(37)).toBe("C#2"); expect(meterDb(.5)).toBeCloseTo(-6.0206);
  });
});