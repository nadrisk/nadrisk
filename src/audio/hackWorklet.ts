import { bitFlip, hackLimit, hackMask, hackMod, hackPattern, hackRng, hackSlew, hackStep } from "./hack";

// nad-hack: circuit-bending processor. Order: SKIP (buffer stutter) -> STRV (starved rails + sag) -> CLK (wobbling
// sample clock) -> SHRT (data-line short) -> DC block. CHAOS fires seeded glitch events once per block.
// GEN pattern (port message: seed/rate/steps/depth/anchor) holds one value per step on SHRT/CLK/STRV/SKIP (sample & hold).
// Posts [mask, clockPeriod, skipping, sag, flash, ...32 output samples, step, effective SHRT, CLK, STRV, SKIP] about 20x/s for the screen.
export const HACK_WORKLET = `
const hackRng = ${hackRng.toString()};
const bitFlip = ${bitFlip.toString()};
const hackMask = ${hackMask.toString()};
const hackPattern = ${hackPattern.toString()};
const hackStep = ${hackStep.toString()};
const hackMod = ${hackMod.toString()};
const hackSlew = ${hackSlew.toString()};
const hackLimit = ${hackLimit.toString()};
class NadHack extends AudioWorkletProcessor {
  static get parameterDescriptors() { return ['short', 'clock', 'starve', 'skip', 'size', 'chaos', 'lock', 'bpm'].map(n => ({ name: n, defaultValue: n === 'bpm' ? 124 : 0 })); }
  constructor() { super(); this.r = hackRng(0x5eed); this.N = Math.ceil(sampleRate * 2); this.buf = [new Float32Array(this.N), new Float32Array(this.N)];
    this.w = 0; this.ph = 1; this.hold = [0, 0]; this.mask = 0; this.lastShort = -1; this.env = 0; this.seg = 0; this.rep = 0; this.rs = 0; this.rl = 1; this.rpos = 0; this.rev = false;
    this.oldMask = 0; this.maskFade = 1; this.shortAmt = 0; this.wetMix = 0; this.written = 0;
    this.drop = 0; this.jump = 1; this.wp = 0; this.dx = [0, 0]; this.dy = [0, 0]; this.cnt = 0; this.flash = 0; this.per = 1; this.snap = new Float32Array(32); this.sn = 0;
    this.pat = null; this.seed = 0; this.rate = 2; this.steps = 16; this.depth = 0; this.anchor = 0; this.step = -1; this.eff = [0, 0, 0, 0]; this.smth = 0; this.sv = [0, 0, 0, 0]; this.ri = 1e-4; this.ro = 1e-4; this.ag = 1; this.pk = 0; this.gi = 0; this.gg = 0; this.run = true;
    this.port.onmessage = e => { const d = e.data || {}; if (d.seed !== undefined && d.seed !== this.seed) { this.seed = d.seed; this.pat = d.seed ? hackPattern(d.seed) : null; }
      if (d.rate !== undefined) this.rate = d.rate; if (d.steps !== undefined) this.steps = d.steps; if (d.depth !== undefined) this.depth = d.depth; if (d.anchor !== undefined) this.anchor = d.anchor; if (d.smth !== undefined) this.smth = d.smth;
      if (d.run !== undefined) { this.run = !!d.run; if (!this.run) this.flush(); } }; }
  flush() { this.buf[0].fill(0); this.buf[1].fill(0); this.rep = 0; this.rpos = 0; this.seg = 0; this.written = 0; this.drop = 0; this.hold = [0, 0]; this.dx = [0, 0]; this.dy = [0, 0]; this.env = 0; this.sv = [0, 0, 0, 0]; this.step = -1; this.gi = 0; this.gg = 0; }
  process(ins, outs, p) {
    const x = ins[0], y = outs[0]; if (!x || !x.length) return true;
    const bpm0 = Math.max(40, p.bpm[0]), pat = this.pat, dp = pat ? this.depth : 0, si = pat && this.run ? hackStep(currentTime - this.anchor, bpm0, this.rate, this.steps) : -1; if (si !== this.step && si >= 0) this.r = hackRng((this.seed || 1) * 31 + si * 977 + 7); this.step = si;
    const stepSec = 60 / bpm0 / [1, 2, 4, 8][Math.max(0, Math.min(3, Math.round(this.rate)))], k0 = hackSlew(this.smth, x[0].length / sampleRate, stepSec);
    for (let i = 0; i < 4; i++) this.sv[i] += ((pat && si >= 0 ? pat[i * 16 + si] : 0) - this.sv[i]) * k0;
    const lv0 = i => this.sv[i];
    // SKIP follows the lane exactly: with a pattern it only fires on steps whose bar is lit, scaled by the bar height.
    const skLane = pat && si >= 0 ? pat[48 + si] : 0, sk = p.skip[0] <= .001 ? 0 : pat ? (dp > 0 ? (skLane > 0 ? Math.min(1, p.skip[0] * (1 - dp) + dp * skLane * (.5 + p.skip[0])) : p.skip[0] * (1 - dp)) : p.skip[0]) : p.skip[0];
    const sh = hackMod(p.short[0], dp, lv0(0)), ck = hackMod(p.clock[0], dp, lv0(1)), st = hackMod(p.starve[0], dp, lv0(2)); this.eff = [sh, ck, st, sk];
    const sz = p.size[0], ch = p.chaos[0], lk = p.lock[0] >= .5, bpm = Math.max(40, p.bpm[0]), r = this.r;
    const previousMask = this.mask;
    if (Math.abs(sh - this.lastShort) > .02 || sh === 0) { this.lastShort = sh; this.mask = hackMask(sh, hackRng(Math.round(sh * 50) * 131 + 3)); }
    if (r() < ch * ch * .06) { const k = r();
      if (k < .4) { this.mask = hackMask(Math.min(1, sh + .3 * ch), r); this.flash = 1; }
      else if (k < .75) this.jump = 1 + r() * 4 * ch;
      else this.drop = Math.round(sampleRate * (.004 + r() * .03 * (.3 + st))); }
    if (this.mask !== previousMask) { this.oldMask = previousMask; this.maskFade = 0; }
    const segLen = Math.max(64, Math.min(this.N - 1, lk ? Math.round(sampleRate * 60 / bpm / [8, 4, 2, 1][Math.min(3, Math.floor(sz * 4))]) : Math.round(sampleRate * (.01 + sz * sz * .39))));
    const b0 = this.buf[0], b1 = this.buf[1], N = this.N, wr = 2 * Math.PI * (.3 + ch * 6) / sampleRate, a = Math.min(1, sh * 1.6);
    for (let n = 0; n < y[0].length; n++) {
      let l = x[0][n] || 0, rr = (x[1] || x[0])[n] || 0; this.ri += (l * l + rr * rr - this.ri) * .00005;
      const dryL = l, dryR = rr;
      const ia = Math.max(Math.abs(l), Math.abs(rr)); this.gi = ia > this.gi ? ia : this.gi * .9995; const quiet = this.gi < 1e-4;
      if (quiet) this.rep = 0;
      // Freeze the captured ring during replay; neither GEN steps nor SIZE edits can reset its cursor.
      if (this.rep === 0) {
        b0[this.w] = l; b1[this.w] = rr; this.w = (this.w + 1) % N; this.written = Math.min(N, this.written + 1);
        if (++this.seg >= segLen) { this.seg = 0;
          if (!quiet && sk > .02 && this.written >= segLen) { this.rep = Math.max(1, Math.round(sk * 4)); this.rl = segLen; this.rs = (this.w - segLen + N) % N; this.rev = ch > .5 && r() < ch - .5; this.rpos = 0; } }
      }
      if (this.rep > 0) {
        const i = this.rpos++, j = (this.rs + (this.rev ? this.rl - 1 - i : i)) % N;
        const e = Math.max(0, Math.min(1, i / 64, (this.rl - 1 - i) / 64));
        l += (b0[j] - l) * e; rr += (b1[j] - rr) * e;
        if (this.rpos >= this.rl) { this.rep = sk > .02 ? this.rep - 1 : 0; this.rpos = 0; }
      }
      const lv = Math.max(Math.abs(l), Math.abs(rr)); this.env += (lv - this.env) * (lv > this.env ? .01 : .0005);
      if (st > 0) { const sag = Math.min(1, this.env * 2), hi = 1 - st * (.45 + .4 * sag), lo = -hi * (1 - .35 * st), g = 1 - st * .4 * sag, d = 1 + st * 2;
        l = Math.max(lo, Math.min(hi, l * d)) * g; rr = Math.max(lo, Math.min(hi, rr * d)) * g; }
      if (this.drop > 0) { this.drop--; l *= .05; rr *= .05; }
      this.jump += (1 - this.jump) * .00005; this.wp += wr;
      const per = 1 + ck * ck * 47 * this.jump * (1 + .35 * ck * Math.sin(this.wp)); this.per = per;
      this.ph += 1 / per; if (this.ph >= 1) { this.ph -= Math.floor(this.ph); this.hold[0] = l; this.hold[1] = rr; }
      l = this.hold[0]; rr = this.hold[1];
      this.maskFade = Math.min(1, this.maskFade + 1 / 64);
      this.shortAmt += Math.max(-1 / 64, Math.min(1 / 64, a - this.shortAmt));
      if (this.shortAmt > 0) {
        const flip = v => bitFlip(v, this.oldMask) * (1 - this.maskFade) + bitFlip(v, this.mask) * this.maskFade;
        l += (flip(l) - l) * this.shortAmt; rr += (flip(rr) - rr) * this.shortAmt;
      }
      const o = [l, rr], q = [0, 0];
      for (let c = 0; c < 2; c++) { const v = o[c], d = v - this.dx[c] + .995 * this.dy[c]; this.dx[c] = v; this.dy[c] = d; q[c] = d; }
      // No loudness matching (it pumped the level); only a safety peak limiter at -1 dBFS.
      const pq = Math.max(Math.abs(q[0]), Math.abs(q[1])); this.pk = pq > this.pk ? pq : this.pk * .9998 + pq * .0002;
      const lg = hackLimit(this.pk, .89);
      // Silence gate: below -80 dBFS input the output fades to exact zero, so bit-flipped silence and old buffer never sound.
      this.gg += ((quiet ? 0 : 1) - this.gg) * (quiet ? .002 : .05); const gg = this.gg < 1e-5 ? 0 : this.gg;
      // All-zero stages are truly transparent: no DC filter, limiter or gate colours the dry signal.
      const targetWet = sh > 0 || ck > 0 || st > 0 || sk > 0 || ch > 0 || this.rep > 0 ? 1 : 0;
      this.wetMix += Math.max(-1 / 64, Math.min(1 / 64, targetWet - this.wetMix));
      for (let c = 0; c < y.length; c++) { const dry = c & 1 ? dryR : dryL, wet = gg === 0 ? 0 : Math.max(-.89, Math.min(.89, q[c & 1] * lg * gg)); y[c][n] = dry + (wet - dry) * this.wetMix; }
      if ((n & 3) === 0) { this.snap[this.sn] = y[0][n]; this.sn = (this.sn + 1) % 32; }
    }
    this.flash *= .9;
    this.cnt += y[0].length; if (this.cnt >= 2048) { this.cnt = 0; const s = []; for (let i = 0; i < 32; i++) s.push(this.snap[(this.sn + i) % 32]);
      this.port.postMessage([this.mask, this.per, this.rep > 0 ? 1 : 0, Math.min(1, this.env * 2) * st, this.flash, ...s, this.step, ...this.eff]); }
    return true;
  }
}
registerProcessor('nad-hack', NadHack);
`;
