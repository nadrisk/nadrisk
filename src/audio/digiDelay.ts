// digi.delay~: clean digital delay in the Airwindows spirit — 4-point Hermite reads (no linear-interp dulling),
// one-pole HP/DAMP inside the feedback loop, a soft bound on feedback so it never runs away, and DUCK driven
// only by the dry input so repeats never duck themselves. The DSP core is a self-contained class whose source
// is embedded in the worklet, so tests exercise the exact code that runs in the browser.

/** Right-side time ratios for OFFS. */
export const DIGI_OFFS: [string, number][] = [["SAME", 1], ["DOT", 1.5], ["TRIP", 2 / 3], ["+25%", 1.25], ["-25%", .75]];
export const DIGI_MAX_SEC = 5.9;

/** Left/right delay seconds from params (sync index into SYNC_DIVS beats, or free TIME). */
export function digiTimes(p: Record<string, number>, bpm: number, divs: [string, number][]): [number, number] {
  const beats = divs[Math.round(p.sync ?? 0)]?.[1] ?? 0;
  const l = Math.min(DIGI_MAX_SEC, Math.max(.001, beats ? beats * 60 / bpm : p.time ?? .25));
  const r = Math.min(DIGI_MAX_SEC, l * (DIGI_OFFS[Math.round(p.offs ?? 0)]?.[1] ?? 1));
  return [l, r];
}

export class DigiCore {
  [k: string]: any;
  constructor(sr: number) {
    this.sr = sr; this.n = Math.ceil(sr * 6) + 8; this.b = [new Float32Array(this.n), new Float32Array(this.n)];
    this.w = 0; this.d = [-1, -1]; this.hp = [0, 0]; this.hx = [0, 0]; this.lp = [0, 0]; this.env = 0; this.g = 1;
  }
  static herm(y0: number, y1: number, y2: number, y3: number, f: number) {
    const c1 = .5 * (y2 - y0), c2 = y0 - 2.5 * y1 + 2 * y2 - .5 * y3, c3 = .5 * (y3 - y0) + 1.5 * (y1 - y2);
    return ((c3 * f + c2) * f + c1) * f + y1;
  }
  read(c: number, d: number) {
    const b = this.b[c], n = this.n, pos = this.w - d, i = Math.floor(pos), f = pos - i, m = (k: number) => b[((k % n) + n) % n];
    return DigiCore.herm(m(i - 1), m(i), m(i + 1), m(i + 2), f);
  }
  /** p: tl, tr (s), ping (0/1), fb, hp (Hz), damp (Hz), duck (0..1). Writes wet only. */
  process(inL: Float32Array, inR: Float32Array, oL: Float32Array, oR: Float32Array, p: Record<string, number>) {
    const sr = this.sr, ks = 1 - Math.exp(-1 / (sr * .05)), ka = 1 - Math.exp(-1 / (sr * .005)), kr = 1 - Math.exp(-1 / (sr * .25));
    const ah = Math.exp(-2 * Math.PI * Math.min(p.hp, sr * .45) / sr), al = 1 - Math.exp(-2 * Math.PI * Math.min(p.damp, sr * .45) / sr);
    const fb = Math.max(0, Math.min(.98, p.fb)), floor = Math.pow(10, -18 / 20), ping = p.ping >= .5;
    const tgt = [Math.max(2, p.tl * sr), Math.max(2, p.tr * sr)];
    if (this.d[0] < 0) this.d = tgt.slice();
    for (let s = 0; s < inL.length; s++) {
      const xl = inL[s] || 0, xr = inR[s] || 0, y = [0, 0];
      for (let c = 0; c < 2; c++) {
        this.d[c] += (tgt[c] - this.d[c]) * ks;
        const r = this.read(c, this.d[c]);
        const h = ah * (this.hp[c] + r - this.hx[c]); this.hx[c] = r; this.hp[c] = h;
        this.lp[c] += (h - this.lp[c]) * al; y[c] = this.lp[c];
      }
      // Duck follows the dry input only.
      const lv = Math.max(Math.abs(xl), Math.abs(xr)); this.env += (lv - this.env) * (lv > this.env ? ka : kr);
      this.g = 1 - p.duck * (1 - floor) * Math.min(1, this.env * 4);
      const bound = (v: number) => Math.tanh(v);
      if (ping) { this.b[0][this.w] = bound((xl + xr) * .5 + fb * y[1]); this.b[1][this.w] = bound(fb * y[0]); }
      else { this.b[0][this.w] = bound(xl + fb * y[0]); this.b[1][this.w] = bound(xr + fb * y[1]); }
      this.w = (this.w + 1) % this.n;
      oL[s] = y[0] * this.g; oR[s] = y[1] * this.g;
    }
  }
}

export const DIGI_WORKLET = `
const DigiCore = ${DigiCore.toString()};
class NadDigi extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'tl', defaultValue: .25 }, { name: 'tr', defaultValue: .25 }, { name: 'ping', defaultValue: 0 }, { name: 'fb', defaultValue: .35 }, { name: 'hp', defaultValue: 20 }, { name: 'damp', defaultValue: 20000 }, { name: 'duck', defaultValue: 0 }]; }
  constructor() { super(); this.core = new DigiCore(sampleRate); this.p = {}; this.rc = 0; }
  process(ins, outs, prm) { const x = ins[0], y = outs[0]; if (!y || !y.length) return true;
    const z = this.z || (this.z = new Float32Array(y[0].length)), l = (x && x[0]) || z, r = (x && (x[1] || x[0])) || z;
    for (const k in prm) this.p[k] = prm[k][0];
    this.core.process(l, r, y[0], y[1] || y[0], this.p);
    this.rc += y[0].length; if (this.rc >= 1024) { this.rc = 0; this.port.postMessage([20 * Math.log10(Math.max(1e-4, this.core.g))]); }
    return true; }
}
registerProcessor('nad-digi', NadDigi);`;
