// VJ: a live-code text layer over one selectable 1-bit backdrop (DEPTH monolith, dithered CAM, GLSL-style SWEEP, or NONE).
import type { VjKind, VjPad } from "./bus";
import type { VjCamera } from "./camera";
import { BAYER, ditherCamera } from "./raster";
import { LiveCode } from "./liveCode";

export const MODELS = ["DEPTH", "CAM", "SWEEP", "NONE"] as const;

type V3 = [number, number, number];
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const PHI = (1 + Math.sqrt(5)) / 2;

function icosphere(level: number) {
  const vs: V3[] = [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]].map(v => norm(v as V3));
  let fs = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let l = 0; l < level; l++) {
    const cache = new Map<string, number>(), mid = (a: number, b: number) => {
      const k = a < b ? `${a}_${b}` : `${b}_${a}`; let i = cache.get(k);
      if (i === undefined) { const p = vs[a], q = vs[b]; i = vs.push(norm([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2])) - 1; cache.set(k, i); }
      return i;
    };
    fs = fs.flatMap(([a, b, c]) => { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]; });
  }
  return { v: vs, f: fs };
}
const MESH = icosphere(2);

const rot = (v: V3, ax: number, ay: number): V3 => {
  let [x, y, z] = v; let c = Math.cos(ax), s = Math.sin(ax); [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ay); s = Math.sin(ay); [x, z] = [x * c + z * s, -x * s + z * c]; return [x, y, z];
};

export class VjEngine {
  t = 0; rx = 0; ry = 0; kick = 0; snare = 0; hat = 0; tone = 0; level = 0;
  last = ""; model = 0; size = 1; hudUntil = 0; hudMsg = "";
  beat = 0; bpm = 120; running = false; wave: number[] = [];
  pad?: VjPad; velocity = 0; peak = 0; rms = 0; step = 0; bank = "A"; theme = "oled";
  camera?: VjCamera; code = new LiveCode();
  private cameraCanvas = document.createElement("canvas");
  private signalUntil = 0;
  private buf: Uint32Array | null = null; private img: ImageData | null = null; private w = 0; private h = 0;
  private small = document.createElement("canvas");

  signal(wave: readonly number[], beat: number, bpm: number, running: boolean, peak = 0, rms = 0, step = 0, bank = "A") {
    this.wave = wave.slice(0, 128).map(v => Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0);
    if (Number.isFinite(beat)) this.beat = Math.max(0, beat);
    if (Number.isFinite(bpm)) this.bpm = Math.max(30, Math.min(300, bpm));
    this.running = running; this.signalUntil = this.t + .3;
    this.peak = Number.isFinite(peak) ? Math.max(0, peak) : 0;
    this.rms = Number.isFinite(rms) ? Math.max(0, rms) : 0;
    this.step = Number.isFinite(step) ? Math.max(0, Math.floor(step)) : 0; this.bank = bank;
  }

  hit(kind: VjKind, vel: number, pad?: VjPad) {
    const v = Number.isFinite(vel) ? Math.max(0.2, Math.min(1, vel)) : 1;
    this.last = kind.toUpperCase();
    this.velocity = Number.isFinite(vel) ? Math.max(0, Math.min(1, vel)) : 0;
    if (pad) this.pad = pad;
    if (kind === "kick") this.kick = Math.max(this.kick, v);
    else if (kind === "snare") { this.snare = Math.max(this.snare, v); this.ry += .35 * v; }
    else if (kind === "hat" || kind === "open" || kind === "perc") this.hat = Math.max(this.hat, v * .7);
    else this.tone = Math.max(this.tone, v);
    this.code.hit(kind, this.velocity, pad, this.running ? Math.floor(this.beat * 4) : this.step, this.beat);
  }

  ctl(dm: number, ds: number) {
    if (dm) { this.model = ((this.model + dm) % MODELS.length + MODELS.length) % MODELS.length; this.hudMsg = `BG ${MODELS[this.model]}`; }
    if (ds) { this.size = Math.round(Math.max(0.4, Math.min(2.2, this.size + ds * 0.1)) * 10) / 10; this.hudMsg = `SIZE ${Math.round(this.size * 100)}%`; }
    this.hudUntil = this.t + 1.6;
  }

  shapeName() { return MODELS[this.model]; }

