import { describe, it, expect } from "vitest";
import { REC_WORKLET } from "./liveInput";
import { applyXY } from "./xyMaps";
import { padFromPreset, padParams, keysCutoff } from "./pad";
import type { Slot } from "@/hooks/useGroovebox";

// Runs the real nad-rec worklet source with a fake audio clock.
function rig(sr = 1000) {
  let Proc: any; const g: any = { sampleRate: sr, currentTime: 0 };
  class Base { port = { onmessage: null as any, msgs: [] as any[], postMessage(m: any) { this.msgs.push(m); } }; }
  new Function("AudioWorkletProcessor", "registerProcessor", "globalThis", `with(globalThis){${REC_WORKLET}}`)(Base, (_: string, P: any) => { Proc = P; }, g);
  const p = new Proc(), send = (d: any) => p.port.onmessage({ data: d });
  const run = (blocks: number, level: (t: number) => number) => { for (let b = 0; b < blocks; b++) { const L = new Float32Array(100).map((_, j) => level(g.currentTime + j / sr)); p.process([[L, L]], [[new Float32Array(100), new Float32Array(100)]]); g.currentTime += 100 / sr; } };
  return { p, send, run, msgs: p.port.msgs as any[] };
}

describe("threshold recording", () => {
  it("waits for sound, then keeps a pre-roll before the first hit", () => {
    const r = rig(); r.send({ thr: .1 }); r.send({ start: 0, stop: -1, trig: true });
    r.run(5, t => (t >= .3 ? .5 : 0));
    const st = r.msgs.find(m => m.started); expect(st?.trig).toBe(true);
    r.send({ stop: .55 }); r.run(2, () => .5);
    const done = r.msgs.find(m => m.done); expect(done.n).toBe(1024 + 250);
  });
  it("NOTE mode punches out exactly at the note end", () => {
    const r = rig(); r.send({ start: .2, stop: .45, trig: false }); r.run(6, () => .2);
    expect(r.msgs.find(m => m.done).n).toBe(250);
  });
  it("a note with no sound above the threshold stays armed (missed)", () => {
    const r = rig(); r.send({ thr: .1 }); r.send({ start: 0, stop: .25, trig: true }); r.run(4, () => 0);
    expect(r.msgs.some(m => m.missed)).toBe(true); expect(r.msgs.some(m => m.done)).toBe(false);
  });
});

describe("piano XY", () => {
  const slot = (x: number, y: number) => applyXY({ engine: "pad", pad: padFromPreset(12), xy: { x, y } } as Slot).pad;
  it("left darkens toward felt even from BRT 0", () => { expect(keysCutoff(padParams(slot(-1, 0)), 1)).toBeLessThanOrEqual(420); });
  it("right opens to concert brightness", () => { expect(keysCutoff(padParams(slot(1, 0)), 1)).toBe(14000); });
  it("attack stays instant everywhere", () => { [[0, 1], [0, -1], [1, 1]].forEach(([x, y]) => expect(slot(x, y).atk).toBe(.002)); });
  it("bottom tightens decay, top rings long", () => { expect(slot(0, -1).dec!).toBeLessThan(.1); expect(slot(0, 1).rel).toBeGreaterThanOrEqual(6); });
});
