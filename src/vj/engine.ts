// AV: the groovebox written out as live-code text plus one shared step grid, over one selectable 1-bit backdrop (generative DEPTH mesh, dithered CAM, SWEEP, NONE).
import type { DocPad, VjKind, VjPad } from "./bus";
import type { VjCamera } from "./camera";
import { BAYER, ditherCamera } from "./raster";
import { activeAtom, codeDoc, padWord, type DocLine } from "./codeDoc";
import { depthMesh, type V3 } from "./depthcore";
import { cosineColor, colorCss } from "./colorSweep";

export const MODELS = ["DEPTH", "CAM", "SWEEP", "NONE"] as const;
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
  color = false;
  beat = 0; bpm = 120; running = false; wave: number[] = [];
  pad?: VjPad; velocity = 0; peak = 0; rms = 0; step = 0; bank = "A"; theme = "oled";
  camera?: VjCamera;
  pads: DocPad[] = []; doc: DocLine[] = codeDoc([], 120, "A");
  private lo = false; private slowFrames = 0;
  private cameraCanvas = document.createElement("canvas");
  private signalUntil = 0;
  private buf: Uint32Array | null = null; private img: ImageData | null = null; private w = 0; private h = 0;
  private small = document.createElement("canvas");

  setDoc(pads: DocPad[], bpm: number, bank: string) { this.pads = pads; this.bank = bank; this.doc = codeDoc(pads, bpm, bank); }

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

  /** Crystal shards: back-face culled, painter-sorted, 3-level hard light, depth fades to sparse dither, ridge lines. */
  private depth(buf: Uint32Array, W: number, H: number, FG: number, BG: number) {
    const tris = depthMesh({ t: this.t * (this.bpm / 120), phase: this.phase, amp: .35 + this.level * .25 + this.kick * .5, warp: .6 + this.tone * 1.2, detail: this.hat, seed: this.seed, twist: this.twist, lo: this.lo });
    const scale = Math.min(W, H) * .5 * this.size, ax = .35 + Math.sin(this.t * .05) * .2, ay = this.ry, F = 2.2;
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
      const ink = this.color ? (x: number, y: number) => cosineColor(x / W, 1 - y / H, this.t, .1 + .9 * f.s, f.z * .55 + this.kick * .15) : undefined;
      tri(buf, W, H, f.P, f.s, FG, BG, ink);
      if (f.spike) { const c = this.color ? cosineColor(f.P[2][0] / W, 1 - f.P[2][1] / H, this.t, .45 + f.s * .45, f.z * .55) : f.s > .6 ? BG : FG; line(buf, W, H, f.P[0], f.P[2], c); line(buf, W, H, f.P[1], f.P[2], c); }
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
        buf[y * W + x] = this.color ? cosineColor(x / W, 1 - y / H, this.t, .28 + .72 * Math.max(0, Math.min(1, v)), push + this.tone * Math.sin(ny * 3) * .2) : v > BAYER[br + (x & 7)] ? FG : BG;
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
    const data = context.getImageData(0, 0, W, H).data;
    if (!this.color) ditherCamera(data, buf, W, H, FG, BG, this.kick, this.level);
    else for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, l = (data[i] * .299 + data[i + 1] * .587 + data[i + 2] * .114) / 255;
      const light = Math.max(0, Math.min(1, (l - .5) * (1.12 + this.level * .45) + .5 + this.kick * .14));
      // Luminance preserves the face/image; ordered quantisation keeps the pixel texture.
      const q = Math.min(1, (Math.floor(light * 6) + (light * 6 % 1 > BAYER[(y & 7) * 8 + (x & 7)] ? 1 : 0)) / 6);
      buf[y * W + x] = cosineColor(x / W, 1 - y / H, this.t, q, l * .4);
    }
  }

  /** Live-code text on solid line strips, one shared step grid pinned above the control bar. */
  private text(c: CanvasRenderingContext2D, tw: number, th: number, dpr: number, fg: string, bg: string) {
    const fs = Math.round(Math.max(10, Math.min(tw / dpr / 70, th / dpr / 38)) * dpr), lh = Math.round(fs * 1.3);
    const FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace", mono = `${fs}px ${FONT}`;
    c.textBaseline = "middle"; c.lineJoin = "round"; c.font = mono;
    const pad = Math.round(fs * .7), cw = c.measureText("M").width, gut = cw * 4, x0 = pad + gut;
    const tick = this.running ? Math.floor(this.beat * 4) : this.step, byPad = new Map(this.pads.map(p => [p.index, p]));
    const ink = (s: string, X: number, Y: number, alpha = 1) => { c.globalAlpha = alpha; c.fillStyle = fg; c.fillText(s, X, Y); c.globalAlpha = 1; };
    // Step grid geometry (bottom), so code knows where to stop.
    const barH = 52 * dpr, rows = this.pads.length, cell = Math.max(4 * dpr, Math.min(lh * .8, (th * .32) / Math.max(1, rows)));
    const gridH = rows ? rows * cell + lh * 1.2 : 0, gridTop = th - barH - gridH, codeEnd = gridTop - lh * .3;
    const TOK = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|`[^`]*`?)|(\.[a-zA-Z_]+)|(\b\d*\.?\d+\b)|(_?[a-z]+:)|([^"`./\d_a-z]+|.)/g;
    let y = lh * 1.1;
    if (this.t < this.hudUntil) { const m = this.hudMsg.toLowerCase(); c.fillStyle = bg; c.fillRect(tw - pad - c.measureText(m).width - cw, y - lh / 2, c.measureText(m).width + cw * 1.5, lh); ink(m, tw - pad - c.measureText(m).width, y); }
    this.doc.forEach((ln, li) => {
      if (y > codeEnd) return;
      if (ln.text) { c.fillStyle = bg; c.globalAlpha = .92; c.fillRect(pad - cw * .3, y - lh / 2, gut + (ln.text.length + .6) * cw, lh); c.globalAlpha = 1; }
      ink(String(li + 1).padStart(3, " "), pad, y, .35);
      const a0 = ln.muted ? .45 : 1;
      let m: RegExpExecArray | null; TOK.lastIndex = 0;
      while ((m = TOK.exec(ln.text)) && m[0]) {
        const X = x0 + m.index * cw, a = m[1] ? .45 : m[2] ? 1 : m[3] ? .75 : m[4] ? .9 : m[5] ? 1 : .85;
        if (m[3] || m[5]) { c.font = `bold ${fs}px ${FONT}`; ink(m[0], X, y, a * a0); c.font = mono; } else ink(m[0], X, y, a * a0);
      }
        if (!ln.muted && this.running) for (const l of ln.layers ?? []) {
        const p = byPad.get(l.pad); if (!p || p.mute) continue;
        const at = activeAtom(l, p.steps, tick);
        if (at) { c.strokeStyle = this.color ? colorCss(cosineColor((x0 + at.at * cw) / tw, 1 - y / th, this.t)) : fg; c.lineWidth = Math.max(1, dpr); c.strokeRect(x0 + at.at * cw - dpr, y - lh * .42, at.len * cw + 2 * dpr, lh * .84); }
      }
      y += lh;
    });
    if (rows) this.grid(c, pad, gridTop, tw - pad * 2, cell, lh, fg, bg, tick, dpr, cw);
  }

  /** One step sequencer for every active pad: label column, 16 cells, brightness = velocity, ties as bars, playhead. */
  private grid(c: CanvasRenderingContext2D, x: number, y: number, w: number, cell: number, lh: number, fg: string, bg: string, tick: number, dpr: number, cw: number) {
    const lab = cw * 4.5, n = 16, cwid = Math.min(cell * 2.2, (w - lab) / n), gw = lab + n * cwid, h = this.pads.length * cell;
    c.fillStyle = bg; c.fillRect(x - dpr * 3, y, gw + dpr * 6, h + lh * 1.2);
    c.fillStyle = fg; c.fillRect(x - dpr * 3, y, gw + dpr * 6, dpr);
    const top = y + lh * .6;
    this.pads.forEach((p, r) => {
      const Y = top + r * cell, len = Math.max(1, p.steps.length), cur = ((tick % len) + len) % len;
      c.globalAlpha = p.mute ? .35 : .8; c.fillStyle = fg; c.fillText(padWord(p), x, Y + cell / 2); c.globalAlpha = 1;
      for (let i = 0; i < n && i < len; i++) {
        const v = p.steps[i], X = x + lab + i * cwid;
        c.fillStyle = this.color ? colorCss(cosineColor(i / n, 1 - r / Math.max(1, this.pads.length), this.t)) : fg;
        if (i % 4 === 0) { c.globalAlpha = .25; c.fillRect(X, Y + cell / 2 - dpr / 2, dpr, dpr); c.globalAlpha = 1; }
        if (v) { c.globalAlpha = (p.mute ? .35 : 1) * (v >= 2 ? .5 : .4 + .6 * (p.vel[i] ?? 1)); c.fillRect(X + (v >= 2 ? 0 : dpr), Y + dpr, v >= 2 ? cwid : cwid - 2 * dpr, cell - 2 * dpr); c.globalAlpha = 1; }
        if (this.running && i === cur % n) { c.strokeStyle = this.color ? c.fillStyle : fg; c.lineWidth = dpr; c.strokeRect(X, Y, cwid, cell); }
      }
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
