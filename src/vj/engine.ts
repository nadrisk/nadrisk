// AV: the groovebox written out as a NAD tracker matrix, over one selectable 1-bit backdrop (generative DEPTH mesh, dithered CAM, SWEEP, NONE).
import type { DocPad, VjKind, VjPad } from "./bus";
import type { VjCamera } from "./camera";
import { BAYER, ditherCamera } from "./raster";
import { hex } from "./trackerDoc";
import { codeLines } from "./nadCode";
import { ambientField, type AmbientModel } from "./ambient";
import { ReactionPool, sampleReactions } from "./reactions";
import { depthMesh, type V3 } from "./depthcore";
import { cosineColor, colorCss } from "./colorSweep";
import { AvPerformanceFrames, avPerformance, NEUTRAL_PERFORMANCE, type AvPerformance } from "./performance";

export const MODELS = ["DEPTH", "AURORA", "PLASMA", "TUNNEL", "CAM", "NONE"] as const;
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const rot = (v: V3, ax: number, ay: number): V3 => {
  let [x, y, z] = v; let c = Math.cos(ax), s = Math.sin(ax); [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ay); s = Math.sin(ay); [x, z] = [x * c + z * s, -x * s + z * c]; return [x, y, z];
};

export class VjEngine {
  t = 0; ry = 0; twist = 0; kick = 0; snare = 0; hat = 0; tone = 0; level = 0; seed = 0; phase = 0;
  last = ""; model = 0; size = 1; hudUntil = 0; hudMsg = "";
  color = false; code = false;
  readonly reactions = new ReactionPool();
  private flash = new Map<number, number>();
  beat = 0; bpm = 120; running = false; wave: number[] = [];
  pad?: VjPad; velocity = 0; peak = 0; rms = 0; step = 0; bank = "A"; theme = "oled";
  camera?: VjCamera;
  pads: DocPad[] = [];
  private lo = false; private slowFrames = 0;
  private cameraCanvas = document.createElement("canvas");
  private signalUntil = 0;
  private buf: Uint32Array | null = null; private img: ImageData | null = null; private w = 0; private h = 0;
  private small = document.createElement("canvas");
  perf: AvPerformance = { ...NEUTRAL_PERFORMANCE };
  readonly performanceFrames = new AvPerformanceFrames();
  private visualTime = 0;
  private visualKey = "";
  setPerformance(p: AvPerformance) {
    const next = avPerformance(p);
    if ((this.perf.echoSend ?? 0) > .001 && (next.echoSend ?? 0) <= .001 || this.perf.mode !== next.mode) this.performanceFrames.clear();
    this.perf = next;
  }
  clearPerformance() { this.performanceFrames.clear(); }

  setDoc(pads: DocPad[], bpm: number, bank: string) { this.pads = pads; this.bank = bank; if (Number.isFinite(bpm)) this.bpm = bpm; }

  signal(wave: readonly number[], beat: number, bpm: number, running: boolean, peak = 0, rms = 0, step = 0, bank = "A") {
    this.wave = wave.slice(0, 128).map(v => Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0);
    if (Number.isFinite(beat)) this.beat = Math.max(0, beat);
    if (Number.isFinite(bpm)) this.bpm = Math.max(30, Math.min(300, bpm));
    this.running = running; this.signalUntil = this.t + .3;
    if (!running) this.clearPerformance();
    this.peak = Number.isFinite(peak) ? Math.max(0, peak) : 0;
    this.rms = Number.isFinite(rms) ? Math.max(0, rms) : 0;
    this.step = Number.isFinite(step) ? Math.max(0, Math.floor(step)) : 0; this.bank = bank;
  }

  hit(kind: VjKind, vel: number, pad?: VjPad) {
    const v = Number.isFinite(vel) ? Math.max(0.2, Math.min(1, vel)) : 1;
    this.last = kind.toUpperCase();
    this.velocity = Number.isFinite(vel) ? Math.max(0, Math.min(1, vel)) : 0;
    if (pad) { this.pad = pad; this.flash.set(pad.index, this.t); }
    this.reactions.push(kind, v, pad);
    if (kind === "kick") this.kick = Math.max(this.kick, v);
    else if (kind === "snare") { this.snare = Math.max(this.snare, v); this.seed += .35 * v; this.ry += Math.PI / 2 * v; }
    else if (kind === "hat" || kind === "open" || kind === "perc") this.hat = Math.max(this.hat, v * .8);
    else { this.tone = Math.max(this.tone, v); this.twist += .03 * v; }
  }

