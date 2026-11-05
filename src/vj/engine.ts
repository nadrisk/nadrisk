// AV: the groovebox rendered as a Strudel REPL over one selectable 1-bit backdrop (generative DEPTH mesh, dithered CAM, SWEEP, NONE).
import type { DocPad, VjKind, VjPad } from "./bus";
import type { VjCamera } from "./camera";
import { BAYER, ditherCamera } from "./raster";
import { activeAtom, strudelDoc, type DocLine } from "./strudelDoc";
import { depthMesh, type V3 } from "./depthcore";

export const MODELS = ["DEPTH", "CAM", "SWEEP", "NONE"] as const;
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const rot = (v: V3, ax: number, ay: number): V3 => {
  let [x, y, z] = v; let c = Math.cos(ax), s = Math.sin(ax); [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ay); s = Math.sin(ay); [x, z] = [x * c + z * s, -x * s + z * c]; return [x, y, z];
};

export class VjEngine {
  t = 0; ry = 0; twist = 0; kick = 0; snare = 0; hat = 0; tone = 0; level = 0; seed = 0; phase = 0;
  last = ""; model = 0; size = 1; hudUntil = 0; hudMsg = "";
  beat = 0; bpm = 120; running = false; wave: number[] = [];
  pad?: VjPad; velocity = 0; peak = 0; rms = 0; step = 0; bank = "A"; theme = "oled";
  camera?: VjCamera;
  pads: DocPad[] = []; doc: DocLine[] = strudelDoc([], 120, "A");
  private lo = false; private slowFrames = 0;
  private cameraCanvas = document.createElement("canvas");
  private signalUntil = 0;
  private buf: Uint32Array | null = null; private img: ImageData | null = null; private w = 0; private h = 0;
  private small = document.createElement("canvas");

  setDoc(pads: DocPad[], bpm: number, bank: string) { this.pads = pads; this.bank = bank; this.doc = strudelDoc(pads, bpm, bank); }

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
    const tempo = this.bpm / 120;
    this.ry += dt * tempo * (.07 + this.level * .1); this.phase += dt * .025;
    if (dt > 1 / 28) { if (++this.slowFrames > 40) this.lo = true; } else this.slowFrames = Math.max(0, this.slowFrames - 1);

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

  /** Noise-displaced mesh: flat facets, key + rim light, Bayer-dithered, crest edges in solid colour. */
  private depth(buf: Uint32Array, W: number, H: number, FG: number, BG: number) {
    const { pts, faces, seam } = depthMesh({ t: this.t * (this.bpm / 120), phase: this.phase, amp: .24 + this.level * .2 + this.kick * .35, warp: .6 + this.tone * 1.2, detail: this.hat, seed: this.seed, twist: this.twist, lo: this.lo });
    const scale = Math.min(W, H) * .5 * this.size, ax = .35 + Math.sin(this.t * .05) * .2, ay = this.ry;
    const P = pts.map(p => { const q = rot(p, ax, ay), z = 3 - q[2]; return [W * .62 + q[0] * scale * 2.6 / z, H / 2 + q[1] * scale * 2.6 / z, q[2]]; });
    const Lk = norm([-.5, -.6, .65]);
    const list: { i: number; z: number }[] = [];
    for (let i = 0; i < faces.length; i++) {
      const [a, b, c] = faces[i], A = P[a], B = P[b], C = P[c];

      if (seam(pts[a], pts[b]) > .5 || seam(pts[b], pts[c]) > .5 || seam(pts[c], pts[a]) > .5) continue;
      list.push({ i, z: A[2] + B[2] + C[2] });
    }
    list.sort((p, q) => p.z - q.z);
    for (const { i } of list) {
      const [a, b, c] = faces[i], A = P[a], B = P[b], C = P[c];
      const u: V3 = [B[0] - A[0], B[1] - A[1], (B[2] - A[2]) * scale], v: V3 = [C[0] - A[0], C[1] - A[1], (C[2] - A[2]) * scale];
      const n = norm([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]);
      const key = Math.max(0, -(n[0] * Lk[0] + n[1] * Lk[1]) + Math.abs(n[2]) * Lk[2]), rim = Math.pow(1 - Math.abs(n[2]), 4) * .35;
      const s = Math.min(1, key * .85 + rim);
      tri(buf, W, H, [A, B, C], Math.round(s * 5) / 5, FG, BG);
      if (s > .93) line(buf, W, H, A, B, FG);
    }
  }

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

