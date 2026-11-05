// Generative Depthcore: one dense mesh that morphs between sphere, torus and ribbon-fan bases, displaced along its normals by animated warped/ridged noise.
import { makeNoise } from "./noise";

export type V3 = [number, number, number];
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
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

export const MESHES = { hi: icosphere(3), lo: icosphere(2) };
export const MAX_VERTS = MESHES.hi.v.length;

/** Base shapes from a unit-sphere direction; returns position and outward direction for displacement. */
function base(d: V3, w: [number, number, number], twist: number): { p: V3; n: V3 } {
  const u = Math.atan2(d[1], d[0]), v = Math.asin(Math.max(-1, Math.min(1, d[2])));
  const tor: V3 = [(0.72 + .34 * Math.cos(v * 2)) * Math.cos(u), (0.72 + .34 * Math.cos(v * 2)) * Math.sin(u), .34 * Math.sin(v * 2)];
  const torN = norm([Math.cos(v * 2) * Math.cos(u), Math.cos(v * 2) * Math.sin(u), Math.sin(v * 2)]);
  const f = (u + Math.PI) / (Math.PI * 2), r = .18 + f * .95, a = u + f * (1.8 + twist), tw = f * 3 + twist;
  const fan: V3 = [Math.cos(a) * r, Math.sin(a) * r * .82, v * .22 * Math.cos(tw) + Math.sin(f * Math.PI) * .2];
  const fanN = norm([-Math.sin(a) * Math.sin(tw), Math.cos(a) * Math.sin(tw), Math.cos(tw)]);
  const p: V3 = [0, 1, 2].map(k => d[k] * w[0] + tor[k] * w[1] + fan[k] * w[2]) as V3;
  const n = norm([0, 1, 2].map(k => d[k] * w[0] + torN[k] * w[1] + fanN[k] * w[2] * Math.sign(d[2] || 1)) as V3);
  return { p, n };
}

/** Smooth weights for sphere → torus → fan → sphere over `phase` (one full loop per 3 units). */
export function morphWeights(phase: number): [number, number, number] {
  const x = ((phase % 3) + 3) % 3, i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f), w: [number, number, number] = [0, 0, 0];
  w[i] = 1 - s; w[(i + 1) % 3] = s; return w;
}

export type DepthState = { t: number; phase: number; amp: number; warp: number; detail: number; seed: number; twist: number; lo?: boolean };
const noise = makeNoise(9);

/** Displaced vertices and the face list. amp 0 leaves the base shape untouched. */
export function depthMesh(s: DepthState) {
  const mesh = s.lo ? MESHES.lo : MESHES.hi, w = morphWeights(s.phase), t = s.t * .18, o = s.seed * 17.3;
  const pts = mesh.v.map(d => {
    const { p, n } = base(d, w, s.twist);
    if (!s.amp) return p;
    const x = p[0] * 1.6 + o, y = p[1] * 1.6 + t, z = p[2] * 1.6 - t * .6;
    const r = noise.ridged(x * .9, y * .9, z * .9, 3);
    let h = noise.warped(x, y, z, s.warp) * .55 + r * r * .7 - .25;
    if (s.detail > .01) h += noise.n3(x * 6, y * 6, z * 6) * .12 * s.detail;
    const k = h * s.amp;
    return [p[0] + n[0] * k, p[1] + n[1] * k, p[2] + n[2] * k] as V3;
  });
  return { pts, faces: mesh.f, seam: (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) };
}
