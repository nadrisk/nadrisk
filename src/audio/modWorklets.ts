/**
 * Bucket-brigade modulation models (wet-only, stereo out; dry is mixed by the effect shell).
 * nad-juno: Juno-60 chorus — one mono BBD line read by two taps swept by a single triangle LFO in
 * antiphase (L = +LFO, R = -LFO). Mode I 0.513 Hz, II 0.863 Hz (both ~1.66–5.35 ms), I+II 9.75 Hz
 * shallow (~3.3–3.7 ms). Anti-alias/reconstruction lowpasses (~8 kHz), soft compander clip and hiss.
 * nad-ada: ADA flanger — wide ~35:1 exponential sweep below MAN, curved triangle LFO, ENH feedback from
 * negative (hollow) to positive (ringing) with a lowpassed, tanh-limited loop so it can never run away.
 * Both: MAN sets the delay, ENV pushes the delay with an input envelope follower, WIDTH is mid/side with
 * the side highpassed at 150 Hz so bass stays centred.
 */
export const MOD_WORKLETS = `
const lp1 = (f) => 1 - Math.exp(-2 * Math.PI * f / sampleRate);
const rd = (b, w, d, cap) => { const pos = w - d * sampleRate, i = Math.floor(pos), fr = pos - i, a = b[(i % cap + cap) % cap], c = b[((i + 1) % cap + cap) % cap]; return a + (c - a) * fr; };
class NadJuno extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{name:'mode',defaultValue:0},{name:'depth',defaultValue:.5},{name:'manual',defaultValue:3.5},{name:'env',defaultValue:0},{name:'noise',defaultValue:.2},{name:'width',defaultValue:.8}]; }
  constructor() { super(); this.cap = Math.ceil(sampleRate * .06); this.b = new Float32Array(this.cap); this.w = 0; this.ph = 0; this.e = 0; this.pre = [0, 0]; this.pl = [0, 0]; this.pr = [0, 0]; this.hs = 0; this.hx = 0; this.nz = 0; this.seed = 12345; }
  process(ins, outs, p) {
    const x = ins[0], y = outs[0]; if (!y || !y[0]) return true;
    const mode = Math.max(0, Math.min(2, Math.round(p.mode[0]))), rate = [.513, .863, 9.75][mode], swing = [1.845, 1.845, .2][mode] * Math.min(2, p.depth[0] * 2) / 1000;
    const man = Math.max(1, Math.min(15, p.manual[0])) / 1000, envAmt = p.env[0], nz = p.noise[0] * .0025, wd = p.width[0] * 1.4;
    const kA = lp1(8000), kH = lp1(150), kN = lp1(5000);
    for (let n = 0; n < y[0].length; n++) {
      const l = x && x[0] ? x[0][n] || 0 : 0, r = x && x[1] ? x[1][n] || 0 : l, m = (l + r) * .5;
      const pk = Math.abs(m); this.e += (pk - this.e) * (pk > this.e ? .01 : .0003);
      this.pre[0] += (m - this.pre[0]) * kA; this.pre[1] += (this.pre[0] - this.pre[1]) * kA;
      this.b[this.w] = Math.tanh(this.pre[1] * 1.2) / 1.2;
      this.ph = (this.ph + rate / sampleRate) % 1; const tri = 1 - 4 * Math.abs(this.ph - .5);
      const c = man + Math.min(.02, this.e * envAmt * .012);
      let a = rd(this.b, this.w, Math.max(.0005, c + swing * tri), this.cap), b2 = rd(this.b, this.w, Math.max(.0005, c - swing * tri), this.cap);
      this.seed = (this.seed * 1664525 + 1013904223) >>> 0; this.nz += ((this.seed / 4294967296 - .5) - this.nz) * kN; a += this.nz * nz; b2 += this.nz * nz * .9;
      this.pl[0] += (a - this.pl[0]) * kA; this.pl[1] += (this.pl[0] - this.pl[1]) * kA; this.pr[0] += (b2 - this.pr[0]) * kA; this.pr[1] += (this.pr[0] - this.pr[1]) * kA;
      const L = this.pl[1], R = this.pr[1], mid = (L + R) * .5, side = (L - R) * .5; this.hx += (side - this.hx) * kH; const s = (side - this.hx) * wd;
      y[0][n] = mid + s; if (y[1]) y[1][n] = mid - s;
      this.w = (this.w + 1) % this.cap;
    }
    return true;
  }
}
class NadAda extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{name:'rate',defaultValue:.25},{name:'depth',defaultValue:.6},{name:'manual',defaultValue:2},{name:'feedback',defaultValue:.6},{name:'env',defaultValue:0},{name:'width',defaultValue:.7}]; }
  constructor() { super(); this.cap = Math.ceil(sampleRate * .03); this.b = [new Float32Array(this.cap), new Float32Array(this.cap)]; this.w = 0; this.ph = 0; this.e = 0; this.lp = [0, 0]; this.out = [0, 0]; this.hx = 0; }
  process(ins, outs, p) {
    const x = ins[0], y = outs[0]; if (!y || !y[0]) return true;
    const rate = Math.max(0, p.rate[0]), R = 1 + 34 * Math.max(0, Math.min(1, p.depth[0])), man = Math.max(.2, Math.min(10, p.manual[0])) / 1000;
    const fb = Math.max(-.95, Math.min(.95, p.feedback[0])), envAmt = p.env[0], wd = p.width[0], kL = lp1(7000), kH = lp1(150);
    for (let n = 0; n < y[0].length; n++) {
      const l = x && x[0] ? x[0][n] || 0 : 0, r = x && x[1] ? x[1][n] || 0 : l, m = (l + r) * .5;
      const pk = Math.abs(m); this.e += (pk - this.e) * (pk > this.e ? .01 : .0002);
      this.ph = (this.ph + rate / sampleRate) % 1;
      for (let c = 0; c < 2; c++) {
        const ph = (this.ph + c * .5 * wd) % 1, tri = 1 - 2 * Math.abs(2 * ph - 1), sn = .5 - .5 * Math.cos(2 * Math.PI * ph);
        let u = rate > 0 ? tri * .7 + sn * .3 : 0; u = Math.min(1, u + this.e * envAmt * 3);
        const d = Math.max(.00005, man / Math.pow(R, u));
        const v = rd(this.b[c], this.w, d, this.cap);
        this.lp[c] += (v - this.lp[c]) * kL;
        this.b[c][this.w] = Math.tanh((c ? r : l) * .8 + this.lp[c] * fb);
        this.out[c] = this.lp[c];
      }
      const mid = (this.out[0] + this.out[1]) * .5, side = (this.out[0] - this.out[1]) * .5; this.hx += (side - this.hx) * kH; const s = (side - this.hx) * (1 + wd * .4);
      y[0][n] = mid + s; if (y[1]) y[1][n] = mid - s;
      this.w = (this.w + 1) % this.cap;
    }
    return true;
  }
}
registerProcessor('nad-juno', NadJuno); registerProcessor('nad-ada', NadAda);
`;
