// AV: a live-code text layer over one selectable 1-bit backdrop (DEPTH monolith, dithered CAM, GLSL-style SWEEP, or NONE).
import type { VjKind, VjPad } from "./bus";
import type { VjCamera } from "./camera";
import { BAYER, ditherCamera } from "./raster";
import { LiveCode } from "./liveCode";
import { depthcore, type V3 } from "./depthcore";

export const MODELS = ["DEPTH", "CAM", "SWEEP", "NONE"] as const;

const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

const rot = (v: V3, ax: number, ay: number): V3 => {
  let [x, y, z] = v; let c = Math.cos(ax), s = Math.sin(ax); [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ay); s = Math.sin(ay); [x, z] = [x * c + z * s, -x * s + z * c]; return [x, y, z];
};

export class VjEngine {
  t = 0; rx = 0; ry = 0; twist = 0; kick = 0; snare = 0; hat = 0; tone = 0; level = 0;
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
    else if (kind === "snare") { this.snare = Math.max(this.snare, v); this.ry += Math.PI / 2 * v; }
    else if (kind === "hat" || kind === "open" || kind === "perc") this.hat = Math.max(this.hat, v * .7);
    else { this.tone = Math.max(this.tone, v); this.twist += .04 * v; }
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
    this.rx += dt * tempo * .05; this.ry += dt * tempo * (.06 + this.level * .1); this.twist *= k(.15);
    this.code.tick(dt, this.beat, this.bpm);

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
    this.text(c, tw, th, dpr, fgCss, bgCss);
  }

  /** Depthcore fan: twisted ribbons, one light, dithered facets with solid leading-edge highlights; front layers denser. */
  private depth(buf: Uint32Array, W: number, H: number, FG: number, BG: number) {
    const facets = depthcore({ t: this.t * (this.bpm / 120), open: this.kick, twist: this.twist });
    const scale = Math.min(W, H) * .62 * this.size, ax = .35 + Math.sin(this.t * .04) * .15, ay = this.ry * .4;
    const L = norm([-.45, -.55, .7]), proj = (v: V3) => { const p = rot(v, ax, ay), z = 2.6 - p[2]; return [W / 2 + p[0] * scale * 2.4 / z, H / 2 + p[1] * scale * 2.4 / z, p[2]]; };
    const list = facets.map(f => {
      const [a, b, c] = f.p, u: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const nr = norm(rot([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], ax, ay));
      const P = f.p.map(proj);
      return { P, z: P[0][2] + P[1][2] + P[2][2], shade: Math.abs(nr[0] * L[0] + nr[1] * L[1] + nr[2] * L[2]), f };
    }).sort((p, q) => p.z - q.z);
    for (const { P, shade, f } of list) {
      const s = Math.round(Math.min(1, shade * (1.05 - f.layer * .22)) * 8) / 8;
      tri(buf, W, H, P, s, FG, BG);
      if (f.edge && (f.layer === 0 || this.hat > .2)) line(buf, W, H, P[0], P[2], FG);
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

  /** Strudel-style editor: top bar, line-number gutter, wrapped lines on solid blocks, outlined active atoms, block cursor. */
  private text(c: CanvasRenderingContext2D, tw: number, th: number, dpr: number, fg: string, bg: string) {
    const fs = Math.round(Math.max(15, Math.min(tw / dpr / 46, th / dpr / 26)) * dpr), lh = Math.round(fs * 1.12);
    c.font = `${fs}px VT323, monospace`; c.textBaseline = "top";
    const cw = c.measureText("M").width, pad = Math.round(fs * .6), gut = 4 * cw;
    const cols = Math.max(20, Math.floor((tw - pad * 2 - gut) / cw) - 1);
    // Top bar.
    const bar = `strudel  ${this.running ? "\u25B6 playing" : "\u25A0 stopped"}  ${Math.round(this.bpm)} bpm  cps ${(this.bpm / 240).toFixed(2)}  ${MODELS[this.model].toLowerCase()}${this.t < this.hudUntil ? `  ${this.hudMsg.toLowerCase()}` : ""}`;
    c.fillStyle = fg; c.fillRect(0, 0, tw, lh + pad); c.fillStyle = bg; c.fillText(bar, pad, Math.round(pad / 2 + fs * .05));
    const v = this.code.view(this.running ? Math.floor(this.beat * 4) : this.step);
    let y = lh + pad * 2;
    const blink = v.typing || Math.floor(this.t * 1.8) % 2 === 0;
    v.lines.forEach((ln, i) => {
      const chunks: string[] = []; for (let k = 0; k < Math.max(1, ln.length); k += cols) chunks.push(ln.slice(k, k + cols));
      chunks.forEach((ch, j) => {
        if (y > th - lh * 3) return;
        const x = pad + gut, txt = j ? "  " + ch : ch, inv = v.flash[i] > .5, off = j ? 2 - j * cols : 0;
        c.fillStyle = bg; c.fillRect(pad - 2 * dpr, y - dpr, gut, lh);
        c.fillStyle = fg; c.globalAlpha = .45; c.fillText(j ? "" : String(i + 1).padStart(3, " "), pad - 2 * dpr, y); c.globalAlpha = 1;
        if (txt.length) { c.fillStyle = inv ? fg : bg; c.fillRect(x - 2 * dpr, y - dpr, txt.length * cw + 4 * dpr, lh); }
        c.fillStyle = inv ? bg : fg; c.fillText(txt, x, y);
        const sp = v.spans[i];
        if (sp && sp[0] - j * cols >= 0 && sp[1] - j * cols <= ch.length) { c.strokeStyle = inv ? bg : fg; c.lineWidth = Math.max(1, dpr); c.strokeRect(x + (sp[0] + off) * cw - dpr, y - dpr * .5, (sp[1] - sp[0]) * cw + 2 * dpr, lh - dpr); }
        const [cl, cc] = v.cursor;
        if (blink && cl === i && cc >= j * cols && (cc < (j + 1) * cols || j === chunks.length - 1)) { const cx = x + (cc + off) * cw; c.fillStyle = fg; c.fillRect(cx, y, cw, lh - dpr); if (cc < ln.length) { c.fillStyle = bg; c.fillText(ln[cc], cx, y); } }
        y += lh;
      });
    });
    // Punchcard + status at the bottom.
    const rows = this.code.punch().slice(0, 4), cell = Math.max(3 * dpr, Math.min(cw, (tw - pad * 2) / 32)), step = ((Math.floor(this.running ? this.beat * 4 : this.step) % 16) + 16) % 16;
    let py = th - lh - pad - rows.length * (cell + dpr);
    for (const r of rows) {
      c.fillStyle = bg; c.fillRect(pad - 2 * dpr, py - dpr, 16 * (cell + dpr) + 4 * dpr, cell + 2 * dpr);
      r.forEach((on, k) => { c.fillStyle = fg; c.globalAlpha = k === step ? 1 : on ? .85 : .18; c.fillRect(pad + k * (cell + dpr), py, cell, cell); });
      c.globalAlpha = 1; py += cell + dpr;
    }
    const st = v.status || (v.typing ? "-- INSERT --" : "");
    if (st) { c.fillStyle = bg; c.fillRect(pad - 2 * dpr, th - lh - pad / 2, st.length * cw + 4 * dpr, lh); c.fillStyle = fg; c.fillText(st, pad, th - lh - pad / 2); }
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

function line(buf: Uint32Array, W: number, H: number, a: number[], b: number[], c: number) {
  const n = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))) + 1;
  if (n > 4000) return;
  for (let i = 0; i <= n; i++) { const x = Math.round(a[0] + (b[0] - a[0]) * i / n), y = Math.round(a[1] + (b[1] - a[1]) * i / n); if (x >= 0 && y >= 0 && x < W && y < H) buf[y * W + x] = c; }
}
