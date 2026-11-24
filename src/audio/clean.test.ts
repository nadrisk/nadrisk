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
describe("SYN drive", () => {
  const rig = (drive: number) => {
    const param = () => ({ value: 0, setValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
    const node = () => ({ connect: vi.fn().mockReturnThis(), disconnect: vi.fn() });
    const shapers: { curve: unknown }[] = [], gains: { gain: { value: number } }[] = [];
    const ctx = {
      currentTime: 0,
      createGain: () => { const g = { ...node(), context: ctx, gain: param() }; gains.push(g); return g; },
      createWaveShaper: () => { const s = { ...node(), curve: null as unknown }; shapers.push(s); return s; },
      createBiquadFilter: () => ({ ...node(), frequency: param(), Q: param(), detune: param() }),
      createStereoPanner: () => ({ ...node(), pan: param() }),
      createOscillator: () => ({ ...node(), frequency: param(), detune: param(), start: vi.fn(), stop: vi.fn(), onended: null }),
      createConstantSource: () => ({ ...node(), offset: param(), start: vi.fn(), stop: vi.fn() }),
    };
    playClean(ctx as unknown as BaseAudioContext, node() as unknown as AudioNode, { ...defaultClean(), drive }, 60, 0, 1);
    return { shapers, gains };
  };

  it("leaves the shaper flat and the trims at unity when DRIVE is 0", () => {
    const { shapers, gains } = rig(0);
    expect(shapers[0].curve).toBeNull();
    expect(gains[2].gain.value).toBe(1); // mix: no boost
    expect(gains[3].gain.value).toBe(1); // post: no trim
  });

  it("shapes and compensates when DRIVE is up", () => {
    const { shapers, gains } = rig(.5);
    expect(shapers[0].curve).not.toBeNull();
    expect(gains[2].gain.value).toBe(2); // mix boost 1 + drive*2
    expect(gains[3].gain.value).toBeCloseTo(1 / 1.6); // post trim
  });
});
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
    expect(pitch.stop.mock.calls.at(-1)?.[0]).toBeCloseTo(.24);
    vi.runAllTimers();
    expect(pitch.disconnect).toHaveBeenCalledTimes(1);
  });
});