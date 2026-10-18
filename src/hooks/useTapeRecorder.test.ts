import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTapeRecorder } from "./useTapeRecorder";
const fake = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn(() => ({ l: [], r: [], frames: 48000, rate: 48000 })), seconds: vi.fn(() => 2), dispose: vi.fn() }));
vi.mock("@/audio/tape", () => ({ createTape: vi.fn(async () => fake), encodeWav: vi.fn(() => new Blob()), encodeMp3: vi.fn(), MAX_TAPE_SEC: 600 }));
describe("persistent tape capture", () => {
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
  it("keeps recording across shell updates and releases only on shell unmount", async () => {
    vi.useFakeTimers(); fake.dispose.mockClear();
    vi.stubGlobal("URL", { createObjectURL: () => "blob:test", revokeObjectURL: vi.fn() });
    const source = async () => ({ ctx: {} as BaseAudioContext, node: {} as AudioNode });
    const hook = renderHook(({ step }) => useTapeRecorder(source, false, step, 120, vi.fn()), { initialProps: { step: 0 } });
    await act(async () => { await hook.result.current.record(); });
    act(() => { vi.advanceTimersByTime(1100); });
    expect(hook.result.current.state).toBe("rec");
    hook.rerender({ step: 17 });
    expect(hook.result.current.state).toBe("rec"); expect(fake.dispose).not.toHaveBeenCalled();
    act(() => hook.result.current.stop());
    expect(hook.result.current.take?.frames).toBe(48000);
    hook.unmount(); expect(fake.dispose).toHaveBeenCalledOnce(); vi.unstubAllGlobals();
  });
});