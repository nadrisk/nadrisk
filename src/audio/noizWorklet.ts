// noiz~: signal-following noise injection after Robbert van der Helm's Crisp (nih-plug, ISC).
// The (pre-lowpassed) input amplitude-modulates band-shaped noise: CRSP uses only positive excursions (max(0,x)),
// FULL the whole wave, ALTR only negative excursions. Silence in = silence out; AMT 0 returns the dry signal.
export const NOIZ_WORKLET = `
class NadNoiz extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'amt', defaultValue: .25 }, { name: 'nmode', defaultValue: 0 }, { name: 'tone', defaultValue: 6000 }, { name: 'pre', defaultValue: 2000 }, { name: 'width', defaultValue: .5 }]; }
  constructor() { super(); this.s = [0x9e3779b9 | 0, 0x7f4a7c15 | 0]; this.lp = [0, 0]; this.h = [[0, 0], [0, 0]]; this.l = [[0, 0], [0, 0]]; }
  rnd(i) { let x = this.s[i]; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.s[i] = x; return (x >>> 0) / 2147483648 - 1; }
  process(ins, outs, p) { const x = ins[0], y = outs[0]; if (!x || !x.length) { for (const c of y) c.fill(0); return true; }
    const amt = p.amt[0], md = Math.round(p.nmode[0]), w = Math.max(0, Math.min(1, p.width[0]));
    const kp = 1 - Math.exp(-2 * Math.PI * Math.min(20000, Math.max(20, p.pre[0])) / sampleRate);
    const tone = Math.min(16000, Math.max(200, p.tone[0])), kl = 1 - Math.exp(-2 * Math.PI * tone / sampleRate), kh = 1 - Math.exp(-2 * Math.PI * tone * .25 / sampleRate);
    const g = amt * amt * 4;
    for (let n = 0; n < y[0].length; n++) {
      const a = this.rnd(0), b = this.rnd(1), nz = [a, a * (1 - w) + b * w];
      for (let c = 0; c < y.length; c++) { const s = (x[c] || x[0])[n] || 0, k = c ? 1 : 0;
        this.lp[k] += (s - this.lp[k]) * kp; const m = this.lp[k], mod = md === 1 ? m : md === 2 ? Math.min(0, m) : Math.max(0, m);
        const H = this.h[k], L = this.l[k]; let v = nz[k];
        H[0] += (v - H[0]) * kh; H[1] += (H[0] - H[1]) * kh; v -= H[1];
        L[0] += (v - L[0]) * kl; L[1] += (L[0] - L[1]) * kl;
        y[c][n] = s + g * L[1] * mod * 2; }
    }
    return true; }
}
registerProcessor('nad-noiz', NadNoiz);`;
