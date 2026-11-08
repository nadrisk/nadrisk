// AV: SPACE / PLASMA (WebGL ports of the reference shaders, see ./gl), CAM or NONE, driven only by kick/snare/hat/level, with the optional NAD code overlay.
import type { DocPad, VjKind, VjPad } from "./bus";
import type { VjCamera } from "./camera";
import { BAYER, sobelEdges, feedTrail } from "./raster";
import { hex } from "./trackerDoc";
import { codeLines } from "./nadCode";
import { WORLDS, DEFAULT_OPTS, type SceneOpts } from "./gl/options";
import type { GlScene } from "./gl/renderer";
import { cosineColor, colorCss } from "./colorSweep";
import { AvPerformanceFrames, avPerformance, NEUTRAL_PERFORMANCE, type AvPerformance } from "./performance";

export const MODELS = WORLDS;
export class VjEngine {
  t = 0; ry = 0; twist = 0; kick = 0; snare = 0; hat = 0; tone = 0; level = 0; seed = 0; phase = 0;
  last = ""; model = 0; size = 1; hudUntil = 0; hudMsg = "";
  color = true; code = false; opts: SceneOpts = { ...DEFAULT_OPTS }; gl?: GlScene; glTime = 0;
  private ring = 1;
  private flash = new Map<number, number>();
  beat = 0; bpm = 120; running = false; wave: number[] = [];
  pad?: VjPad; velocity = 0; peak = 0; rms = 0; step = 0; bank = "A"; theme = "oled";
  camera?: VjCamera;
  pads: DocPad[] = [];
  private lo = false; private slowFrames = 0;
  private cameraCanvas = document.createElement("canvas");
  private camLum = new Float32Array(0); private camEdge = new Float32Array(0); private camTrail = new Float32Array(0); private camPrev = new Float32Array(0);
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
    if (kind === "kick") { this.kick = Math.max(this.kick, v); if (this.ring > .6) this.ring = 0; }
    else if (kind === "snare") { this.snare = Math.max(this.snare, v); }
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
    this.ring = Math.min(1, this.ring + dt * .35);
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
    const m = MODELS[this.model];
    if (m === "SPACE" || m === "PLASMA") {
      // Shader's own pace, nudged forward a touch by kick and loudness, never faster on silence.
      this.glTime += dt * (1 + this.kick * .35 + this.level * .1);
      const rgb = (v: number): [number, number, number] => [(v & 255) / 255, ((v >>> 8) & 255) / 255, ((v >>> 16) & 255) / 255];
      this.gl?.render(m, this.opts, this.glTime, { kick: this.kick, snare: this.snare, hat: this.hat, level: this.level }, this.size, !this.color, rgb(fg), rgb(bg), dt);
      const dpr = Math.min(2, window.devicePixelRatio || 1), tw = Math.round(cv.clientWidth * dpr), th = Math.round(cv.clientHeight * dpr);
      if (cv.width !== tw || cv.height !== th) { cv.width = tw; cv.height = th; }
      const c = cv.getContext("2d"); if (!c) return;
      c.clearRect(0, 0, tw, th); this.text(c, tw, th, dpr, fgCss, bgCss);
      return;
    }
    buf.fill(bg);
    if (m === "CAM") this.cam(buf, W, H, fg, bg);
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
    const data = context.getImageData(0, 0, W, H).data, n = W * H;
    if (this.camLum.length !== n) { this.camLum = new Float32Array(n); this.camEdge = new Float32Array(n); this.camTrail = new Float32Array(n); }
    const lum = this.camLum, edge = this.camEdge, trail = this.camTrail;
    for (let i = 0; i < n; i++) lum[i] = (data[i * 4] * .299 + data[i * 4 + 1] * .587 + data[i * 4 + 2] * .114) / 255;
    if (this.camPrev.length !== n) this.camPrev = lum.slice();
    sobelEdges(lum, edge, W, H, 2.2 + this.level * 1.5 + this.kick * 1.5);
    // Motion difference: only what moves leaves a slow phosphor ghost.
    for (let i = 0; i < n; i++) { edge[i] = Math.min(1, edge[i] * .55 + Math.abs(lum[i] - this.camPrev[i]) * 4); this.camPrev[i] = lum[i]; }
    feedTrail(edge, trail, W, H, Math.min(.94, .78 + this.tone * .14 + this.level * .05));
    const t = this.visualTime;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      // Contour feed: a ghost of the face underneath, melting outlines on top that wobble with the snare.
      const wx = Math.max(0, Math.min(W - 1, Math.round(x + Math.sin(y * .15 + t * 1.3) * this.snare * 3)));
      const i = y * W + wx, ghost = lum[y * W + x] * .18, v = Math.min(1, trail[i] + ghost);
      buf[y * W + x] = this.color ? cosineColor(x / W, 1 - y / H, t * .4, .05 + v * .95, trail[i] * .6 + lum[i] * .2) : v > BAYER[(y & 7) * 8 + (x & 7)] ? FG : BG;
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
