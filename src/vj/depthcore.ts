// Generative Depthcore: one low-poly crystal. Each facet of a morphing base (sphere → torus → ribbon fan) is
// pushed out along its own normal by stepped ridged noise; tall facets become sharp pyramid shards.
import { makeNoise } from "./noise";

export type V3 = [number, number, number];
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const PHI = (1 + Math.sqrt(5)) / 2;

export function icosphere(level: number) {
  const vs: V3[] = [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]].map(v => norm(v as V3));
  let fs = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let l = 0; l < level; l++) {
    const cache = new Map<number, number>(), mid = (a: number, b: number) => {
      const k = a < b ? a * 65536 + b : b * 65536 + a; let i = cache.get(k);
      if (i === undefined) { const p = vs[a], q = vs[b]; i = vs.push(norm([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2])) - 1; cache.set(k, i); }
      return i;
    };
    fs = fs.flatMap(([a, b, c]) => { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]; });
  }
  return { v: vs, f: fs };
}

export const MESHES = { hi: icosphere(2), lo: icosphere(1) };
export const MAX_FACES = MESHES.hi.f.length;

function base(d: V3, w: [number, number, number], twist: number): V3 {
  const u = Math.atan2(d[1], d[0]), v = Math.asin(Math.max(-1, Math.min(1, d[2])));
  const tor: V3 = [(0.72 + .34 * Math.cos(v * 2)) * Math.cos(u), (0.72 + .34 * Math.cos(v * 2)) * Math.sin(u), .34 * Math.sin(v * 2)];
  const f = (u + Math.PI) / (Math.PI * 2), r = .25 + f * .9, a = u + f * (1.8 + twist), tw = f * 3 + twist;
  const fan: V3 = [Math.cos(a) * r, Math.sin(a) * r * .82, v * .3 * Math.cos(tw) + Math.sin(f * Math.PI) * .2];
  return [0, 1, 2].map(k => d[k] * w[0] + tor[k] * w[1] + fan[k] * w[2]) as V3;
}

/** Smooth weights for sphere → torus → fan → sphere over `phase` (one full loop per 3 units). */
export function morphWeights(phase: number): [number, number, number] {
  const x = ((phase % 3) + 3) % 3, i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f), w: [number, number, number] = [0, 0, 0];
  w[i] = 1 - s; w[(i + 1) % 3] = s; return w;
}

export type DepthState = { t: number; phase: number; amp: number; warp: number; detail: number; seed: number; twist: number; lo?: boolean };
export type Shard = { p: [V3, V3, V3]; spike: boolean };
const noise = makeNoise(9);
export const MAX_LIFT = 1.6;

/** Triangles of the crystal. amp 0 returns the bare faceted base. */
export function depthMesh(s: DepthState): Shard[] {
  const mesh = s.lo ? MESHES.lo : MESHES.hi, w = morphWeights(s.phase), t = s.t * .12, o = s.seed * 17.3;
  const B = mesh.v.map(d => base(d, w, s.twist)), out: Shard[] = [];
  for (const [ia, ib, ic] of mesh.f) {
    const A = B[ia], Bv = B[ib], C = B[ic];
    const c: V3 = [(A[0] + Bv[0] + C[0]) / 3, (A[1] + Bv[1] + C[1]) / 3, (A[2] + Bv[2] + C[2]) / 3];
    let n = norm(cross(sub(Bv, A), sub(C, A)));
    if (n[0] * c[0] + n[1] * c[1] + n[2] * c[2] < 0) n = [-n[0], -n[1], -n[2]];
    if (!s.amp) { out.push({ p: [A, Bv, C], spike: false }); continue; }
    const x = c[0] * 1.4 + o, y = c[1] * 1.4 + t, z = c[2] * 1.4 - t * .5;
    const r = noise.ridged(x, y, z, 3) + noise.warped(x * .6, y * .6, z * .6, s.warp) * .3 + (s.detail > .01 ? noise.n3(x * 5, y * 5, z * 5) * .25 * s.detail : 0);
    const h = Math.max(0, Math.min(1, Math.round(r * 4) / 4)), lift = Math.min(MAX_LIFT, h * h * s.amp * 2.2);
    if (lift < .04) { out.push({ p: [A, Bv, C], spike: false }); continue; }
    // Shard: sharp apex above the face, slightly shrunk base so neighbours read as separate crystals.
    const sh = (q: V3): V3 => [c[0] + (q[0] - c[0]) * .92, c[1] + (q[1] - c[1]) * .92, c[2] + (q[2] - c[2]) * .92];
    const a = sh(A), b = sh(Bv), cc = sh(C), ap: V3 = [c[0] + n[0] * lift, c[1] + n[1] * lift, c[2] + n[2] * lift];
    out.push({ p: [a, b, ap], spike: true }, { p: [b, cc, ap], spike: true }, { p: [cc, a, ap], spike: true });
  }
  return out;
}
