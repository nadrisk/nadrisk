// 1-bit software 3D renderer: one morphing polyhedron, flat-lit and Bayer-dithered into two theme colours.
import type { VjKind, VjPad } from "./bus";
import type { VjCamera } from "./camera";
import { BAYER, ditherCamera } from "./raster";
import { cameraHud } from "./cameraHud";
import { MODELS, hasSatellites, vectorSegments, wireRadius, type Reaction, type Segment } from "./models";
import { opticalField } from "./fields";
import { matrixCells, pushEvent, type MatrixEvent } from "./matrix";
export { MODELS } from "./models";

type V3 = [number, number, number];
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const PHI = (1 + Math.sqrt(5)) / 2;

// Icosphere: the shared cage every solid is projected onto, so any two shapes interpolate vertex by vertex.
function icosphere(level: number) {
  const vs: V3[] = [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]].map(v => norm(v as V3));
  let fs = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const ico = { v: vs.slice(), f: fs.slice() }; let f1 = fs;
  for (let l = 0; l < level; l++) {
    const cache = new Map<string, number>(), mid = (a: number, b: number) => {
      const k = a < b ? `${a}_${b}` : `${b}_${a}`; let i = cache.get(k);
      if (i === undefined) { const p = vs[a], q = vs[b]; i = vs.push(norm([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2])) - 1; cache.set(k, i); }
      return i;
    };
    fs = fs.flatMap(([a, b, c]) => { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]; });
    if (l === 0) f1 = fs;
  }
  return { v: vs, f: fs, ico, f1 };
}

const cage = icosphere(4);
// Wireframe edges come from the level-1 cage (its 42 vertices are the first 42 of the full cage).
const EDGES = (() => { const e = new Set<string>(); for (const [a, b, c] of cage.f1) for (const [x, y] of [[a, b], [b, c], [c, a]]) e.add(x < y ? `${x}_${y}` : `${y}_${x}`); return [...e].map(k => k.split("_").map(Number)); })();
const signs = (n: number) => Array.from({ length: 1 << n }, (_, m) => Array.from({ length: n }, (_, k) => (m >> k) & 1 ? -1 : 1));
// Each solid = its face normals. Radius along a direction d is 1 / max(n·d), rescaled so every solid has unit circumradius.
const SOLIDS: { name: string; n: V3[] }[] = [
  { name: "OCTA", n: signs(3).map(s => norm(s as V3)) },
  { name: "TETRA", n: signs(3).filter(s => s[0] * s[1] * s[2] > 0).map(s => norm(s as V3)) },
  { name: "CUBE", n: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] },
  { name: "ICOSA", n: cage.ico.f.map(([a, b, c]) => norm([0, 1, 2].map(k => cage.ico.v[a][k] + cage.ico.v[b][k] + cage.ico.v[c][k]) as V3)) },
  { name: "DODECA", n: cage.ico.v },
  { name: "SPHERE", n: [] },
];
const RADII = SOLIDS.map(({ n }) => {
  if (!n.length) return cage.v.map(() => 1);
  const r = cage.v.map(d => 1 / Math.max(...n.map(m => m[0] * d[0] + m[1] * d[1] + m[2] * d[2])));
  const mx = Math.max(...r); return r.map(x => x / mx);
});
const ORDER = [0, 2, 1, 4, 3, 5];
// MATRIX instances use a light level-1 cage so 64 shaded solids stay cheap.
const mini = icosphere(1);
const MINI_RADII = RADII.map(r => r.slice(0, mini.v.length)); // octa → cube → tetra → dodeca → icosa → sphere → …

const STARS: V3[] = Array.from({ length: 260 }, (_, i) => { const y = 1 - 2 * (i + 0.5) / 260, r = Math.sqrt(1 - y * y), a = i * 2.39996; return [Math.cos(a) * r, y, Math.sin(a) * r] as V3; });

