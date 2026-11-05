import type { PerformanceParams } from "@/audio/performance";
import { BAYER } from "./raster";

export type AvPerformance = Pick<PerformanceParams, "mode" | "division" | "tension" | "style" | "djSweep" | "echoSend" | "echoFeedback" | "echoDiv" | "echoTone">;
export const NEUTRAL_PERFORMANCE: AvPerformance = { mode: 0, division: .25, tension: 0, style: "sweep", djSweep: 0, echoSend: 0, echoFeedback: .45, echoDiv: 3, echoTone: 2200 };
const clamp = (v: number | undefined, lo: number, hi: number, home: number) => Number.isFinite(v) ? Math.max(lo, Math.min(hi, v ?? home)) : home;
export function avPerformance(p: Partial<AvPerformance>): AvPerformance {
  return { mode: Math.round(clamp(p.mode, 0, 3, 0)), division: clamp(p.division, .125, 1, .25), tension: clamp(p.tension, 0, 1, 0), style: p.style === "cyber" || p.style === "whiteout" ? p.style : "sweep", djSweep: clamp(p.djSweep, -1, 1, 0), echoSend: clamp(p.echoSend, 0, 1, 0), echoFeedback: clamp(p.echoFeedback, 0, .8, .45), echoDiv: Math.round(clamp(p.echoDiv, 0, 6, 3)), echoTone: clamp(p.echoTone, 400, 8000, 2200) };
}
export const MAX_HISTORY_BYTES = 8 * 1024 * 1024;
const ECHO_BEATS = [.25, .5, 1 / 3, .75, 1, 1.5, 2];
const blend = (a: number, b: number, mix: number) => {
  let v = 0xff000000;
  for (const s of [0, 8, 16]) v |= Math.round(((a >>> s) & 255) * (1 - mix) + ((b >>> s) & 255) * mix) << s;
  return v >>> 0;
};

/** Background-only bounded capture. No additive gain, no capture or allocation during bypass. */
export class AvPerformanceFrames {
  private history: { pixels: Uint32Array; t: number }[] = [];
  private scratch: Uint32Array | null = null;
  private lastCapture = -Infinity;
  private holdStart = 0;
  private mode = 0;
  private echo = false;
  private stopAge = 0;
  get bytes() { return this.history.reduce((n, f) => n + f.pixels.byteLength, 0); }
  get frames() { return this.history.length; }
  clear() { this.history = []; this.scratch = null; this.lastCapture = -Infinity; this.mode = 0; this.echo = false; this.stopAge = 0; }
  speed(p: AvPerformance, dt: number) {
    if (p.mode !== 3) this.stopAge = 0;
    else this.stopAge = Math.min(1, this.stopAge + dt);
    return p.mode === 1 ? -1 : p.mode === 3 ? Math.max(0, 1 - this.stopAge / .65) : 1;
  }
  apply(buf: Uint32Array, W: number, H: number, p: AvPerformance, t: number, bpm: number, bg: number, fg: number, color: boolean) {
    const echo = (p.echoSend ?? 0) > .001, capture = echo || p.mode === 2;
    // Disengaging a capture effect destroys its history, even if another effect is still on.
    if (this.echo && !echo || this.mode !== p.mode || this.history[0]?.pixels.length !== buf.length && this.history.length) {
      this.history = []; this.lastCapture = -Infinity; this.holdStart = t;
    }
    this.mode = p.mode; this.echo = echo;
    if (!capture && !p.mode && !p.tension && !p.djSweep) { this.clear(); return; }
    const limit = Math.min(32, Math.floor(MAX_HISTORY_BYTES / Math.max(4, buf.byteLength)));
    const held = p.mode === 2 && this.history.length > 0;
    const seconds = Math.min(1.5, 60 / Math.max(30, bpm) * p.division);
    let source = buf;
    if (held) {
      const end = this.history[this.history.length - 1].t;
      const at = end - seconds + ((t - this.holdStart) % seconds);
      source = (this.history.find(f => f.t >= at) ?? this.history[0]).pixels;
    }
    const delay = Math.min(1.5, 60 / Math.max(30, bpm) * (ECHO_BEATS[p.echoDiv ?? 3] ?? .75));
    const ghost = echo ? [...this.history].reverse().find(f => f.t <= t - delay)?.pixels : undefined;
    if (!this.scratch || this.scratch.length !== buf.length) this.scratch = new Uint32Array(buf.length);
    const out = this.scratch, dj = p.djSweep ?? 0, tens = p.tension, mix = Math.min(.7, (p.echoSend ?? 0) * (.2 + (p.echoFeedback ?? 0) * .6));
    const grain = 1 + Math.floor(Math.max(0, -dj) * 5), squash = p.mode === 3 ? Math.max(1 / H, 1 - this.stopAge / .7) : 1;
    const shake = Math.round(Math.sin(t * 47) * tens * 3);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, yy = Math.round((y - H / 2) / squash + H / 2);
      let sx = p.mode === 1 ? W - 1 - x : x;
      sx += shake + (held && (y & 7) < 2 ? Math.round(Math.sin((t - this.holdStart) / seconds * Math.PI * 2) * 3) : 0);
      const sy = Math.floor(yy / grain) * grain;
      sx = Math.floor(sx / grain) * grain;
      let v = sx >= 0 && sx < W && sy >= 0 && sy < H ? source[sy * W + sx] : bg;
      if (ghost) { const gx = Math.max(0, sx - 1), gy = Math.max(0, Math.min(H - 1, sy - 1)); v = blend(v, ghost[gy * W + Math.min(W - 1, gx)], mix * (.65 + .35 * (p.echoTone ?? 2200) / 8000)); }
      if (dj > .001) { const next = source[Math.min(buf.length - 1, Math.max(0, sy * W + sx + 1))]; const edge = Math.abs((v & 255) - (next & 255)) + Math.abs((v >>> 8 & 255) - (next >>> 8 & 255)); v = blend(v, edge > 30 ? fg : bg, dj); }
      if (p.style === "whiteout" && tens) v = blend(v, fg, tens ** 3 * .85);
      else if (p.style === "cyber" && tens) { const light = Math.sin((x + y) * .3 + t * (5 + tens * 15)) > 1 - tens * .15; if (light) v = blend(v, fg, tens * .6); }
      if (!color && v !== bg && v !== fg) {
        const a = bg & 255, b = fg & 255, luminance = ((v & 255) - a) / (b - a || 1);
        v = luminance > BAYER[(y & 7) * 8 + (x & 7)] ? fg : bg;
      }
      out[i] = v;
    }
    buf.set(out);
    if (capture && !held && limit > 0 && t - this.lastCapture >= .05) {
      const pixels = this.history.length >= limit ? this.history.shift()?.pixels : undefined;
      const frame = pixels ?? new Uint32Array(buf.length); frame.set(buf);
      this.history.push({ pixels: frame, t }); this.lastCapture = t;
    }
  }
}