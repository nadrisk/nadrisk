import { describe, expect, it, vi } from "vitest";
import { keysCutoff, padFromPreset, playPad } from "./pad";
import { applyXY } from "./xyMaps";
import type { Slot } from "@/hooks/useGroovebox";

vi.mock("./pianoSamples", () => ({ pianoBuffers: () => new Map([[60, {}]]), pianoPick: () => ({ root: 60, rate: 1 }), preloadPiano: async () => {} }));

function graph() {
  const nodes: any[] = [];
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
  const ctx: any = { currentTime: 0 };
  const make = (kind: string) => { const node: any = { kind, context: ctx, gain: param(), frequency: param(), Q: param(), pan: param(), detune: param(), playbackRate: param(), connect: vi.fn((to: any) => to), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() }; nodes.push(node); return node; };
  for (const kind of ["Gain", "WaveShaper", "BiquadFilter", "StereoPanner", "Oscillator", "ConstantSource", "BufferSource"]) ctx[`create${kind}`] = () => make(kind);
  return { ctx, nodes };
}

describe.each([12, 13])("piano controls preset %i", preset => {
  it("BRT sweeps from a dark 800 Hz to an open 14 kHz", () => {
    const p = padFromPreset(preset);
    expect(keysCutoff(p, 1)).toBe(800);
    expect(keysCutoff({ ...p, bright: 1 }, 1)).toBe(14000);
  });
  it("AGE modulates sample or FM pitch, and returns to neutral on a ringing note", () => {
    const { ctx, nodes } = graph(), p = padFromPreset(preset);
    const voice = playPad(ctx, ctx.createGain(), p, 60, 0, 1);
    const lfos = nodes.filter(n => n.kind === "Oscillator" && n.frequency.value < 10);
    expect(lfos).toHaveLength(2);
    const gains = lfos.map(n => n.connect.mock.calls[0][0]);
    expect(gains.map(n => n.gain.setValueAtTime.mock.calls[0][0])).toEqual([0, 0]);
    voice.update?.({ pad: { age: 1 } } as never);
    expect(gains.map(n => n.gain.setTargetAtTime.mock.calls.at(-1)[0])).toEqual([24, 9]);
    const pitched = nodes.filter(n => preset === 12 ? n.kind === "BufferSource" : n.kind === "Oscillator" && n.frequency.value >= 10);
    expect(pitched.length).toBeGreaterThan(0);
    for (const node of pitched) {
      if (preset !== 12) { expect(gains[0].connect).toHaveBeenCalledWith(node.detune); continue; }
      // Buffer sources have no detune: AGE reaches playbackRate through a cents-to-rate gain.
      const scale = nodes.find(n => n.kind === "Gain" && n.connect.mock.calls.some((c: any[]) => c[0] === node.playbackRate));
      expect(scale).toBeTruthy(); expect(gains[0].connect).toHaveBeenCalledWith(scale);
    }
    voice.update?.({ pad: { age: 0 } } as never);
    expect(gains.map(n => n.gain.setTargetAtTime.mock.calls.at(-1)[0])).toEqual([0, 0]);
  });
  it("attack controls the actual gain envelope rather than a fixed 2 ms strike", () => {
    const { ctx, nodes } = graph();
    playPad(ctx, ctx.createGain(), { ...padFromPreset(preset), atk: .6 }, 60, 0, 1);
    expect(nodes.some(n => n.gain.linearRampToValueAtTime.mock.calls.some((c: number[]) => c[1] === .6))).toBe(true);
  });
  it("live BRT and AGE update the ringing piano tone without retriggering", () => {
    const { ctx, nodes } = graph();
    const voice = playPad(ctx, ctx.createGain(), padFromPreset(preset), 60, 0, 1);
    const filter = nodes.find(n => n.kind === "BiquadFilter");
    voice.update?.({ pad: { bright: 1 } } as never);
    expect(filter.frequency.setTargetAtTime).toHaveBeenLastCalledWith(14000, 0, .04);
    voice.update?.({ pad: { age: 1 } } as never);
    expect(filter.frequency.setTargetAtTime.mock.calls.at(-1)[0]).toBeCloseTo(6300);
  });
  it("XY keeps the centre unchanged and rings long at the top edge with an instant attack", () => {
    const s = { engine: "pad", pad: padFromPreset(preset), xy: { x: 0, y: 0 } } as Slot;
    expect(applyXY(s)).toBe(s);
    const moved = applyXY({ ...s, xy: { x: 1, y: 1 } }).pad;
    expect(moved?.bright).toBe(1);
    expect(moved?.atk).toBe(.002);
    expect(moved?.rel).toBeCloseTo(6.5);
  });
});