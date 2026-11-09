import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { VjEngine } from "./engine";
import { avPerformance } from "./performance";
import { vjKindOf } from "./bus";

beforeAll(() => {
  vi.stubGlobal("ImageData", class { data: Uint8ClampedArray; constructor(w: number, h: number) { this.data = new Uint8ClampedArray(w * h * 4); } });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
afterAll(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function captured() {
  const engine = new VjEngine();
  engine.setPerformance(avPerformance({ echoSend: 1 }));
  engine.signal([], 0, 120, true);
  engine.performanceFrames.apply(new Uint32Array(64).fill(0xffffffff), 8, 8, engine.perf, 0, 120, 0xff000000, 0xffffffff, true);
  expect(engine.performanceFrames.frames).toBe(1);
  return engine;
}
describe("AV lifecycle hard gates", () => {
  it("bass pads send a dedicated bass reaction", () => {
    expect(vjKindOf("bass", "synth")).toBe("bass");
    expect(vjKindOf("tone", "808")).toBe("bass");
    expect(vjKindOf("tone", "pad")).toBe("tone");
  });
  it("transport stop clears captured feedback on receipt", () => {
    const engine = captured(); engine.signal([], 0, 120, false);
    expect(engine.performanceFrames.frames).toBe(0);
  });
  it("zero send clears captured feedback before another frame", () => {
    const engine = captured(); engine.setPerformance(avPerformance({ echoSend: 0 }));
    expect(engine.performanceFrames.frames).toBe(0);
  });
  it("stutter release discards captured frames before another frame", () => {
    const engine = new VjEngine(); engine.setPerformance(avPerformance({ mode: 2 }));
    engine.performanceFrames.apply(new Uint32Array(64), 8, 8, engine.perf, 0, 120, 0xff000000, 0xffffffff, true);
    expect(engine.performanceFrames.frames).toBe(1); engine.setPerformance(avPerformance({ mode: 0 }));
    expect(engine.performanceFrames.frames).toBe(0);
  });
  it("missing heartbeat clears feedback and stops transport after 300 ms", () => {
    const engine = captured(), canvas = document.createElement("canvas");
    // The canvas context stub skips drawing, not the lifecycle gates.
    for (let i = 0; i < 7; i++) engine.frame(canvas, 0xffffffff, 0xff000000, .05);
    expect(engine.running).toBe(false); expect(engine.performanceFrames.frames).toBe(0);
  });
  it("hidden page clears history even with current running signals", () => {
    const engine = captured();
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    try { engine.frame(document.createElement("canvas"), 0xffffffff, 0xff000000, .01); expect(engine.performanceFrames.frames).toBe(0); }
    finally { Object.defineProperty(document, "hidden", { configurable: true, value: false }); }
  });
});