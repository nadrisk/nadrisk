// Laid-back 90s ambient fields: slow aurora ribbons, liquid plasma and a rotating tunnel. Pure functions returning 0..1.
export type AmbientModel = "AURORA" | "PLASMA" | "TUNNEL";
export type AmbientInput = { t: number; kick: number; tone: number; level: number; size: number };

/** nx, ny are centred coordinates with aspect applied (x spans wider than y). */
export function ambientField(m: AmbientModel, nx: number, ny: number, a: AmbientInput): number {
  const s = 1 / a.size, t = a.t;
  if (m === "AURORA") {
    let v = 0;
    for (let k = 0; k < 3; k++) {
      const yy = ny * s + .25 * Math.sin(nx * (1.3 + k * .6) * s + t * (.12 + k * .05) + k * 2) + (k - 1) * .22 + Math.sin(t * .07 + k) * .1;
      v += Math.exp(-(yy * yy) / (.01 + .006 * k + a.tone * .01)) * (.55 - k * .1) * (.7 + .3 * Math.sin(nx * 6 + t * .3 + k));
    }
    return Math.min(1, v * (.8 + a.level * .3) + a.kick * .08);
  }
  if (m === "PLASMA") {
    const x = nx * 2.2 * s, y = ny * 2.2 * s;
    const v = Math.sin(x + t * .23) + Math.sin(y * 1.1 - t * .17) + Math.sin((x + y) * .7 + t * .11) + Math.sin(Math.hypot(x + Math.sin(t * .09) * 2, y + Math.cos(t * .13) * 2) * 1.4 - t * .3);
    const n = v / 4 * .5 + .5;
    return Math.min(1, Math.pow(n, 1.6) * (.85 + a.level * .3) + a.kick * .06);
  }
  const r = Math.hypot(nx, ny) + 1e-4, ang = Math.atan2(ny, nx);
  const depth = .35 * s / r + t * .35 + a.kick * .2;
  const rings = .5 + .5 * Math.sin(depth * 6), spokes = .5 + .5 * Math.sin(ang * 6 + t * .15 + depth * .5);
  return Math.min(1, (rings * .7 + spokes * .3) * Math.min(1, r * 2.2) * (.75 + a.level * .3));
}
