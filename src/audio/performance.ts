import * as Tone from "tone";
export type PerformanceParams = {
  time: number; tension: number; style: "sweep" | "whiteout" | "cyber"; mode: number; division: number;
  /** Sequencer rotate in steps (+ = later) and loop shortener (0 = full row length). */
  offset: number; loop: number;
  /** Master stage: soft clipper into a brickwall-style limiter, each switchable. */
  clipOn: boolean; clipDrive: number; limitOn: boolean; ceiling: number;
};
export const defaultPerformance = (): PerformanceParams => ({ time: 0, tension: 0, style: "sweep", mode: 0, division: 0.25, offset: 0, loop: 0, clipOn: false, clipDrive: 6, limitOn: true, ceiling: -1 });
// Cubic soft-knee clipper: linear-ish below the knee, flat at +/-1 (input beyond the curve clamps to the edges).
const clipCurve = (() => { const c = new Float32Array(2048); for (let i = 0; i < 2048; i++) { const x = i / 1023.5 - 1; c[i] = 1.5 * x - .5 * x ** 3; } return c; })();
export function createPerformance(ctx: BaseAudioContext, dest: AudioNode) {
  const input = ctx.createGain(), output = ctx.createGain(), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(); hp.type = "highpass";
  const recorder = Tone.getContext().createAudioWorkletNode("nad-performance", { outputChannelCount: [2] }) as unknown as AudioWorkletNode;
  const delay = ctx.createDelay(1), fb = ctx.createGain(), wash = ctx.createGain(), pan = ctx.createStereoPanner(), noiseGain = ctx.createGain();
  const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -1; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = .002; limiter.release.value = .1;
  input.connect(recorder).connect(hp).connect(lp).connect(output); lp.connect(delay).connect(pan).connect(wash).connect(output); delay.connect(fb).connect(delay);
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource(); noise.buffer = b; noise.loop = true; noise.connect(noiseGain).connect(hp); noiseGain.gain.value = 0; noise.start();
  // Master stage: output -> [clipper | bypass] -> [limiter | bypass] -> final.
  const clipIn = ctx.createGain(), clipBy = ctx.createGain(), pre = ctx.createGain(), shaper = ctx.createWaveShaper(), post = ctx.createGain(), limIn = ctx.createGain(), limBy = ctx.createGain(), limOn = ctx.createGain(), final = ctx.createGain();
  shaper.curve = clipCurve; shaper.oversample = "2x"; clipIn.gain.value = 0; limBy.gain.value = 0;
  output.connect(clipIn).connect(pre).connect(shaper).connect(post).connect(limIn); output.connect(clipBy).connect(limIn);
  limIn.connect(limiter).connect(limOn).connect(final); limIn.connect(limBy).connect(final); final.connect(dest);
  const set = (p: AudioParam | undefined, v: number) => p?.setTargetAtTime(v, ctx.currentTime, .02);
  const db = (v: number) => 10 ** (v / 20);
  const update = (p: PerformanceParams, bpm: number) => {
    const v = p.tension, cyber = p.style === "cyber", white = p.style === "whiteout";
    set(hp.frequency, 20 * (cyber ? 250 : 100) ** v); set(lp.frequency, cyber ? 20000 * .15 ** v : 20000); set(hp.Q, .707 + v * (cyber ? 3 : 1));
    set(delay.delayTime, (60 / bpm) * (cyber ? .25 : .75)); set(fb.gain, v * .65); set(wash.gain, v * .55); set(pan.pan, v * .65); set(noiseGain.gain, v ** 3 * (white ? .12 : .025));
    set(output.gain, 1 - v * .2); set(recorder.parameters.get("mode"), p.mode); set(recorder.parameters.get("length"), 60 / bpm * p.division);
    const clip = p.clipOn ?? false, lim = p.limitOn ?? true, drive = p.clipDrive ?? 6;
    set(clipIn.gain, clip ? 1 : 0); set(clipBy.gain, clip ? 0 : 1); set(pre.gain, db(drive)); set(post.gain, db(-drive * .5));
    set(limiter.threshold, p.ceiling ?? -1); set(limOn.gain, lim ? 1 : 0); set(limBy.gain, lim ? 0 : 1);
  };
  return { input, output: final, update, dispose: () => { noise.stop(); [input, output, hp, lp, recorder, delay, fb, wash, pan, noise, noiseGain, limiter, clipIn, clipBy, pre, shaper, post, limIn, limBy, limOn, final].forEach(n => n.disconnect()); } };
}