  /** Strudel REPL chrome + program. Text sits straight on the visual with a thin dark outline; long code may run over it. */
  private text(c: CanvasRenderingContext2D, tw: number, th: number, dpr: number, fg: string, bg: string) {
    const fs = Math.round(Math.max(10, Math.min(tw / dpr / 70, th / dpr / 38)) * dpr), lh = Math.round(fs * 1.3);
    const FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace", mono = `${fs}px ${FONT}`;
    c.textBaseline = "middle"; c.lineJoin = "round";
    const pad = Math.round(fs * .7), barH = Math.round(fs * 2.2);
    // Header: wordmark, REPL, play/update buttons, tempo.
    c.fillStyle = bg; c.globalAlpha = .82; c.fillRect(0, 0, tw, barH); c.globalAlpha = 1;
    c.fillStyle = fg; c.fillRect(0, barH - dpr, tw, dpr);
    c.font = `bold ${Math.round(fs * 1.3)}px ${FONT}`; c.fillText("strudel", pad, barH / 2);
    let x = pad + c.measureText("strudel").width + fs * .5;
    c.font = mono; c.globalAlpha = .6; c.fillText("REPL", x, barH / 2); c.globalAlpha = 1; x += c.measureText("REPL").width + fs * 1.4;
    const btn = (label: string, on: boolean) => { const w = c.measureText(label).width + fs; c.strokeStyle = fg; c.lineWidth = dpr; if (on) { c.fillStyle = fg; c.fillRect(x, barH * .2, w, barH * .6); c.fillStyle = bg; } else { c.strokeRect(x, barH * .2, w, barH * .6); c.fillStyle = fg; } c.fillText(label, x + fs / 2, barH / 2); c.fillStyle = fg; x += w + fs * .5; };
    btn(this.running ? "\u25A0 stop" : "\u25B6 play", this.running); btn("\u21BB update", false);
    const right = `${this.t < this.hudUntil ? this.hudMsg.toLowerCase() + "   " : ""}${Math.round(this.bpm)} bpm  cps ${(this.bpm / 240).toFixed(3)}  bank ${this.bank}`;
    c.fillText(right, tw - pad - c.measureText(right).width, barH / 2);
    // Editor.
    c.font = mono; const cw = c.measureText("M").width, gut = cw * 4, x0 = pad + gut, tick = this.running ? Math.floor(this.beat * 4) : this.step;
    let y = barH + lh * .9;
    const ink = (s: string, X: number, Y: number, alpha = 1) => { c.globalAlpha = 1; c.strokeStyle = bg; c.lineWidth = 2.5 * dpr; c.strokeText(s, X, Y); c.globalAlpha = alpha; c.fillStyle = fg; c.fillText(s, X, Y); c.globalAlpha = 1; };
    const TOK = /(\/\/.*$)|("(?:[^"\\]|\\.)*")|(\.[a-zA-Z_]+)|(\b\d*\.?\d+\b)|(_?\$:)|([^"./\d$_]+|.)/g;
    const byPad = new Map(this.pads.map(p => [p.index, p]));
    this.doc.forEach((ln, li) => {
      if (y > th + lh) return;
      if (ln.text) { c.fillStyle = bg; c.globalAlpha = .78; c.fillRect(x0 - cw * .3, y - lh / 2, (ln.text.length + .6) * cw, lh); c.globalAlpha = 1; }
      ink(String(li + 1).padStart(3, " "), pad, y, .35);
      const muted = ln.text.startsWith("_$:");
      let m: RegExpExecArray | null; TOK.lastIndex = 0;
      while ((m = TOK.exec(ln.text)) && m[0]) {
        const X = x0 + m.index * cw, a = m[1] ? .4 : m[2] ? 1 : m[3] ? .75 : m[4] ? .9 : m[5] ? 1 : .85;
        if (m[3] || m[5]) { c.font = `bold ${fs}px ${FONT}`; ink(m[0], X, y, muted ? a * .5 : a); c.font = mono; } else ink(m[0], X, y, muted ? a * .5 : a);
      }
      const p = ln.pad !== undefined ? byPad.get(ln.pad) : undefined;
      if (p && !muted && this.running) {
        const at = activeAtom(ln, p.steps, tick);
        if (at) { c.strokeStyle = fg; c.lineWidth = Math.max(1, dpr); c.strokeRect(x0 + at.at * cw - dpr, y - lh * .42, at.len * cw + 2 * dpr, lh * .84); }
      }
      y += lh;
      if (ln.punch !== undefined) { const q = byPad.get(ln.punch); if (q) { this.punchcard(c, q, x0, y - lh * .35, tw - x0 - pad, lh * .6, fg, bg, tick, dpr); y += lh * .8; } }
    });
  }

  /** Inline _punchcard(): one cell per step, ties drawn as bars, playhead column inverted. */
  private punchcard(c: CanvasRenderingContext2D, p: DocPad, x: number, y: number, maxW: number, h: number, fg: string, bg: string, tick: number, dpr: number) {
    const n = p.steps.length, cell = Math.max(3 * dpr, Math.min(h * .9, maxW / n)), cur = ((tick % n) + n) % n;
    c.fillStyle = bg; c.globalAlpha = .7; c.fillRect(x - dpr, y - dpr, n * cell + 2 * dpr, h + 2 * dpr); c.globalAlpha = 1;
    for (let i = 0; i < n; i++) {
      const v = p.steps[i], X = x + i * cell, hh = h * (.35 + .65 * (p.vel[i] ?? 1));
      if (v) { c.fillStyle = fg; c.globalAlpha = p.mute ? .35 : v >= 2 ? .55 : 1; c.fillRect(X + (v >= 2 ? 0 : dpr), y + h - hh, v >= 2 ? cell : cell - 2 * dpr, hh); }
      if (this.running && i === cur) { c.globalAlpha = 1; c.strokeStyle = fg; c.lineWidth = dpr; c.strokeRect(X, y, cell, h); }
      c.globalAlpha = 1;
    }
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
