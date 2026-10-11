import * as Tone from "tone";
export type PerformanceParams = {
  time: number; tension: number; style: "sweep" | "whiteout" | "cyber"; mode: number; division: number;
  /** Sequencer rotate in steps (+ = later) and loop shortener (0 = full row length). */
  offset: number; loop: number;
  /** TIME value RESET returns to (0 when unset). */
  timeHome?: number;
  /** Master stage: soft clipper into a brickwall-style limiter, each switchable. */
  clipOn: boolean; clipDrive: number; limitOn: boolean; ceiling: number;
  /** Performance override for every chord pad: "pad" keeps each pad's own play mode. */
  chordMode?: "pad" | "block" | "strum" | "arp";
  /** Performance DJ filter (-1 low-pass .. +1 high-pass) and dub tape echo send. */
  djSweep?: number; djRes?: number; echoSend?: number; echoDiv?: number; echoFeedback?: number; echoTone?: number;
  /** Mastering: broad low-Q EQ (dB) with sub high-pass, then a gentle glue compressor. */
  mEqOn?: boolean; mHpf?: number; mLow?: number; mMud?: number; mPresence?: number; mAir?: number;
  glueOn?: boolean; glueThresh?: number; glueRatio?: number; glueMakeup?: number;
};
/** Dub echo time divisions in quarter-note beats. */
export const ECHO_DIVS: [string, number][] = [["1/16", .25], ["1/8", .5], ["1/8T", 1 / 3], ["1/8.", .75], ["1/4", 1], ["1/4.", 1.5], ["1/2", 2]];
export const defaultPerformance = (): PerformanceParams => ({ time: 0, tension: 0, style: "sweep", mode: 0, division: 0.25, offset: 0, loop: 0, clipOn: false, clipDrive: 6, limitOn: true, ceiling: -1, chordMode: "pad", djSweep: 0, djRes: 1, echoSend: 0, echoDiv: 3, echoFeedback: .7, echoTone: 2200, mEqOn: false, mHpf: 25, mLow: 0, mMud: 0, mPresence: 0, mAir: 0, glueOn: false, glueThresh: -12, glueRatio: 2, glueMakeup: 2 });
// Cubic soft-knee clipper: linear-ish below the knee, flat at +/-1 (input beyond the curve clamps to the edges).
const clipCurve = (() => { const c = new Float32Array(2048); for (let i = 0; i < 2048; i++) { const x = i / 1023.5 - 1; c[i] = 1.5 * x - .5 * x ** 3; } return c; })();
export function createPerformance(ctx: BaseAudioContext, dest: AudioNode) {
  const input = ctx.createGain(), output = ctx.createGain(), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(); hp.type = "highpass";
  const recorder = Tone.getContext().createAudioWorkletNode("nad-performance", { outputChannelCount: [2] }) as unknown as AudioWorkletNode;
  const delay = ctx.createDelay(1), fb = ctx.createGain(), wash = ctx.createGain(), pan = ctx.createStereoPanner(), noiseGain = ctx.createGain();
  const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -1; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = .002; limiter.release.value = .1;
  // DJ filter sits after the tension filters; the dub echo is a send off it with a saturated, band-limited loop.
  const djLp = ctx.createBiquadFilter(), djHp = ctx.createBiquadFilter(); djHp.type = "highpass"; djHp.frequency.value = 20; djLp.frequency.value = 20000;
  const eSend = ctx.createGain(), eDelay = ctx.createDelay(4), eFb = ctx.createGain(), eSat = ctx.createWaveShaper(), eHp = ctx.createBiquadFilter(), eLp = ctx.createBiquadFilter(), eRet = ctx.createGain();
  eSend.gain.value = 0; eHp.type = "highpass"; eHp.frequency.value = 150; eSat.curve = Float32Array.from({ length: 1024 }, (_, i) => Math.tanh((i / 511.5 - 1) * 1.5)); eRet.gain.value = .9;
  input.connect(recorder).connect(hp).connect(lp).connect(djLp).connect(djHp).connect(output); lp.connect(delay).connect(pan).connect(wash).connect(output); delay.connect(fb).connect(delay);
  djHp.connect(eSend).connect(eDelay).connect(eLp).connect(eHp).connect(eRet).connect(output); eHp.connect(eSat).connect(eFb).connect(eDelay);
  // Mastering stage between the summed mix and the clipper/limiter.
  const mHp = ctx.createBiquadFilter(), mLow = ctx.createBiquadFilter(), mMud = ctx.createBiquadFilter(), mPres = ctx.createBiquadFilter(), mAir = ctx.createBiquadFilter(), glue = ctx.createDynamicsCompressor(), glueMk = ctx.createGain();
  mHp.type = "highpass"; mHp.Q.value = .6; mLow.type = "lowshelf"; mLow.frequency.value = 90; mMud.type = "peaking"; mMud.frequency.value = 300; mMud.Q.value = .7; mPres.type = "peaking"; mPres.frequency.value = 3200; mPres.Q.value = .6; mAir.type = "highshelf"; mAir.frequency.value = 12000;
  glue.knee.value = 6; glue.attack.value = .03; glue.release.value = .2;
  const mastered = ctx.createGain(); output.connect(mHp).connect(mLow).connect(mMud).connect(mPres).connect(mAir).connect(glue).connect(glueMk).connect(mastered);
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource(); noise.buffer = b; noise.loop = true; noise.connect(noiseGain).connect(hp); noiseGain.gain.value = 0; noise.start();
  // Master stage: output -> [clipper | bypass] -> [limiter | bypass] -> final.
  const clipIn = ctx.createGain(), clipBy = ctx.createGain(), pre = ctx.createGain(), shaper = ctx.createWaveShaper(), post = ctx.createGain(), limIn = ctx.createGain(), limBy = ctx.createGain(), limOn = ctx.createGain(), final = ctx.createGain();
  shaper.curve = clipCurve; shaper.oversample = "2x"; clipIn.gain.value = 0; limBy.gain.value = 0;
  mastered.connect(clipIn).connect(pre).connect(shaper).connect(post).connect(limIn); mastered.connect(clipBy).connect(limIn);
  limIn.connect(limiter).connect(limOn).connect(final); limIn.connect(limBy).connect(final); final.connect(dest);
  // Parallel, non-audible standards meter taps: K-weighted full band and 20-120 Hz sub band.
  const kShelf = ctx.createBiquadFilter(), kHp = ctx.createBiquadFilter(), subHp = ctx.createBiquadFilter(), subLp = ctx.createBiquadFilter();
  kShelf.type = "highshelf"; kShelf.frequency.value = 1682; kShelf.gain.value = 4; kShelf.Q.value = .707;
  kHp.type = "highpass"; kHp.frequency.value = 38; kHp.Q.value = .5;
  subHp.type = "highpass"; subHp.frequency.value = 20; subHp.Q.value = .707; subLp.type = "lowpass"; subLp.frequency.value = 120; subLp.Q.value = .707;
  const meter = Tone.getContext().createAudioWorkletNode("nad-meter", { numberOfInputs: 2, numberOfOutputs: 0, channelCount: 2 }) as unknown as AudioWorkletNode;
  final.connect(kShelf).connect(kHp).connect(meter, 0, 0); final.connect(subHp).connect(subLp).connect(meter, 0, 1);
  // Dynamics metering tap: true gain reduction from the compressor/limiter nodes plus post-chain output level.
  const outAn = ctx.createAnalyser(); outAn.fftSize = 256; outAn.smoothingTimeConstant = .5; final.connect(outAn);
  const outData = new Float32Array(new ArrayBuffer(outAn.fftSize * Float32Array.BYTES_PER_ELEMENT));
  const dyn = () => {
    outAn.getFloatTimeDomainData(outData);
    let sum = 0, peak = 0; for (let i = 0; i < outData.length; i++) { const v = outData[i]; sum += v * v; peak = Math.max(peak, Math.abs(v)); }
    const lvl = Math.max(Math.sqrt(sum / outData.length), peak * .35);
    return { gr: Math.max(0, -glue.reduction) + Math.max(0, -limiter.reduction), out: lvl > 0.00001 ? Math.max(-60, 20 * Math.log10(lvl)) : -60 };
  };
  const set = (p: AudioParam | undefined, v: number) => p?.setTargetAtTime(v, ctx.currentTime, .02);
  const db = (v: number) => 10 ** (v / 20);
  const update = (p: PerformanceParams, bpm: number) => {
    const v = p.tension, cyber = p.style === "cyber", white = p.style === "whiteout";
    set(hp.frequency, 20 * (cyber ? 250 : 100) ** v); set(lp.frequency, cyber ? 20000 * .15 ** v : 20000); set(hp.Q, .707 + v * (cyber ? 3 : 1));
    set(delay.delayTime, (60 / bpm) * (cyber ? .25 : .75)); set(fb.gain, v * .65); set(wash.gain, v * .55); set(pan.pan, v * .65); set(noiseGain.gain, v ** 3 * (white ? .12 : .025));
    set(output.gain, 1 - v * .2); set(recorder.parameters.get("mode"), p.mode); set(recorder.parameters.get("length"), 60 / bpm * p.division);
    const clip = p.clipOn ?? false, lim = p.limitOn ?? true, drive = p.clipDrive ?? 6;
    set(clipIn.gain, clip ? 1 : 0); set(clipBy.gain, clip ? 0 : 1); set(pre.gain, db(drive)); set(post.gain, db(-drive * .5));
    const dj = p.djSweep ?? 0, q = p.djRes ?? 1;
    set(djLp.frequency, dj < 0 ? 20000 * (60 / 20000) ** -dj : 20000); set(djHp.frequency, dj > 0 ? 20 * (12000 / 20) ** dj : 20); set(djLp.Q, dj < 0 ? q : .1); set(djHp.Q, dj > 0 ? q : .1);
    // Time changes glide (tape-style pitch sweep) instead of jumping.
    eDelay.delayTime.setTargetAtTime(Math.min(3.9, 60 / bpm * (ECHO_DIVS[p.echoDiv ?? 3]?.[1] ?? .75)), ctx.currentTime, .25);
    set(eSend.gain, p.echoSend ?? 0); set(eFb.gain, p.echoFeedback ?? .7); set(eLp.frequency, p.echoTone ?? 2200);
    const eq = p.mEqOn ?? false;
    set(mHp.frequency, eq ? p.mHpf ?? 25 : 10); set(mLow.gain, eq ? p.mLow ?? 0 : 0); set(mMud.gain, eq ? p.mMud ?? 0 : 0); set(mPres.gain, eq ? p.mPresence ?? 0 : 0); set(mAir.gain, eq ? p.mAir ?? 0 : 0);
    const gl = p.glueOn ?? false; set(glue.threshold, gl ? p.glueThresh ?? -12 : 0); set(glue.ratio, gl ? p.glueRatio ?? 2 : 1); set(glueMk.gain, gl ? db(p.glueMakeup ?? 2) : 1);
    set(limiter.threshold, p.ceiling ?? -1); set(limOn.gain, lim ? 1 : 0); set(limBy.gain, lim ? 0 : 1);
  };
  return { input, output: final, meter, dyn, update, dispose: () => { noise.stop(); [input, output, hp, lp, recorder, delay, fb, wash, pan, noise, noiseGain, limiter, clipIn, clipBy, pre, shaper, post, limIn, limBy, limOn, final, djLp, djHp, eSend, eDelay, eFb, eSat, eHp, eLp, eRet, mHp, mLow, mMud, mPres, mAir, glue, glueMk, mastered, kShelf, kHp, subHp, subLp, meter, outAn].forEach(n => n.disconnect()); } };
}
