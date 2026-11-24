// nad-terrain: SURF wave-terrain oscillator. One orbit lap = one period of the note; output is the
// terrain height under the orbit. Runs 2x oversampled with a half-band decimator, tapers FOLD/SNOW
// above C4 and slews pitch 8 ms so SURGE leaps never click. Math mirrors terrain.ts (test-enforced).
export const TERRAIN_WORKLET = `
const T_CL = (v, a, b) => Math.min(b, Math.max(a, v));
function tHash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; }
function tFold(v) { const t = (v + 1) * 0.25; return 4 * Math.abs(t - Math.floor(t + 0.5)) - 1; }
function tTaper(hz) { return hz <= 261.6 ? 1 : T_CL(261.6 / hz, 0.15, 1); }
function tAt(x, y, fr, hold, snow, fold, taper) {
  const k = 1 + fr * 7, xs = x + hold * 0.8 * y;
  let z = (Math.sin(Math.PI * k * xs) * Math.cos(Math.PI * k * 0.5 * y) + 0.35 * Math.sin(Math.PI * (k * 0.5) * (xs + y))) / 1.35;
  const sn = snow * taper; if (sn > 0) z = z * (1 - sn * 0.5) + sn * 0.5 * tHash(Math.round(xs * 64), Math.round(y * 64));
  const fd = fold * taper; if (fd > 0) z = tFold(z * (1 + fd * 4));
  return T_CL(z, -1, 1);
}
globalThis.__nadTerrainAt = tAt;
const HB = [-0.0322, 0, 0.2822, 0.5, 0.2822, 0, -0.0322];
class NadTerrain extends AudioWorkletProcessor {
  static get parameterDescriptors() { const k = 'k-rate'; return [
    { name: 'frequency', defaultValue: 110, minValue: 1, maxValue: 12000, automationRate: 'a-rate' },
    { name: 'detune', defaultValue: 0, minValue: -4800, maxValue: 4800, automationRate: 'a-rate' },
    { name: 'cx', defaultValue: 0, minValue: -1, maxValue: 1, automationRate: k },
    { name: 'cy', defaultValue: 0, minValue: -1, maxValue: 1, automationRate: k },
    { name: 'radius', defaultValue: 0.6, minValue: 0, maxValue: 1, automationRate: k },
    { name: 'tfreq', defaultValue: 0.25, minValue: 0, maxValue: 1, automationRate: k },
    { name: 'hold', defaultValue: 0, minValue: -1, maxValue: 1, automationRate: k },
    { name: 'snow', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: k },
    { name: 'fold', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: k }]; }
  constructor() { super(); this.ph = 0; this.hz = 0; this.h = new Float32Array(7); this.dead = false;
    this.sl = 1 - Math.exp(-1 / (sampleRate * 2 * 0.008)); this.xs = 1 - Math.exp(-1 / (sampleRate * 2 * 0.015)); this.sx = null; this.sy = 0; this.sr = 0; this.sf = 0; this.so = 0; this.port.onmessage = e => { if (e.data && e.data.stop) this.dead = true; }; }
  process(_i, outs, p) {
    if (this.dead) return false; const o = outs[0][0]; if (!o) return true;
    const f = p.frequency, dt = p.detune, tcx = p.cx[0], tcy = p.cy[0], tr = p.radius[0], xs = this.xs;
    const tf = p.tfreq[0], tfo = p.fold[0]; if (this.sx === null) { this.sx = tcx; this.sy = tcy; this.sr = tr; this.sf = tf; this.so = tfo; }
    let cx = this.sx, cy = this.sy, r = this.sr; let fr = this.sf, fold = this.so; const hold = p.hold[0], snow = p.snow[0], h = this.h;
    for (let n = 0; n < o.length; n++) { const tgt = (f.length > 1 ? f[n] : f[0]) * Math.pow(2, (dt.length > 1 ? dt[n] : dt[0]) / 1200);
      for (let s = 0; s < 2; s++) { cx += (tcx - cx) * xs; cy += (tcy - cy) * xs; r += (tr - r) * xs; fr += (tf - fr) * xs; fold += (tfo - fold) * xs; this.hz = this.hz ? this.hz + (tgt - this.hz) * this.sl : tgt;
        this.ph += this.hz / (sampleRate * 2); this.ph -= Math.floor(this.ph); const a = this.ph * 2 * Math.PI;
        const z = tAt(T_CL(cx + r * Math.cos(a), -1, 1), T_CL(cy + r * Math.sin(a), -1, 1), fr, hold, snow, fold, tTaper(this.hz));
        h.copyWithin(0, 1); h[6] = z; }
      let y = 0; for (let j = 0; j < 7; j++) y += HB[j] * h[j]; o[n] = y; }
    this.sx = cx; this.sy = cy; this.sr = r; this.sf = fr; this.so = fold;
    for (let c = 1; c < outs[0].length; c++) outs[0][c].set(o);
    return true; }
}
registerProcessor('nad-terrain', NadTerrain);`;
