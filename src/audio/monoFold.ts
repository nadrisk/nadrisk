// Takes recorded on one interface input arrive as stereo with one silent side.
// If one channel is >35 dB quieter than the other, keep only the loud one so it plays centered.
export function silentSide(l: Float32Array, r: Float32Array): -1 | 0 | 1 {
  let a = 0, b = 0; for (let k = 0; k < l.length; k++) { a += l[k] * l[k]; b += r[k] * r[k]; }
  if (a === 0 && b === 0) return 0;
  const ratio = 10 * Math.log10((Math.max(a, b) + 1e-20) / (Math.min(a, b) + 1e-20));
  return ratio > 35 ? (a > b ? 1 : -1) : 0; // 1 = right is silent, -1 = left is silent
}
export function foldOneSided(ctx: BaseAudioContext, buf: AudioBuffer): AudioBuffer {
  if (buf.numberOfChannels !== 2) return buf;
  const l = buf.getChannelData(0), r = buf.getChannelData(1), side = silentSide(l, r);
  if (!side) return buf;
  const out = ctx.createBuffer(1, buf.length, buf.sampleRate); out.copyToChannel(side > 0 ? l : r, 0); return out;
}
