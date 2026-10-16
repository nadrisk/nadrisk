import { describe, expect, it, vi } from "vitest";
import { ACID_WORKLET, acidParams, defaultAcid, playAcid } from "./acid";
const { createWorklet } = vi.hoisted(() => ({ createWorklet: vi.fn() }));
vi.mock("tone", () => ({ getContext: () => ({ createAudioWorkletNode: createWorklet }) }));

type Processor = { process: (input: Float32Array[][], output: Float32Array[][], params: Record<string, Float32Array>) => boolean };
function filter() {
  let ctor: (new () => Processor) | undefined;
  new Function("AudioWorkletProcessor", "registerProcessor", "sampleRate", ACID_WORKLET)(class {}, (_: string, c: new () => Processor) => { ctor = c; }, 48000);
  if (!ctor) throw new Error("Missing filter registration");
  return new ctor();
}
describe("acid", () => {
  it("resets pooled energy at the exact scheduled sample", () => {
    const used = filter(), x = new Float32Array(128).fill(.4);
    const params = { cutoff: new Float32Array([320]), res: new Float32Array([.95]), drive: new Float32Array([.24]), generation: new Float32Array([0]) };
    for (let i = 0; i < 20; i++) used.process([[x]], [[new Float32Array(128)]], params);
    x.fill(0);
    const generation = new Float32Array(128); generation.fill(1, 64);
    const y = new Float32Array(128);
    used.process([[x]], [[y]], { ...params, generation });
    expect(y.slice(0, 64).some(v => Math.abs(v) > .001)).toBe(true);
    expect(Array.from(y.slice(64))).toEqual(Array(64).fill(0));
  });
  it.each([.05, .1])("silences a booked note cancelled at %ss", cancelAt => {
    const param = () => ({ value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
    const node = () => { const n = { connect: vi.fn(), disconnect: vi.fn() }; n.connect.mockImplementation(() => n); return n; };
    const osc = { ...node(), frequency: param(), start: vi.fn(), stop: vi.fn(), onended: null };
    const gains = Array.from({ length: 3 }, () => ({ ...node(), gain: param() }));
    const generation = param();
    createWorklet.mockReturnValue({ ...node(), parameters: new Map([['cutoff', param()], ['res', param()], ['drive', param()], ['generation', generation]]) });
    const ctx = { currentTime: 0, createOscillator: () => osc, createBiquadFilter: () => ({ ...node(), frequency: param(), Q: param() }), createGain: vi.fn() };
    gains.forEach(n => ctx.createGain.mockReturnValueOnce(n));
    const voice = playAcid(ctx as unknown as BaseAudioContext, node() as unknown as AudioNode, defaultAcid(), 36, .1, .15);
    expect(gains.every(n => n.gain.value === 0)).toBe(true);
    expect(generation.setValueAtTime).toHaveBeenCalledWith(1, .1);
    voice.stop(cancelAt);
    for (const n of gains) {
      expect(n.gain.cancelScheduledValues).toHaveBeenLastCalledWith(cancelAt);
      expect(n.gain.setValueAtTime).toHaveBeenLastCalledWith(0, cancelAt);
    }
    expect(osc.stop).toHaveBeenLastCalledWith(cancelAt);
  });
  it("provides finite bounded defaults and clamps unsafe settings", () => {
    expect(defaultAcid().cutoff).toBe(320);
    expect(acidParams({ cutoff: Infinity, res: 9, decay: -1 })).toMatchObject({ cutoff: 40, res: 1, decay: .06 });
  });
  it("keeps nonlinear feedback finite at cutoff/resonance/drive extremes and drains in silence", () => {
    for (const cutoff of [40, 320, 8000, 18000]) for (const res of [0, .72, 1]) for (const drive of [0, 1]) {
      const f = filter(), x = new Float32Array(128), y = new Float32Array(128);
      const p = { cutoff: new Float32Array([cutoff]), res: new Float32Array([res]), drive: new Float32Array([drive]) };
      let energy = 0;
      for (let block = 0; block < 1500; block++) {
        for (let n = 0; n < 128; n++) x[n] = block < 100 ? ((block * 128 + n) % 480) / 240 - 1 : 0;
        f.process([[x]], [[y]], p);
        expect(y.every(v => Number.isFinite(v) && Math.abs(v) <= 1)).toBe(true);
        if (block === 99) energy = y.reduce((a, b) => a + b * b, 0);
      }
      expect(energy).toBeGreaterThan(0);
      expect(y.reduce((a, b) => a + b * b, 0)).toBeLessThan(.001);
    }
  });
});