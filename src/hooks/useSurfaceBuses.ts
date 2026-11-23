import { useEffect, useRef, type MutableRefObject } from "react";
import { createFx, makeFx, type FxNode } from "@/audio/effects";
import { meltFeedback, type SurfaceState } from "@/audio/surfaceState";
type AudioEngine = { ctx: BaseAudioContext; master: GainNode; outs: { pan: StereoPannerNode }[] };
/** Parallel wet-only sends preserve each channel's insert rack and the existing master safety chain. */
export function useSurfaceBuses(engine: MutableRefObject<AudioEngine | null>, playing: boolean, state: SurfaceState, bpm: number) {
  const rack = useRef<{ engine: AudioEngine; fx: FxNode[]; returns: GainNode[]; sends: GainNode[][] } | null>(null);
  useEffect(() => {
    const e = engine.current; if (!e) return;
    if (!rack.current) {
      const units = [makeFx("digi", { hp: 120, damp: 3500, feedback: .45, mix: 1 }), makeFx("reverb", { size: 6, damp: 8000, mix: 1 }), makeFx("hack", { skip: 0, depth: 0, smth: .7, mix: 1 }), makeFx("delay", { spring: 0, wow: .15, tone: 2500, mix: 1 })];
      const fx = units.map(u => createFx(e.ctx, u.type, u.params));
      const returns = fx.map(f => { const g = e.ctx.createGain(); g.gain.value = 0; f.output.connect(g); g.connect(e.master); return g; });
      const sends = e.outs.map(o => fx.map(f => { const g = e.ctx.createGain(); g.gain.value = 0; o.pan.connect(g); g.connect(f.input); return g; }));
      rack.current = { engine: e, fx, returns, sends };
    }
    const r = rack.current;
    r.sends.forEach((row, i) => row.forEach((send, k) => send.gain.setTargetAtTime(state.sends[i]?.[k] ? .6 : 0, e.ctx.currentTime, .015)));
    r.returns.forEach((ret, k) => ret.gain.setTargetAtTime(state.amounts[k] * .65, e.ctx.currentTime, .015));
    const a = state.amounts;
    r.fx[0].update({ ...makeFx("digi").params, time: 60 / bpm * .75, mode: 1, hp: 120, damp: 800 + (1 - a[0]) * 5000, feedback: .45, mix: 1 });
    r.fx[1].update({ size: 6, density: .6, damp: 8000, freeze: a[1] > .01 ? 1 : 0, mix: 1 });
    r.fx[2].update({ ...makeFx("hack").params, skip: a[2], depth: 0, smth: .7, mix: 1 });
    r.fx[3].update({ ...makeFx("delay").params, time: 60 / bpm / 2, feedback: meltFeedback(a[3]), spring: 0, wow: .15, tone: 2500, mix: 1 });
  }, [engine, playing, state, bpm]);
  useEffect(() => () => {
    const r = rack.current; if (!r) return;
    r.sends.forEach((row, i) => row.forEach(g => { try { r.engine.outs[i].pan.disconnect(g); } catch { /* engine already disposed */ } g.disconnect(); }));
    r.fx.forEach(f => f.dispose()); r.returns.forEach(g => g.disconnect()); rack.current = null;
  }, []);
}