import { type DeckState, eqDb, filterHz } from "@/link/deck";
/** Linked-deck stage: 3-band kill EQ, bipolar DJ filter and fader gain between the summed pads and the master chain. Neutral = transparent. */
export function createDeckStage(ctx: BaseAudioContext) {
  const lo = ctx.createBiquadFilter(), mid = ctx.createBiquadFilter(), hi = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), gain = ctx.createGain();
  lo.type = "lowshelf"; lo.frequency.value = 200; mid.type = "peaking"; mid.frequency.value = 1000; mid.Q.value = .7; hi.type = "highshelf"; hi.frequency.value = 4000;
  hp.type = "highpass"; hp.frequency.value = 20; hp.Q.value = .9; lp.type = "lowpass"; lp.frequency.value = 20000; lp.Q.value = .9;
  lo.connect(mid).connect(hi).connect(hp).connect(lp).connect(gain);
  const set = (p: AudioParam, v: number) => p.setTargetAtTime(v, ctx.currentTime, .015);
  return { input: lo as AudioNode, output: gain as AudioNode, update(d: DeckState, xf: number) {
    set(lo.gain, eqDb(d.low)); set(mid.gain, eqDb(d.mid)); set(hi.gain, eqDb(d.high));
    const f = filterHz(d.filter); set(hp.frequency, f.hp); set(lp.frequency, f.lp); set(gain.gain, Math.max(0, Math.min(1.2, d.gain)) * xf);
  } };
}