  ctl(dm: number, ds: number) {
    if (dm) { this.model = ((this.model + dm) % MODELS.length + MODELS.length) % MODELS.length; this.hudMsg = MODELS[this.model]; }
    if (ds) { this.size = Math.round(Math.max(0.4, Math.min(2.2, this.size + ds * 0.1)) * 10) / 10; this.hudMsg = `size ${Math.round(this.size * 100)}%`; }
    this.hudUntil = this.t + 1.6;
  }

  shapeName() { return MODELS[this.model]; }

  frame(cv: HTMLCanvasElement, fg: number, bg: number, dt: number, fgCss = "#fff", bgCss = "#000") {
    dt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.05)) : 0; this.t += dt;
    if (this.running && this.t < this.signalUntil) this.beat += dt * this.bpm / 60;
    else if (this.t >= this.signalUntil) { this.running = false; this.wave = []; this.peak = 0; this.rms = 0; this.level *= Math.exp(-8 * dt); }
    const k = (r: number) => Math.exp(-r * dt);
    this.kick *= k(5); this.snare *= k(4); this.hat *= k(9); this.tone *= k(1.2); this.twist *= k(.1);
    this.reactions.step(dt);
    const active = this.running && this.t < this.signalUntil && !document.hidden;
    const perf = active ? this.perf : NEUTRAL_PERFORMANCE;
    if (!active) this.clearPerformance();
    const tempo = this.bpm / 120, speed = this.performanceFrames.speed(perf, dt);
    this.visualTime += dt * speed;
    this.ry += dt * speed * tempo * (.07 + this.level * .1); this.phase += dt * speed * .025;
    if (dt > 1 / 28) { if (++this.slowFrames > 40) this.lo = true; } else this.slowFrames = Math.max(0, this.slowFrames - 1);

    const px = Math.max(2, Math.round(cv.clientHeight / 260));
    const W = Math.max(64, Math.floor(cv.clientWidth / px)), H = Math.max(36, Math.floor(cv.clientHeight / px));
    if (W !== this.w || H !== this.h) { this.w = W; this.h = H; this.small.width = W; this.small.height = H; this.img = new ImageData(W, H); this.buf = new Uint32Array(this.img.data.buffer); }
    const buf = this.buf, img = this.img;
    if (!buf || !img) return;
    const key = `${W}:${H}:${this.model}:${this.color}:${fg}:${bg}`;
    if (key !== this.visualKey) { this.clearPerformance(); this.visualKey = key; }
    buf.fill(bg);
    const m = MODELS[this.model];
    if (m === "DEPTH") this.depth(buf, W, H, fg, bg);
    else if (m === "AURORA" || m === "PLASMA" || m === "TUNNEL") this.ambient(m, buf, W, H, fg, bg);
    else if (m === "CAM") this.cam(buf, W, H, fg, bg);
    if (m === "DEPTH" || m === "CAM") this.react(buf, W, H, fg);
    if (active && m !== "NONE") this.performanceFrames.apply(buf, W, H, perf, this.t, this.bpm, bg, fg, this.color);
    else this.clearPerformance();

    const sc = this.small.getContext("2d"); if (!sc) return;
    sc.putImageData(img, 0, 0);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const tw = Math.round(cv.clientWidth * dpr), th = Math.round(cv.clientHeight * dpr);
    if (cv.width !== tw || cv.height !== th) { cv.width = tw; cv.height = th; }
    const c = cv.getContext("2d"); if (!c) return;
    c.imageSmoothingEnabled = false;
    c.drawImage(this.small, 0, 0, tw, th);
    this.text(c, tw, th, dpr, fgCss, bgCss);
  }

  /** Crystal shards: back-face culled, painter-sorted, 3-level hard light, depth fades to sparse dither, ridge lines. */
  private depth(buf: Uint32Array, W: number, H: number, FG: number, BG: number) {
    const tension = this.running && this.t < this.signalUntil ? this.perf.tension : 0;
    const tris = depthMesh({ t: this.visualTime * (this.bpm / 120), phase: this.phase, amp: .35 + this.level * .25 + this.kick * .5 + tension * .4, warp: .6 + this.tone * 1.2 + tension * 1.5, detail: Math.min(1, this.hat + tension * .5), seed: this.seed, twist: this.twist, lo: this.lo });
    const scale = Math.min(W, H) * .5 * this.size, ax = .35 + Math.sin(this.visualTime * .05) * .2, ay = this.ry, F = 2.2;
    const L = norm([-.55, -.65, .55]);
    const list: { P: number[][]; z: number; s: number; spike: boolean }[] = [];
    for (const sh of tris) {
      const R = sh.p.map(p => rot(p, ax, ay));
      const P = R.map(q => { const z = 3.4 - q[2]; return [W * .6 + q[0] * scale * F / z, H * .5 + q[1] * scale * F / z, q[2]]; });
      const area = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[1][1] - P[0][1]) * (P[2][0] - P[0][0]);
      if (area >= 0) continue;
      const n = norm(cross3(sub3(R[1], R[0]), sub3(R[2], R[0])));
      const d = -(n[0] * L[0] + n[1] * L[1] - n[2] * L[2]);
      const lvl = d > .55 ? 1 : d > .1 ? .5 : .12, z = (R[0][2] + R[1][2] + R[2][2]) / 3;
      list.push({ P, z, s: lvl * (.55 + .45 * Math.max(0, Math.min(1, (z + 1) / 2))), spike: sh.spike });
    }
    list.sort((p, q) => p.z - q.z);
    for (const f of list) {
      const ink = this.color ? (x: number, y: number) => cosineColor(x / W, 1 - y / H, this.visualTime, .1 + .9 * f.s, f.z * .55 + this.kick * .15) : undefined;
      tri(buf, W, H, f.P, f.s, FG, BG, ink);
      if (f.spike) { const c = this.color ? cosineColor(f.P[2][0] / W, 1 - f.P[2][1] / H, this.visualTime, .45 + f.s * .45, f.z * .55) : f.s > .6 ? BG : FG; line(buf, W, H, f.P[0], f.P[2], c); line(buf, W, H, f.P[1], f.P[2], c); }
    }
  }

  /** Ambient field + pad reactions, dithered to 1-bit or tinted by the cosine palette. */
  private ambient(m: AmbientModel, buf: Uint32Array, W: number, H: number, FG: number, BG: number) {
    const input = { t: this.visualTime, kick: this.kick, tone: this.tone, level: this.level, size: this.size }, asp = W / H, o = { light: 0, hue: 0 };
    const items = this.reactions.items;
    for (let y = 0; y < H; y++) {
      const v = y / H, ny = v - .5, br = (y & 7) * 8;
      for (let x = 0; x < W; x++) {
        const u = x / W;
        let f = ambientField(m, (u - .5) * asp, ny, input);
        if (items.length) { sampleReactions(items, u, v, asp, o); f = Math.min(1, f + o.light * .7); } else o.hue = 0;
        buf[y * W + x] = this.color ? cosineColor(u * .6, (1 - v) * .6, this.visualTime * .15, .08 + .92 * f, f * .8 + o.hue) : f > BAYER[br + (x & 7)] ? FG : BG;
      }
    }
  }
  /** Reactions drawn over DEPTH and CAM at half density. */
  private react(buf: Uint32Array, W: number, H: number, FG: number) {
    const items = this.reactions.items; if (!items.length) return;
    const asp = W / H, o = { light: 0, hue: 0 };
    for (let y = 0; y < H; y += 1) for (let x = (y & 1); x < W; x += 2) {
      sampleReactions(items, x / W, y / H, asp, o);
      if (o.light * .8 > BAYER[(y & 7) * 8 + (x & 7)]) buf[y * W + x] = this.color ? cosineColor(x / W, 1 - y / H, this.visualTime, Math.min(1, .5 + o.light * .5), o.hue) : FG;
    }
  }
  private cam(buf: Uint32Array, W: number, H: number, FG: number, BG: number) {
    const camera = this.camera, video = camera?.video;
    if (!(camera?.status === "live" && video && video.readyState >= 2 && video.videoWidth > 0)) return;
    if (this.cameraCanvas.width !== W || this.cameraCanvas.height !== H) { this.cameraCanvas.width = W; this.cameraCanvas.height = H; }
    const context = this.cameraCanvas.getContext("2d", { willReadFrequently: true }); if (!context) return;
    context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, W, H);
    const cover = Math.max(W / video.videoWidth, H / video.videoHeight) * this.size;
    const vw = video.videoWidth * cover, vh = video.videoHeight * cover;
    context.translate(W, 0); context.scale(-1, 1);
    context.drawImage(video, (W - vw) / 2, (H - vh) / 2, vw, vh);
    const data = context.getImageData(0, 0, W, H).data;
    if (!this.color) ditherCamera(data, buf, W, H, FG, BG, this.kick, this.level);
    else for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, l = (data[i] * .299 + data[i + 1] * .587 + data[i + 2] * .114) / 255;
      const light = Math.max(0, Math.min(1, (l - .5) * (1.12 + this.level * .45) + .5 + this.kick * .14));
      // Luminance preserves the face/image; ordered quantisation keeps the pixel texture.
      const q = Math.min(1, (Math.floor(light * 6) + (light * 6 % 1 > BAYER[(y & 7) * 8 + (x & 7)] ? 1 : 0)) / 6);
      buf[y * W + x] = cosineColor(x / W, 1 - y / H, this.visualTime, q, l * .4);
    }
  }

  /** Optional CODE overlay: NAD patch lines on translucent strips, current step inverted, hit lines flash. */
  private text(c: CanvasRenderingContext2D, tw: number, th: number, dpr: number, fg: string, bg: string) {
    const FONT = "VT323, ui-monospace, Menlo, Consolas, monospace";
    const pad = Math.round(10 * dpr);
    const ink = (s: string, X: number, Y: number, a = 1, col = fg) => { c.globalAlpha = a; c.fillStyle = col; c.fillText(s, X, Y); c.globalAlpha = 1; };
    if (!this.code) {
      if (this.t < this.hudUntil) { const fs = Math.round(16 * dpr); c.font = `${fs}px ${FONT}`; c.textBaseline = "middle"; const m = this.hudMsg.toUpperCase(), mw = c.measureText(m).width; c.globalAlpha = .8; c.fillStyle = bg; c.fillRect(tw - pad * 2 - mw, pad, mw + pad, fs * 1.3); ink(m, tw - pad * 1.5 - mw, pad + fs * .65); }
      return;
    }
    const lines = codeLines(this.pads, this.step, this.bank, this.bpm, this.running);
    const p = this.running ? this.perf : NEUTRAL_PERFORMANCE;
    lines.push({ text: `fx eco:${hex(p.echoSend ?? 0)} tns:${hex(p.tension ?? 0)} ${["--", "rev", "stu", "stp"][p.mode ?? 0] ?? "--"}${this.t < this.hudUntil ? "  // " + this.hudMsg.toLowerCase() : ""}` });
    const chars = Math.max(...lines.map(l => l.text.length), 40);
    const fs = Math.round(Math.max(11 * dpr, Math.min((tw - pad * 2) / (chars * .5), (th - pad * 2) / (lines.length * 1.2), 22 * dpr)));
    const lh = Math.round(fs * 1.15); c.font = `${fs}px ${FONT}`; c.textBaseline = "middle";
    const cw = c.measureText("M").width;
    let y = pad + lh / 2;
    lines.forEach((l, i) => {
      const w = cw * l.text.length;
      const age = l.pad != null ? this.t - (this.flash.get(l.pad) ?? -9) : 9, hot = age < .12;
      c.globalAlpha = hot ? .85 : .55; c.fillStyle = hot ? fg : bg; c.fillRect(pad - cw * .4, y - lh / 2, w + cw * .8, lh); c.globalAlpha = 1;
      const col = this.color && l.pad != null ? colorCss(cosineColor(l.pad / 16, .5, this.t * .3, .95)) : fg;
      ink(l.text, pad, y, l.muted ? .3 : i === 0 ? .9 : .85, hot ? bg : col);
      if (l.hi != null && !hot) { c.fillStyle = fg; c.fillRect(pad + l.hi * cw - cw * .1, y - lh / 2 + dpr, cw * 1.2, lh - dpr * 2); ink(l.text[l.hi] ?? "", pad + l.hi * cw, y, 1, bg); }
      y += lh;
    });
  }
}

