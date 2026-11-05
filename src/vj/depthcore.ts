// Depthcore backdrop geometry: one fan of twisted, tapered ribbons spiralling from a core. Pure; no satellites or particles.
export type V3 = [number, number, number];
export type Facet = { p: [V3, V3, V3]; edge: boolean; layer: number };
export type DepthParams = { t: number; open: number; twist: number; ribbons?: number };

export const MAX_RIBBONS = 40;
const SEG = 12;

/** World-space facets for the whole composition. `open` widens the fan (kick), `twist` adds torsion (synths). */
export function depthcore({ t, open, twist, ribbons = 30 }: DepthParams): Facet[] {
  const n = Math.max(8, Math.min(MAX_RIBBONS, Math.round(ribbons))), out: Facet[] = [];
  for (let i = 0; i < n; i++) {
    const f = i / n, layer = i % 3; // 0 front, 2 back
    const base = f * Math.PI * 2 * (.62 + open * .12) + t * .07 + Math.sin(t * .05 + i) * .04;
    const len = .75 + .45 * Math.abs(Math.sin(i * 2.17 + 1.3)), curl = 1.6 + .5 * Math.sin(i * 1.31) + twist * .4;
    const w0 = (.07 + .06 * Math.abs(Math.sin(i * 3.7))) * (1 - layer * .25), lift = (layer - 1) * .35;
    const pts: [V3, V3][] = [];
    for (let s = 0; s <= SEG; s++) {
      const u = s / SEG, R = .08 + u * len * (1 + open * .25), a = base + u * curl;
      const c: V3 = [Math.cos(a) * R, Math.sin(a) * R * .82, Math.sin(u * Math.PI) * lift + Math.sin(a * 2 + t * .1) * .05];
      const tw = u * (2.4 + twist * 1.5) + i * .9 + t * .12, w = w0 * Math.sin(Math.PI * Math.min(1, u * 1.15 + .05)) * (1 - u * .35);
      // Width direction: rotate between the radial-perpendicular in-plane and the depth axis.
      const px = -Math.sin(a), py = Math.cos(a) * .82, ct = Math.cos(tw), st = Math.sin(tw);
      const d: V3 = [px * ct * w, py * ct * w, st * w * 1.3];
      pts.push([[c[0] - d[0], c[1] - d[1], c[2] - d[2]], [c[0] + d[0], c[1] + d[1], c[2] + d[2]]]);
    }
    for (let s = 0; s < SEG; s++) {
      const [a0, b0] = pts[s], [a1, b1] = pts[s + 1];
      out.push({ p: [a0, b0, b1], edge: false, layer }, { p: [a0, b1, a1], edge: true, layer });
    }
  }
  return out;
}