  frame(cv: HTMLCanvasElement, fg: number, bg: number, dt: number, fgCss = "#fff", bgCss = "#000") {
    dt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.05)) : 0; this.t += dt;
    if (this.running && this.t < this.signalUntil) this.beat += dt * this.bpm / 60;
    else if (this.t >= this.signalUntil) { this.running = false; this.wave = []; this.peak = 0; this.rms = 0; this.level *= Math.exp(-8 * dt); }
    const k = (r: number) => Math.exp(-r * dt);
    this.kick *= k(5); this.snare *= k(4); this.hat *= k(9); this.tone *= k(2);
    const tempo = this.bpm / 120;
    this.rx += dt * tempo * (.11 + this.level * .2); this.ry += dt * tempo * (.17 + this.level * .3);

    const px = Math.max(2, Math.round(cv.clientHeight / 260));
    const W = Math.max(64, Math.floor(cv.clientWidth / px)), H = Math.max(36, Math.floor(cv.clientHeight / px));
    if (W !== this.w || H !== this.h) { this.w = W; this.h = H; this.small.width = W; this.small.height = H; this.img = new ImageData(W, H); this.buf = new Uint32Array(this.img.data.buffer); }
    const buf = this.buf, img = this.img;
    if (!buf || !img) return;
    buf.fill(bg);
    const m = MODELS[this.model];
    if (m === "DEPTH") this.depth(buf, W, H, fg, bg);
    else if (m === "SWEEP") this.sweep(buf, W, H, fg, bg);
    else if (m === "CAM") this.cam(buf, W, H, fg, bg);

    const sc = this.small.getContext("2d"); if (!sc) return;
    sc.putImageData(img, 0, 0);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const tw = Math.round(cv.clientWidth * dpr), th = Math.round(cv.clientHeight * dpr);
    if (cv.width !== tw || cv.height !== th) { cv.width = tw; cv.height = th; }
    const c = cv.getContext("2d"); if (!c) return;
    c.imageSmoothingEnabled = false;
    c.drawImage(this.small, 0, 0, tw, th);
    this.text(c, tw, th, dpr, fgCss, bgCss, dt);
  }

  /** One faceted crystalline monolith: terraced spikes, flat-lit, dithered. Kick extrudes, snare turns, tone breathes. */
  private depth(buf: Uint32Array, W: number, H: number, FG: number, BG: number) {
    const t = this.t * .25, scale = Math.min(W, H) * .34 * this.size * (1 + this.kick * .1);
    const pts = MESH.v.map(d => {
      const n = Math.sin(d[0] * 3.1 + t) * Math.sin(d[1] * 2.3 - t * .7) * Math.sin(d[2] * 2.7 + t * .5);
      const r = .78 + Math.round(Math.abs(n) * 5) / 5 * (.42 + this.kick * .35 + this.tone * .15) + this.level * .05;
      const p = rot([d[0] * r, d[1] * r, d[2] * r], this.rx, this.ry), z = 3.2 - p[2];
      return [W / 2 + p[0] * scale * 3 / z, H / 2 + p[1] * scale * 3 / z, p[2], p[0], p[1]];
    });
    const L = norm([-.5, -.6, .7]);
    const faces = MESH.f.map(f => {
      const [a, b, c] = f.map(i => pts[i]);
      const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      return { f, z: a[2] + b[2] + c[2], area };
    }).sort((p, q) => p.z - q.z);
    for (const { f } of faces) {
      const [a, b, c] = f.map(i => pts[i]);
      const u: V3 = [b[3] - a[3], b[4] - a[4], b[2] - a[2]], v: V3 = [c[3] - a[3], c[4] - a[4], c[2] - a[2]];
      const nrm = norm([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]);
      const shade = Math.abs(nrm[0] * L[0] + nrm[1] * L[1] + nrm[2] * L[2]) * (.75 + this.hat * .25);
      tri(buf, W, H, [a, b, c], Math.round(shade * 6) / 6, FG, BG);
    }
  }

  /** Classic shader sine sweep, banded and Bayer-dithered. */
  private sweep(buf: Uint32Array, W: number, H: number, FG: number, BG: number) {
    const t = this.t * (.4 + this.level * .6), push = this.kick * 1.4, sz = 1 / this.size;
    for (let y = 0; y < H; y++) {
      const ny = y / H - .5, br = (y & 7) * 8;
      for (let x = 0; x < W; x++) {
        const nx = (x / W - .5) * W / H;
        let v = Math.sin(nx * 4 * sz + t + Math.sin(ny * 3 * sz + t * .7) * 2 + push) * .5 + Math.sin(Math.hypot(nx, ny) * 9 * sz - t * 1.3) * .3;
        v = Math.round((v * .5 + .5) * 8) / 8 * (.55 + this.level * .35);
        buf[y * W + x] = v > BAYER[br + (x & 7)] ? FG : BG;
      }
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
    ditherCamera(context.getImageData(0, 0, W, H).data, buf, W, H, FG, BG, this.kick, this.level);
  }

  /** Code lines on solid blocks so they stay readable over any backdrop; the playing step's token is inverted. */
  private text(c: CanvasRenderingContext2D, tw: number, th: number, dpr: number, fg: string, bg: string, dt: number) {
    const fs = Math.round(Math.max(14, Math.min(tw / dpr / 52, th / dpr / 24)) * dpr), lh = Math.round(fs * 1.15);
    c.font = `${fs}px VT323, monospace`; c.textBaseline = "top";
    const cw = c.measureText("M").width, x0 = Math.round(fs * .9);
    let y = Math.round(fs * .9) + Math.round(8 * dpr);
    const row = (s: string, span: [number, number] | null = null, flash = 0) => {
      if (!s) { y += lh; return; }
      const w = Math.ceil(s.length * cw + 8 * dpr);
      c.fillStyle = flash > .5 ? fg : bg; c.fillRect(x0 - 4 * dpr, y - 2 * dpr, w, lh);
      c.fillStyle = flash > .5 ? bg : fg; c.fillText(s, x0, y);
      if (span && span[1] <= s.length) {
        const sx = x0 + span[0] * cw, sw = (span[1] - span[0]) * cw;
        c.fillStyle = flash > .5 ? bg : fg; c.fillRect(sx - 1 * dpr, y - 2 * dpr, sw + 2 * dpr, lh);
        c.fillStyle = flash > .5 ? fg : bg; c.fillText(s.slice(span[0], span[1]), sx, y);
      }
      y += lh;
    };
    const bar = Math.floor(this.beat / 4) + 1;
    const hud = this.t < this.hudUntil ? `  ${this.hudMsg}` : "";
    row(`// NAD_VJ  ${this.bpm} BPM  BAR ${String(bar).padStart(2, "0")}  ${this.bank}  ${this.running ? "PLAY" : "STOP"}${hud}`);
    row(`setcps(${this.bpm}/60/4)`);
    row("");
    const lines = this.code.lines(this.beat, this.running ? Math.floor(this.beat * 4) : this.step, dt);
    if (!lines.length) row(`// play a pad${Math.floor(this.t * 2) % 2 ? "_" : ""}`);
    for (const l of lines) {
      const typed = l.text.slice(0, l.typed), caret = l.typed < l.text.length ? "_" : "";
      row(typed + caret, l.span && l.span[1] <= l.typed ? l.span : null, l.flash);
    }
    const live = lines.filter(l => !l.comment).map(l => l.text.split(":")[0]);
    if (live.length) { row(""); row(`stack(${live.join(", ")}).out()`); }
  }
}

function tri(buf: Uint32Array, W: number, H: number, p: number[][], shade: number, FG: number, BG: number) {
  const s = [...p].sort((a, b) => a[1] - b[1]);
  const [x0, y0] = s[0], [x1, y1] = s[1], [x2, y2] = s[2];
  const yA = Math.max(0, Math.ceil(y0)), yB = Math.min(H - 1, Math.floor(y2));
  for (let y = yA; y <= yB; y++) {
    const xa = x0 + (x2 - x0) * (y2 === y0 ? 0 : (y - y0) / (y2 - y0));
    const xb = y < y1 ? x0 + (x1 - x0) * (y1 === y0 ? 0 : (y - y0) / (y1 - y0)) : x1 + (x2 - x1) * (y2 === y1 ? 0 : (y - y1) / (y2 - y1));
    const l = Math.max(0, Math.ceil(Math.min(xa, xb))), r = Math.min(W - 1, Math.floor(Math.max(xa, xb)));
    const rowI = y * W, br = (y & 7) * 8;
    for (let x = l; x <= r; x++) buf[rowI + x] = shade > BAYER[br + (x & 7)] ? FG : BG;
  }
}
