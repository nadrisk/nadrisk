import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultClean, playClean } from "./clean";

function fixture() {
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
  const node = () => ({ connect: vi.fn().mockReturnThis(), disconnect: vi.fn() });
  const oscillators: ReturnType<typeof osc>[] = [];
  const osc = () => ({ ...node(), frequency: param(), detune: param(), start: vi.fn(), stop: vi.fn(), onended: null });
  const pitch = { ...node(), offset: param(), start: vi.fn(), stop: vi.fn() };
  const ctx = {
    currentTime: .125,
    createGain: () => ({ ...node(), context: ctx, gain: param() }),
    createWaveShaper: node,
    createBiquadFilter: () => ({ ...node(), frequency: param(), Q: param(), detune: param() }),
    createStereoPanner: () => ({ ...node(), pan: param() }),
    createOscillator: () => { const o = osc(); oscillators.push(o); return o; },
    createConstantSource: vi.fn(() => pitch),
  };
  const clean = { ...defaultClean(), pAmt: 12, pDec: .5 };
  const voice = playClean(ctx as unknown as BaseAudioContext, node() as unknown as AudioNode, clean, 60, .1, 1);
  return { ctx, clean, voice, pitch, oscillators };
}

afterEach(() => vi.useRealTimers());
describe("SYN pitch decay", () => {
  it("preserves a 12-semitone, 500ms decay through full-patch live edits", () => {
    vi.useFakeTimers();
    const { clean, voice, pitch, oscillators } = fixture();
    expect(pitch.offset.setValueAtTime).toHaveBeenCalledWith(1200, .1);
    expect(pitch.offset.setTargetAtTime).toHaveBeenCalledWith(0, .1, .125);
    expect(pitch.start).toHaveBeenCalledWith(.1);
    expect(pitch.connect).toHaveBeenCalledTimes(9); // Eight basic oscillators + sub.
    for (const o of oscillators) expect(pitch.connect).toHaveBeenCalledWith(o.detune);
    voice.update?.({ clean: { ...clean, wave: 1, cutoff: 2400 } });
    expect(pitch.offset.setTargetAtTime).toHaveBeenCalledTimes(1);
    for (const o of oscillators) expect(o.detune.setTargetAtTime).not.toHaveBeenCalled();
  });

  it("changes stereo detune independently and stops the pitch signal with the voice", () => {
    vi.useFakeTimers();
    const { clean, voice, pitch, oscillators } = fixture();
    voice.update?.({ clean: { ...clean, detune: .5 } });
    expect(oscillators[0].detune.setTargetAtTime).toHaveBeenCalledWith(-14, .125, .01);
    expect(oscillators[1].detune.setTargetAtTime).toHaveBeenCalledWith(14, .125, .01);
    expect(oscillators[8].detune.setTargetAtTime).not.toHaveBeenCalled();
    expect(pitch.offset.setTargetAtTime).toHaveBeenCalledTimes(1);
    voice.stop(.2);
    expect(pitch.stop).toHaveBeenLastCalledWith(.24);
    vi.runAllTimers();
    expect(pitch.disconnect).toHaveBeenCalledTimes(1);
  });
});