/** SPEC synth FFT gate: 1024-point frames, hop 256. Each bin opens/closes against a threshold relative to the
 *  frame's loudest bin (GATE 0 = bypass, 1 = only the strongest partials). ±3 dB hysteresis lets bins near the
 *  threshold chatter (the thin, unstable FFT shimmer); closed bins fade by RELEASE for crystalline decay. */
export const SPEC_SYNTH_WORKLET = `
class SpecSynthGate extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'gate', defaultValue: 0, minValue: 0, maxValue: 1 }, { name: 'release', defaultValue: .2, minValue: .005, maxValue: 2 }]; }
  constructor() { super(); const N = 1024, B = N / 2 + 1; this.N = N; this.H = 256; this.blk = 0;
    this.win = new Float32Array(N); for (let i = 0; i < N; i++) this.win[i] = .5 - .5 * Math.cos(2 * Math.PI * i / N);
    this.inb = new Float32Array(N); this.outb = new Float32Array(N + 128); this.re = new Float32Array(N); this.im = new Float32Array(N);
    this.g = new Float32Array(B).fill(1); this.open = new Uint8Array(B).fill(1); this.mag = new Float32Array(B); }
  fft(re, im, inv) { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let len = 2; len <= n; len <<= 1) { const a = (inv ? 2 : -2) * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const u = i + k, v = u + len / 2, tr = re[v] * cr - im[v] * ci, ti = re[v] * ci + im[v] * cr; re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti; const nc = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nc; } } } }
  process(ins, outs, p) { const x = ins[0] && ins[0][0], y = outs[0], N = this.N, H = this.H, B = N / 2 + 1, L = y[0].length;
    this.inb.copyWithin(0, L); for (let i = 0; i < L; i++) this.inb[N - L + i] = x ? x[i] || 0 : 0;
    for (let i = 0; i < L; i++) { const v = this.outb[i]; for (let c = 0; c < y.length; c++) y[c][i] = v; }
    this.outb.copyWithin(0, L); this.outb.fill(0, N + 128 - L);
    this.blk += L; if (this.blk < H) return true; this.blk = 0;
    const gate = p.gate[0], rel = Math.exp(-H / (sampleRate * Math.max(.005, p.release[0]))), re = this.re, im = this.im;
    for (let i = 0; i < N; i++) { re[i] = this.inb[i] * this.win[i]; im[i] = 0; } this.fft(re, im, false);
    let peak = 0; for (let k = 0; k < B; k++) { const m = Math.hypot(re[k], im[k]); this.mag[k] = m; if (m > peak) peak = m; }
    const thr = peak * Math.pow(10, -(1 - gate) * 60 / 20), hi = thr * 1.413, lo = thr / 1.413, bypass = gate < .001 || peak < 1e-7;
    for (let k = 0; k < B; k++) { let gk;
      if (bypass) { gk = 1; this.open[k] = 1; }
      else { const m = this.mag[k]; if (this.open[k] ? m < lo : m > hi) this.open[k] ^= 1; const tg = this.open[k] ? 1 : 0;
        gk = tg > this.g[k] ? this.g[k] + (tg - this.g[k]) * .7 : this.g[k] * rel; }
      this.g[k] = gk; re[k] *= gk; im[k] *= gk; if (k > 0 && k < N / 2) { re[N - k] = re[k]; im[N - k] = -im[k]; } }
    this.fft(re, im, true);
    const sc = 1 / (N * 1.5); for (let i = 0; i < N; i++) this.outb[i] += re[i] * this.win[i] * sc;
    return true; }
}
registerProcessor('nad-specsynth', SpecSynthGate);`;