const rot = (v: V3, ax: number, ay: number, az: number): V3 => {
  let [x, y, z] = v; let c = Math.cos(ax), s = Math.sin(ax); [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ay); s = Math.sin(ay); [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(az); s = Math.sin(az); [x, y] = [x * c - y * s, x * s + y * c]; return [x, y, z];
};

export class VjEngine {
  // Ambient state (always moving) plus decaying audio envelopes.
  t = 0; morph = 0; rx = 0; ry = 0; rz = 0; env = 0; lightA = 0;
  kick = 0; snare = 0; hat = 0; kal = 0; tone = 0; level = 0; flash = 0; spinX = 0; spinY = 0; envSpin = 0;
  last = ""; model = 0; size = 1; fade = 1; hudUntil = 0; hudMsg = "";
  beat = 0; bpm = 120; running = false; snap = 0; wave: number[] = [];
  pad?: VjPad; velocity = 0; peak = 0; rms = 0; step = 0; bank = "A"; theme = "oled";
  camera?: VjCamera;
  private cameraCanvas = document.createElement("canvas");
  private signalUntil = 0;
  private invertPending = false; private lastInvert = -10;
  private prevR: number[] | null = null; private curR: number[] = [];
  private buf: Uint32Array | null = null; private img: ImageData | null = null; private w = 0; private h = 0;
  private small = document.createElement("canvas");
  private events: MatrixEvent[] = [];

  signal(wave: readonly number[], beat: number, bpm: number, running: boolean, peak = 0, rms = 0, step = 0, bank = "A") {
    this.wave = wave.slice(0, 128).map(v => Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0);
    if (Number.isFinite(beat)) this.beat = Math.max(0, beat);
    if (Number.isFinite(bpm)) this.bpm = Math.max(30, Math.min(300, bpm));
    this.running = running; this.signalUntil = this.t + .3;
    this.peak = Number.isFinite(peak) ? Math.max(0, peak) : 0;
    this.rms = Number.isFinite(rms) ? Math.max(0, rms) : 0;
    this.step = Number.isFinite(step) ? Math.max(0, Math.floor(step)) : 0; this.bank = bank;
  }

  reaction(): Reaction { return { kick: this.kick, snare: this.snare, hat: this.hat, perc: this.kal, tone: this.tone, snap: this.snap }; }

  hit(kind: VjKind, vel: number, pad?: VjPad) {
    const v = Number.isFinite(vel) ? Math.max(0.2, Math.min(1, vel)) : 1;
    this.last = kind.toUpperCase();
    this.velocity = Number.isFinite(vel) ? Math.max(0, Math.min(1, vel)) : 0;
    if (pad) this.pad = pad;
    pushEvent(this.events, { at: this.t, kind, vel: v });
    if (kind === "kick") { this.kick = Math.max(this.kick, v); this.flash = Math.max(this.flash, v); }
    else if (kind === "snare") { this.snare = Math.max(this.snare, v); this.spinX += (Math.random() < .5 ? -1 : 1) * 0.9 * v; this.snap = (this.snap + Math.PI / 2) % (Math.PI * 2); }
    else if (kind === "hat") { this.hat = Math.max(this.hat, v * 0.6); this.envSpin += 0.12 * v; }
    else if (kind === "open" || kind === "perc") { this.kal = Math.max(this.kal, v); this.spinY += 0.6 * v; }
    else { this.tone = Math.max(this.tone, v); this.morph += 0.18 * v; }
    // A local, one-frame optical accent; never a sustained full-screen strobe.
    if (kind === "snare" && v >= .95 && this.t - this.lastInvert > .8) { this.invertPending = true; this.lastInvert = this.t; }
  }

  /** Step model (±1) and/or size (±1); the previous shape crossfades into the next. */
  ctl(dm: number, ds: number) {
    if (dm) { this.prevR = this.curR.slice(); this.fade = 0; this.model = ((this.model + dm) % MODELS.length + MODELS.length) % MODELS.length; this.hudMsg = MODELS[this.model]; }
    if (ds) { this.size = Math.round(Math.max(0.4, Math.min(2.2, this.size + ds * 0.1)) * 10) / 10; this.hudMsg = `SIZE ${Math.round(this.size * 100)}%`; }
    this.hudUntil = this.t + 1.6;
  }

  shapeName() { const m = MODELS[this.model]; if (m !== "POLY" && m !== "WIRE") return m; const i = Math.floor(this.morph); return `${m} ${SOLIDS[ORDER[i % 6]].name}>${SOLIDS[ORDER[(i + 1) % 6]].name}`; }

  private radii() {
    const m = MODELS[this.model], i0 = Math.floor(this.morph), f = this.morph - i0, u = f * f * (3 - 2 * f);
    const A = RADII[ORDER[i0 % 6]], B = RADII[ORDER[(i0 + 1) % 6]];
    let r = A.map((a, j) => a + (B[j] - a) * u);
    if (this.prevR && this.fade < 1) { const e = this.fade * this.fade * (3 - 2 * this.fade), P = this.prevR; r = r.map((x, j) => P[j] + (x - P[j]) * e); }
    this.curR = r; return r;
  }


  frame(cv: HTMLCanvasElement, fg: number, bg: number, dt: number) {
    dt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.05)) : 0; this.t += dt;
    if (this.running && this.t < this.signalUntil) this.beat += dt * this.bpm / 60;
    else if (this.t >= this.signalUntil) this.running = false;
    if (this.t >= this.signalUntil) { this.wave = []; this.peak = 0; this.rms = 0; this.level *= Math.exp(-8 * dt); }
    const phase = this.running ? Math.floor(this.beat * 16) / 16 : this.t * this.bpm / 60;
    const k = (r: number) => Math.exp(-r * dt);
    this.kick *= k(5); this.snare *= k(4); this.hat *= k(9); this.kal *= k(1.6); this.tone *= k(2); this.flash *= k(18);
    // Continuous motion: slow irrational tumbling, morph always drifting, impulses eased in.
    const ease = 1 - k(6);
    const sx = this.spinX * ease, sy = this.spinY * ease, se = this.envSpin * ease;
    this.spinX -= sx; this.spinY -= sy; this.envSpin -= se;
    const tempo = this.bpm / 120;
    this.rx += dt * tempo * (0.21 + this.level * 0.4) + sx; this.ry += dt * tempo * (0.34 + this.level * 0.6) + sy; this.rz += dt * tempo * 0.13;
    this.env += dt * 0.03 + se; this.lightA += dt * 0.25;
    this.morph += dt * 0.06; this.fade = Math.min(1, this.fade + dt * 2.2);

    const px = Math.max(2, Math.round(cv.clientHeight / 260));
    const W = Math.max(64, Math.floor(cv.clientWidth / px)), H = Math.max(36, Math.floor(cv.clientHeight / px));
    if (W !== this.w || H !== this.h) { this.w = W; this.h = H; this.small.width = W; this.small.height = H; this.img = new ImageData(W, H); this.buf = new Uint32Array(this.img.data.buffer); }
    const buf = this.buf, img = this.img;
    if (!buf || !img) return;
    buf.fill(bg);
    const FG = fg, BG = bg;

    if (MODELS[this.model] === "CAM") {
      const camera = this.camera, video = camera?.video;
      if (camera?.status === "live" && video && video.readyState >= 2 && video.videoWidth > 0) {
        if (this.cameraCanvas.width !== W || this.cameraCanvas.height !== H) { this.cameraCanvas.width = W; this.cameraCanvas.height = H; }
        const context = this.cameraCanvas.getContext("2d", { willReadFrequently: true });
        if (context) {
          context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, W, H);
          const cover = Math.max(W / video.videoWidth, H / video.videoHeight) * this.size;
          const vw = video.videoWidth * cover, vh = video.videoHeight * cover;
          context.translate(W, 0); context.scale(-1, 1);
          context.drawImage(video, (W - vw) / 2, (H - vh) / 2, vw, vh);
          ditherCamera(context.getImageData(0, 0, W, H).data, buf, W, H, FG, BG, this.kick, this.level);
        }
      }
      cameraHud(buf, W, H, FG, BG, { pad: this.pad, vel: this.velocity, bpm: this.bpm, beat: this.beat, step: this.step, bank: this.bank, running: this.running, peak: this.peak, rms: this.rms, size: this.size, theme: this.theme, status: camera?.status ?? "off" });
      this.invertPending = false;
    } else {
    const cx = W / 2, cy = H / 2, focal = H * 1.1;
    const camZ = 3.4 - this.kick * 0.9 - Math.sin(this.t * 0.11) * 0.5;

    // Environment: a slowly rotating field of points around the camera.
    for (const s of MODELS[this.model] === "POLY" ? STARS : []) {
      const p = rot(s, this.env * 0.7, this.env, 0.2), z = p[2] * 6 + camZ;
      if (z < 0.5) continue;
      const x = Math.round(cx + p[0] * 6 * focal / z), y = Math.round(cy + p[1] * 6 * focal / z);
      if (x >= 0 && y >= 0 && x < W && y < H && (this.hat > 0.15 || ((x * 7 + y * 13) & 3) !== 0)) buf[y * W + x] = FG;
    }

    // Morph radii between two consecutive solids with a smoothstep.
    const R = this.radii(), wire = MODELS[this.model] === "WIRE";
    const scale = (1 + this.kick * 0.12 + this.level * 0.08) * this.size * Math.min(1, W / H);
    const light = norm([Math.cos(this.lightA) * 0.9, 0.55 + Math.sin(this.lightA * 0.7) * 0.3, -0.8]);
    const amb = 0.04 + this.level * 0.06, gain = 0.85 + this.level * 0.5 + this.flash * 0.4;
    const explode = this.snare * 0.35 + this.kal * 0.12;
    const audio = this.reaction();
    const model = MODELS[this.model];
    const field = opticalField(model, phase, audio, this.wave);
    const drawField = (segments: Segment[]) => {
      const project = (p: V3) => {
        // Measurement planes keep their own gentle drift rather than obscuring the object with its tumble.
        const q = rot(p.map(x => x * scale) as V3, Math.sin(phase * .04) * .12, Math.sin(phase * .03) * .2, 0);
        const z = Math.max(.5, q[2] + camZ);
        return [cx + q[0] * focal / z, cy - q[1] * focal / z];
      };
      for (const [a, b] of segments) line(buf, W, H, project(a), project(b), FG);
    };
    drawField(field.back);

    const draw = (ox: number, oy: number, oz: number, sc: number, extraY: number, thresh = 1) => {
      const P = cage.v.map((d, j) => { const r = (wire ? wireRadius(R[j], d, audio) : R[j]) * sc; return rot([d[0] * r, d[1] * r, d[2] * r], this.rx, this.ry + extraY, this.rz); });
      if (wire) {
        const S = P.slice(0, 42).map(q => { const z = q[2] + oz + camZ; return [cx + (q[0] + ox) * focal / z, cy - (q[1] + oy) * focal / z]; });
        for (const [a, b] of EDGES) line(buf, W, H, S[a], S[b], FG);
        return;
      }
      const faces: { z: number; p: number[][]; shade: number }[] = [];
      for (const [a, b, c] of cage.f) {
        const pa = P[a], pb = P[b], pc = P[c];
        const e1 = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]], e2 = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]];
        const n = norm([e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]);
        const off = [n[0] * explode * sc, n[1] * explode * sc, n[2] * explode * sc];
        const pts = [pa, pb, pc].map(q => { const z = q[2] + off[2] + oz + camZ; return [cx + (q[0] + off[0] + ox) * focal / z, cy - (q[1] + off[1] + oy) * focal / z, z]; });
        // Back-face cull in screen space (camera looks down +z).
        const area = (pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) - (pts[2][0] - pts[0][0]) * (pts[1][1] - pts[0][1]);
        if (area >= 0) continue;
        const lam = Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
        faces.push({ z: (pts[0][2] + pts[1][2] + pts[2][2]) / 3, p: pts, shade: Math.min(1, (amb + lam * gain) * thresh) });
      }
      faces.sort((x, y) => y.z - x.z);
      for (const fc of faces) tri(buf, W, H, fc.p, fc.shade, FG, BG);
    };

    if (model === "MATRIX") {
      const cells = matrixCells(this.t, this.events, audio, this.wave);
      const tilt = .55 + Math.sin(this.t * .07) * .12, yaw = this.ry * .35, faces: { z: number; p: number[][]; shade: number }[] = [];
      const sc = scale * .68, proj = (q: V3) => { const z = Math.max(.35, q[2] + camZ); return [cx + q[0] * focal / z, cy - q[1] * focal / z, z]; };
      for (const c of cells) {
        const r = mini.v.map((_, j) => c.weights.reduce((a, w, k) => a + w * MINI_RADII[k][j], 0));
        const Pw = mini.v.map((d, j) => {
          const l = rot([d[0] * r[j] * c.scale, d[1] * r[j] * c.scale * c.stretch, d[2] * r[j] * c.scale], 0, c.spin, c.spin * .6);
          return rot([(l[0] + c.x) * sc, (l[1] + c.y - .15) * sc, (l[2] + c.z) * sc], tilt, yaw, 0);
        }), P = Pw.map(proj);
        if (c.wire) { for (const [a, b, d] of mini.f) { line(buf, W, H, P[a], P[b], FG); line(buf, W, H, P[b], P[d], FG); } continue; }
        for (const [a, b, d] of mini.f) {
          const pa = P[a], pb = P[b], pd = P[d];
          const area = (pb[0] - pa[0]) * (pd[1] - pa[1]) - (pd[0] - pa[0]) * (pb[1] - pa[1]);
          if (area >= 0) continue;
          // Screen-space facet normal for flat lighting.
          const wa = Pw[a], e1 = [Pw[b][0] - wa[0], Pw[b][1] - wa[1], Pw[b][2] - wa[2]], e2 = [Pw[d][0] - wa[0], Pw[d][1] - wa[1], Pw[d][2] - wa[2]];
          const n = norm([e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]);
          const lam = Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
          faces.push({ z: (pa[2] + pb[2] + pd[2]) / 3, p: [pa, pb, pd], shade: Math.min(1, amb + lam * gain) });
        }
      }
      faces.sort((x, y) => y.z - x.z);
      for (const fc of faces) tri(buf, W, H, fc.p, fc.shade, FG, BG);
    } else if (model === "POLY" || model === "WIRE") draw(0, 0, 0, scale, 0);
    else {
      const energy = this.kick + this.snare * .6 + this.tone * .3;
      const segments = vectorSegments(model, phase, energy, audio);
      // The medallion rocks rather than tumbling away from its readable face.
      const face = model === "SMILEY" || model === "EYE";
      const ax = face ? Math.sin(this.rx) * .3 : this.rx;
      const ay = face ? Math.sin(this.ry) * .65 : this.ry;
      const az = face ? Math.sin(this.rz) * .15 : this.rz;
      const sc = scale * (.8 + .2 * this.fade);
      const project = (p: V3) => {
        const q = rot(p.map(x => x * sc) as V3, ax, ay, az), z = Math.max(.35, q[2] + camZ);
        return [cx + q[0] * focal / z, cy - q[1] * focal / z];
      };
      for (const [a, b] of segments) line(buf, W, H, project(a), project(b), FG);
    }
    // Kaleidoscope expansion: mirrored satellites unfold from the core on open hats / percussion.
    if (hasSatellites(model) && this.kal > 0.04) {
      const n = 6, rad = 0.4 + this.kal * 1.6, sc = 0.14 + this.kal * 0.22;
      for (let j = 0; j < n; j++) { const a = j / n * Math.PI * 2 + this.t * 0.3; draw(Math.cos(a) * rad, Math.sin(a) * rad, 0.3, sc, j % 2 ? Math.PI : 0, 0.5 + this.kal); }
    }
    drawField(field.front);
    if (this.invertPending) {
      const quadrant = Math.floor(phase) % 4, left = quadrant % 2 === 0 ? 0 : Math.floor(W / 2), top = quadrant < 2 ? 0 : Math.floor(H / 2);
      // Only invert a narrow edge band, preserving the central contour and negative space.
      const endX = left + Math.floor(W / 2), endY = top + Math.floor(H / 2), band = Math.max(1, Math.floor(H / 90));
      for (let y = top; y < endY; y++) for (let x = left; x < endX; x++) {
        if (x - left < band || endX - x <= band || y - top < band || endY - y <= band) buf[y * W + x] = buf[y * W + x] === FG ? BG : FG;
      }
      this.invertPending = false;
    }
    }
    img.data.set(new Uint8ClampedArray(buf.buffer));
    const smallContext = this.small.getContext("2d");
    if (!smallContext) return;
    smallContext.putImageData(img, 0, 0);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const tw = Math.round(cv.clientWidth * dpr), th = Math.round(cv.clientHeight * dpr);
    if (cv.width !== tw || cv.height !== th) { cv.width = tw; cv.height = th; }
    const c = cv.getContext("2d");
    if (!c) return;
    c.imageSmoothingEnabled = false;
    c.drawImage(this.small, 0, 0, tw, th);
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
    const row = y * W, br = (y & 7) * 8;
    for (let x = l; x <= r; x++) buf[row + x] = shade > BAYER[br + (x & 7)] ? FG : BG;
  }
}

function line(buf: Uint32Array, W: number, H: number, a: number[], b: number[], c: number) {
  const n = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))) + 1;
  if (n > 4000) return;
  for (let i = 0; i <= n; i++) { const x = Math.round(a[0] + (b[0] - a[0]) * i / n), y = Math.round(a[1] + (b[1] - a[1]) * i / n); if (x >= 0 && y >= 0 && x < W && y < H) buf[y * W + x] = c; }
}
