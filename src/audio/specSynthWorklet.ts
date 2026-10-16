/** SPEC synth FFT gate: Hann STFT, 1024-point frames, hop 256 (75% overlap), window-sum normalised overlap-add.
 *  Each bin's magnitude is compared with a threshold relative to the frame's strongest bin (calibrated GATE curve,
 *  see thrDb), through a 6 dB soft knee; the same gain scales re and im so phase is kept. Threshold and per-bin
 *  gains are smoothed. Posts a 64-bin retained mask (0..1) ~15x/s for the screen. */
export const SPEC_GATE_CAL: [number, number][] = [[0, -60], [.25, -40], [.5, -25], [.75, -12], [1, -3]];
export const thrDb = (g: number) => { const c = SPEC_GATE_CAL; if (g <= 0) return c[0][1]; for (let i = 1; i < c.length; i++) if (g <= c[i][0]) { const [a, da] = c[i - 1], [b, db] = c[i]; return da + (db - da) * (g - a) / (b - a); } return c[c.length - 1][1]; };
export const SPEC_SYNTH_WORKLET = `
const NAD_SPECGATE_CAL = ${JSON.stringify(SPEC_GATE_NAD_SPECGATE_CAL)};
function nadSpecGateThrDb(g) { if (g <= 0) return NAD_SPECGATE_CAL[0][1]; for (let i = 1; i < NAD_SPECGATE_CAL.length; i++) if (g <= NAD_SPECGATE_CAL[i][0]) { const a = NAD_SPECGATE_CAL[i-1][0], da = NAD_SPECGATE_CAL[i-1][1], b = NAD_SPECGATE_CAL[i][0], db = NAD_SPECGATE_CAL[i][1]; return da + (db - da) * (g - a) / (b - a); } return NAD_SPECGATE_CAL[NAD_SPECGATE_CAL.length-1][1]; }
class SpecSynthGate extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'gate', defaultValue: 0, minValue: 0, maxValue: 1 }, { name: 'release', defaultValue: .1, minValue: .005, maxValue: 2 }]; }
  constructor() { super(); const N = 1024, B = N / 2 + 1; this.N = N; this.H = 256; this.blk = 0; this.fr = 0;
    this.win = new Float32Array(N); for (let i = 0; i < N; i++) this.win[i] = .5 - .5 * Math.cos(2 * Math.PI * i / N);
    this.inb = new Float32Array(N); this.outb = new Float32Array(N + 128); this.re = new Float32Array(N); this.im = new Float32Array(N);
    this.g = new Float32Array(B).fill(1); this.thr = -60; this.mask = new Float32Array(64); }
  fft(re, im, inv) { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let len = 2; len <= n; len <<= 1) { const a = (inv ? 2 : -2) * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const u = i + k, v = u + len / 2, tr = re[v] * cr - im[v] * ci, ti = re[v] * ci + im[v] * cr; re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti; const nc = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nc; } } } }
  process(ins, outs, p) { const x = ins[0] && ins[0][0], y = outs[0], N = this.N, H = this.H, B = N / 2 + 1, L = y[0].length;
    this.inb.copyWithin(0, L); for (let i = 0; i < L; i++) this.inb[N - L + i] = x ? x[i] || 0 : 0;
    for (let i = 0; i < L; i++) { const v = this.outb[i]; for (let c = 0; c < y.length; c++) y[c][i] = v; }
    this.outb.copyWithin(0, L); this.outb.fill(0, N + 128 - L);
    this.blk += L; if (this.blk < H) return true; this.blk = 0;
    const gate = p.gate[0], rel = Math.exp(-H / (sampleRate * Math.max(.005, p.release[0]))), re = this.re, im = this.im;
    for (let i = 0; i < N; i++) { re[i] = this.inb[i] * this.win[i]; im[i] = 0; } this.fft(re, im, false);
    let peak = 0; for (let k = 0; k < B; k++) { const m = re[k] * re[k] + im[k] * im[k]; if (m > peak) peak = m; }
    this.thr += (nadSpecGateThrDb(gate) - this.thr) * .5; const bypass = gate < .001 || peak < 1e-14, pdb = 10 * Math.log10(peak + 1e-30);
    this.mask.fill(0);
    for (let k = 0; k < B; k++) { let tg = 1;
      if (!bypass) { const d = 10 * Math.log10(re[k] * re[k] + im[k] * im[k] + 1e-30) - pdb - this.thr, u = Math.min(1, Math.max(0, (d + 3) / 6)); tg = u * u * (3 - 2 * u); }
      const gk = tg > this.g[k] ? this.g[k] + (tg - this.g[k]) * .6 : tg + (this.g[k] - tg) * rel;
      this.g[k] = gk; re[k] *= gk; im[k] *= gk; if (k > 0 && k < N / 2) { re[N - k] = re[k]; im[N - k] = -im[k]; }
      const mb = Math.min(63, Math.floor(64 * Math.log2(1 + k) / Math.log2(B))); if (gk > this.mask[mb]) this.mask[mb] = gk; }
    this.fft(re, im, true);
    const sc = 1 / (N * 1.5); for (let i = 0; i < N; i++) this.outb[i] += re[i] * this.win[i] * sc;
    if (++this.fr % 12 === 0 && peak > 1e-10) this.port.postMessage(this.mask.slice());
    return true; }
}
registerProcessor('nad-specsynth', SpecSynthGate);`;