function tri(buf: Uint32Array, W: number, H: number, p: number[][], shade: number, FG: number, BG: number, ink?: (x: number, y: number) => number) {
  const s = [...p].sort((a, b) => a[1] - b[1]);
  const [x0, y0] = s[0], [x1, y1] = s[1], [x2, y2] = s[2];
  const yA = Math.max(0, Math.ceil(y0)), yB = Math.min(H - 1, Math.floor(y2));
  for (let y = yA; y <= yB; y++) {
    const xa = x0 + (x2 - x0) * (y2 === y0 ? 0 : (y - y0) / (y2 - y0));
    const xb = y < y1 ? x0 + (x1 - x0) * (y1 === y0 ? 0 : (y - y0) / (y1 - y0)) : x1 + (x2 - x1) * (y2 === y1 ? 0 : (y - y1) / (y2 - y1));
    const l = Math.max(0, Math.ceil(Math.min(xa, xb))), r = Math.min(W - 1, Math.floor(Math.max(xa, xb)));
    const rowI = y * W, br = (y & 7) * 8;
    for (let x = l; x <= r; x++) buf[rowI + x] = ink ? ink(x, y) : shade > BAYER[br + (x & 7)] ? FG : BG;
  }
}

function line(buf: Uint32Array, W: number, H: number, a: number[], b: number[], c: number) {
  const n = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))) + 1;
  if (n > 4000) return;
  for (let i = 0; i <= n; i++) { const x = Math.round(a[0] + (b[0] - a[0]) * i / n), y = Math.round(a[1] + (b[1] - a[1]) * i / n); if (x >= 0 && y >= 0 && x < W && y < H) buf[y * W + x] = c; }
}
