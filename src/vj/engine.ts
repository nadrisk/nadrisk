// 1-bit software 3D renderer: one morphing polyhedron, flat-lit and Bayer-dithered into two theme colours.
import type { VjKind } from "./bus";

type V3 = [number, number, number];
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const PHI = (1 + Math.sqrt(5)) / 2;

// Icosphere: the shared cage every solid is projected onto, so any two shapes interpolate vertex by vertex.
function icosphere(level: number) {
  const vs: V3[] = [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]].map(v => norm(v as V3));
  let fs = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const ico = { v: vs.slice(), f: fs.slice() };
  for (let l = 0; l < level; l++) {
    const cache = new Map<string, number>(), mid = (a: number, b: number) => {
      const k = a < b ? `${a}_${b}` : `${b}_${a}`; let i = cache.get(k);
      if (i === undefined) { const p = vs[a], q = vs[b]; i = vs.push(norm([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2])) - 1; cache.set(k, i); }
      return i;
    };
    fs = fs.flatMap(([a, b, c]) => { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]; });
  }
  return { v: vs, f: fs, ico };
}

const cage = icosphere(3);
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
const ORDER = [0, 2, 1, 4, 3, 5]; // octa → cube → tetra → dodeca → icosa → sphere → …

const BAYER = (() => { const m = [[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22], [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]]; return m.flat().map(x => (x + 0.5) / 64); })();

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
  last = "";
  private buf: Uint32Array | null = null; private img: ImageData | null = null; private w = 0; private h = 0;
  private small = document.createElement("canvas");

  hit(kind: VjKind, vel: number) {
    const v = Math.max(0.2, Math.min(1, vel));
    this.last = kind.toUpperCase();
    if (kind === "kick") { this.kick = Math.max(this.kick, v); this.flash = Math.max(this.flash, v); }
    else if (kind === "snare") { this.snare = Math.max(this.snare, v); this.spinX += (Math.random() < .5 ? -1 : 1) * 0.9 * v; }
    else if (kind === "hat") { this.hat = Math.max(this.hat, v * 0.6); this.envSpin += 0.12 * v; }
    else if (kind === "open" || kind === "perc") { this.kal = Math.max(this.kal, v); this.spinY += 0.6 * v; }
    else { this.tone = Math.max(this.tone, v); this.morph += 0.18 * v; }
  }

  shapeName() { const i = Math.floor(this.morph); return `${SOLIDS[ORDER[i % 6]].name}>${SOLIDS[ORDER[(i + 1) % 6]].name}`; }

  frame(cv: HTMLCanvasElement, fg: number, bg: number, dt: number) {
    dt = Math.min(dt, 0.05); this.t += dt;
    const k = (r: number) => Math.exp(-r * dt);
    this.kick *= k(5); this.snare *= k(4); this.hat *= k(9); this.kal *= k(1.6); this.tone *= k(2); this.flash *= k(18);
    // Continuous motion: slow irrational tumbling, morph always drifting, impulses eased in.
    const ease = 1 - k(6);
    const sx = this.spinX * ease, sy = this.spinY * ease, se = this.envSpin * ease;
    this.spinX -= sx; this.spinY -= sy; this.envSpin -= se;
    this.rx += dt * (0.21 + this.level * 0.4) + sx; this.ry += dt * (0.34 + this.level * 0.6) + sy; this.rz += dt * 0.13;
    this.env += dt * 0.03 + se; this.lightA += dt * 0.25;
    this.morph += dt * 0.06;

    const px = Math.max(2, Math.round(cv.clientHeight / 260));
    const W = Math.max(64, Math.floor(cv.clientWidth / px)), H = Math.max(36, Math.floor(cv.clientHeight / px));
    if (W !== this.w || H !== this.h) { this.w = W; this.h = H; this.small.width = W; this.small.height = H; this.img = new ImageData(W, H); this.buf = new Uint32Array(this.img.data.buffer); }
    const buf = this.buf!, img = this.img!;
    buf.fill(this.flash > 0.55 ? fg : bg);
    const inv = this.flash > 0.55;
    const FG = inv ? bg : fg, BG = inv ? fg : bg;

    const cx = W / 2, cy = H / 2, focal = H * 1.1;
    const camZ = 3.4 - this.kick * 0.9 - Math.sin(this.t * 0.11) * 0.5;

    // Environment: a slowly rotating field of points around the camera.
    for (const s of STARS) {
      const p = rot(s, this.env * 0.7, this.env, 0.2), z = p[2] * 6 + camZ;
      if (z < 0.5) continue;
      const x = Math.round(cx + p[0] * 6 * focal / z), y = Math.round(cy + p[1] * 6 * focal / z);
      if (x >= 0 && y >= 0 && x < W && y < H && (this.hat > 0.15 || ((x * 7 + y * 13) & 3) !== 0)) buf[y * W + x] = FG;
    }

    // Morph radii between two consecutive solids with a smoothstep.
    const i0 = Math.floor(this.morph), f = this.morph - i0, u = f * f * (3 - 2 * f);
    const A = RADII[ORDER[i0 % 6]], B = RADII[ORDER[(i0 + 1) % 6]];
    const scale = 1 + this.kick * 0.12 + this.level * 0.08;
    const light = norm([Math.cos(this.lightA), 0.6, Math.sin(this.lightA) + 0.4]);
    const amb = 0.08 + this.level * 0.1, gain = 0.85 + this.level * 0.5 + this.flash * 0.4;
    const explode = this.snare * 0.35 + this.kal * 0.12;

    const draw = (ox: number, oy: number, oz: number, sc: number, extraY: number, thresh = 1) => {
      const P = cage.v.map((d, j) => { const r = (A[j] + (B[j] - A[j]) * u) * sc; return rot([d[0] * r, d[1] * r, d[2] * r], this.rx, this.ry + extraY, this.rz); });
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
        const lam = Math.max(0, n[0] * light[0] + n[1] * light[1] - n[2] * light[2]);
        faces.push({ z: (pts[0][2] + pts[1][2] + pts[2][2]) / 3, p: pts, shade: Math.min(1, (amb + lam * gain) * thresh) });
      }
      faces.sort((x, y) => y.z - x.z);
      for (const fc of faces) tri(buf, W, H, fc.p, fc.shade, FG, BG);
    };

    draw(0, 0, 0, scale, 0);
    // Kaleidoscope expansion: mirrored satellites unfold from the core on open hats / percussion.
    if (this.kal > 0.04) {
      const n = 6, rad = 0.4 + this.kal * 1.6, sc = 0.14 + this.kal * 0.22;
      for (let j = 0; j < n; j++) { const a = j / n * Math.PI * 2 + this.t * 0.3; draw(Math.cos(a) * rad, Math.sin(a) * rad, 0.3, sc, j % 2 ? Math.PI : 0, 0.5 + this.kal); }
    }
    img.data.set(new Uint8ClampedArray(buf.buffer));
    this.small.getContext("2d")!.putImageData(img, 0, 0);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const tw = Math.round(cv.clientWidth * dpr), th = Math.round(cv.clientHeight * dpr);
    if (cv.width !== tw || cv.height !== th) { cv.width = tw; cv.height = th; }
    const c = cv.getContext("2d")!; c.imageSmoothingEnabled = false;
    c.drawImage(this.small, 0, 0, W * px * dpr, H * px * dpr);
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
