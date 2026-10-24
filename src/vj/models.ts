// Sculpted VJ models as signed distance fields, sampled radially onto the shared icosphere cage
// so every model is just a radius per cage vertex and any two can crossfade vertex by vertex.
type P = [number, number, number];
const len = (x: number, y: number, z = 0) => Math.hypot(x, y, z);
const box = (p: P, c: P, b: P) => { const q = [Math.abs(p[0] - c[0]) - b[0], Math.abs(p[1] - c[1]) - b[1], Math.abs(p[2] - c[2]) - b[2]]; return len(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0)) + Math.min(Math.max(q[0], q[1], q[2]), 0); };
const sph = (p: P, c: P, r: number) => len(p[0] - c[0], p[1] - c[1], p[2] - c[2]) - r;
const ell = (p: P, c: P, r: P) => (len((p[0] - c[0]) / r[0], (p[1] - c[1]) / r[1], (p[2] - c[2]) / r[2]) - 1) * Math.min(...r);
const smin = (a: number, b: number, k: number) => { const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / k)); return b + (a - b) * h - k * h * (1 - h); };

const smiley = (p: P) => {
  let d = Math.max(len(p[0], p[1]) - 1, Math.abs(p[2]) - 0.26);
  d = Math.max(d, -ell(p, [-0.33, 0.3, 0.3], [0.11, 0.2, 0.16]), -ell(p, [0.33, 0.3, 0.3], [0.11, 0.2, 0.16]));
  const ring = Math.abs(len(p[0], p[1] - 0.05) - 0.58) - 0.07;
  const mouth = Math.max(ring, p[1] + 0.12, Math.abs(p[2] - 0.3) - 0.14);
  return Math.max(d, -mouth);
};
const skull = (p: P) => {
  let d = smin(ell(p, [0, 0.18, -0.05], [0.72, 0.72, 0.82]), box(p, [0, -0.45, 0.2], [0.34, 0.28, 0.42]), 0.25);
  d = smin(d, box(p, [0, -0.15, 0.3], [0.56, 0.16, 0.3]), 0.15);
  d = Math.max(d, -sph(p, [-0.28, 0.05, 0.62], 0.2), -sph(p, [0.28, 0.05, 0.62], 0.2), -ell(p, [0, -0.2, 0.68], [0.07, 0.11, 0.14]));
  return Math.max(d, -box(p, [0, -0.5, 0.62], [0.26, 0.025, 0.1]));
};
const pyramid = (p: P) => {
  const h = 0.62, k = Math.SQRT1_2;
  let d = Math.max(-p[1] - 0.7, (Math.abs(p[0]) + p[1] * h) * k - 0.45 * k * 1.2, (Math.abs(p[2]) + p[1] * h) * k - 0.45 * k * 1.2);
  d = Math.max(d, -ell(p, [0, -0.05, 0.62], [0.24, 0.11, 0.2]));
  return Math.min(d, sph(p, [0, -0.05, 0.5], 0.08));
};
const floppy = (p: P) => {
  let d = box(p, [0, 0, 0], [0.85, 0.85, 0.07]);
  d = Math.max(d, -box(p, [0.08, 0.6, 0.09], [0.36, 0.2, 0.04]), -box(p, [0, -0.35, 0.09], [0.6, 0.38, 0.03]));
  return Math.max(d, -box(p, [-0.62, -0.72, 0], [0.06, 0.06, 0.2]));
};
const pill = (p: P) => {
  const x = Math.max(Math.abs(p[0]) - 0.62, 0);
  return Math.max(len(x, p[1], p[2]) - 0.36, -box(p, [0, 0, 0], [0.025, 0.5, 0.5]));
};
const statue = (p: P) => {
  let d = ell(p, [0, 0.4, 0], [0.33, 0.42, 0.38]);
  d = smin(d, ell(p, [0, 0.36, 0.36], [0.06, 0.12, 0.08]), 0.05);
  d = smin(d, ell(p, [0, 0.62, -0.06], [0.37, 0.24, 0.38]), 0.12);
  d = smin(d, Math.max(len(p[0], p[2]) - 0.17, Math.abs(p[1] + 0.05) - 0.2), 0.1);
  d = smin(d, ell(p, [0, -0.52, -0.02], [0.92, 0.32, 0.42]), 0.15);
  d = Math.max(d, -sph(p, [-0.12, 0.45, 0.36], 0.05), -sph(p, [0.12, 0.45, 0.36], 0.05));
  return Math.max(d, -p[1] - 0.8);
};

export const SDF_MODELS: { name: string; f: (p: P) => number }[] = [
  { name: "SMILEY", f: smiley }, { name: "SKULL", f: skull }, { name: "EYE", f: pyramid },
  { name: "FLOPPY", f: floppy }, { name: "PILL", f: pill }, { name: "STATUE", f: statue },
];

/** Outermost surface along each direction, normalised so the model's furthest point sits at radius 1. */
export function radialSample(dirs: P[], f: (p: P) => number) {
  const r = dirs.map(d => {
    let hi = 0;
    for (let i = 60; i > 0; i--) { const t = i / 30; if (f([d[0] * t, d[1] * t, d[2] * t]) < 0) { hi = t; break; } }
    let a = hi, b = hi + 1 / 30;
    for (let i = 0; i < 14; i++) { const m = (a + b) / 2; if (f([d[0] * m, d[1] * m, d[2] * m]) < 0) a = m; else b = m; }
    return Math.max(0.02, a);
  });
  const mx = Math.max(...r); return r.map(x => x / mx);
}
