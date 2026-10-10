/** Channel insert EQ shared by the audio path and the screen, so the drawn curve is the real filter response. */
export type EqSettings = { low: number; lowFreq: number; mid: number; midFreq: number; q: number; high: number; highFreq: number };
/** At or below this gain a shelf becomes a 24 dB/oct cut (two cascaded 2-pole filters). */
export const EQ_KILL = -23.5;

/** Configures [lowShelf|HP, lowCut2, mid bell, highShelf|LP, highCut2]; inactive cut stages sit out of band. */
export function configureEq(b: BiquadFilterNode[], e: EqSettings, set: (p: AudioParam, v: number) => void) {
  const [lo, lc, mi, hi, hc] = b, lk = e.low <= EQ_KILL, hk = e.high <= EQ_KILL;
  const lt: BiquadFilterType = lk ? "highpass" : "lowshelf", ht: BiquadFilterType = hk ? "lowpass" : "highshelf";
  if (lo.type !== lt) lo.type = lt; if (hi.type !== ht) hi.type = ht;
  set(lo.frequency, e.lowFreq); set(lo.gain, lk ? 0 : e.low); set(lo.Q, .707);
  set(lc.frequency, lk ? e.lowFreq : 5); set(lc.Q, .707);
  set(mi.frequency, e.midFreq); set(mi.gain, e.mid); set(mi.Q, e.q);
  set(hi.frequency, e.highFreq); set(hi.gain, hk ? 0 : e.high); set(hi.Q, .707);
  set(hc.frequency, hk ? e.highFreq : 22000); set(hc.Q, .707);
}
export function makeEqNodes(ctx: BaseAudioContext) {
  const types: BiquadFilterType[] = ["lowshelf", "highpass", "peaking", "highshelf", "lowpass"];
  return types.map(t => { const f = ctx.createBiquadFilter(); f.type = t; return f; });
}

let mirror: { ctx: OfflineAudioContext; nodes: BiquadFilterNode[] } | null = null;
/** Magnitude response (dB) of the exact filter set at the given frequencies. */
export function eqCurve(e: EqSettings, freqs: Float32Array<ArrayBuffer>): Float32Array {
  if (!mirror) { const ctx = new OfflineAudioContext(1, 128, 44100); mirror = { ctx, nodes: makeEqNodes(ctx) }; }
  configureEq(mirror.nodes, e, (p, v) => { p.value = v; });
  const out = new Float32Array(freqs.length).fill(0), mag = new Float32Array(freqs.length), ph = new Float32Array(freqs.length);
  mirror.nodes.forEach(n => { n.getFrequencyResponse(freqs, mag, ph); for (let i = 0; i < mag.length; i++) out[i] += 20 * Math.log10(Math.max(1e-6, mag[i])); });
  return out;
}
