import * as Tone from "tone";
export type PerformanceParams = { time: number; tension: number; style: "sweep" | "whiteout" | "cyber"; mode: number; division: number };
export const defaultPerformance = (): PerformanceParams => ({ time: 0, tension: 0, style: "sweep", mode: 0, division: 0.25 });
export function createPerformance(ctx: BaseAudioContext, dest: AudioNode) {
  const input = ctx.createGain(), output = ctx.createGain(), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(); hp.type = "highpass";
  const recorder = Tone.getContext().createAudioWorkletNode("nad-performance", { outputChannelCount: [2] }) as unknown as AudioWorkletNode;
  const delay = ctx.createDelay(1), fb = ctx.createGain(), wash = ctx.createGain(), pan = ctx.createStereoPanner(), noiseGain = ctx.createGain();
  const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = .002;
  input.connect(recorder).connect(hp).connect(lp).connect(output); lp.connect(delay).connect(pan).connect(wash).connect(output); delay.connect(fb).connect(delay);
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource(); noise.buffer = b; noise.loop = true; noise.connect(noiseGain).connect(hp); noiseGain.gain.value = 0; noise.start();
  output.connect(limiter).connect(dest);
  const set = (p: AudioParam | undefined, v: number) => p?.setTargetAtTime(v, ctx.currentTime, .02);
  const update = (p: PerformanceParams, bpm: number) => {
    const v = p.tension, cyber = p.style === "cyber", white = p.style === "whiteout";
    set(hp.frequency, 20 * (cyber ? 250 : 100) ** v); set(lp.frequency, cyber ? 20000 * .15 ** v : 20000); set(hp.Q, .707 + v * (cyber ? 3 : 1));
    set(delay.delayTime, (60 / bpm) * (cyber ? .25 : .75)); set(fb.gain, v * .65); set(wash.gain, v * .55); set(pan.pan, v * .65); set(noiseGain.gain, v ** 3 * (white ? .12 : .025));
    set(output.gain, 1 - v * .2); set(recorder.parameters.get("mode"), p.mode); set(recorder.parameters.get("length"), 60 / bpm * p.division);
  };
  return { input, output: limiter, update, dispose: () => { noise.stop(); [input, output, hp, lp, recorder, delay, fb, wash, pan, noise, noiseGain, limiter].forEach(n => n.disconnect()); } };
}
