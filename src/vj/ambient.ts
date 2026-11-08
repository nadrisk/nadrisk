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
  return tunnelField(nx, ny, a);
}

/** Winding centre of the wormhole at travel depth z (smooth, continuous). */
export function tunnelPath(z: number): [number, number] {
  return [Math.sin(z * .23) * .5 + Math.sin(z * .071 + 1.3) * .35, Math.cos(z * .19) * .3 + Math.sin(z * .053) * .25];
}

/** Curved jungle wormhole: centre sways with depth, vine-banded walls, leaf veins, fog, kick pulses and a glowing far end. */
export function tunnelField(nx: number, ny: number, a: AmbientInput): number {
  const s = a.size, t = a.t * (.45 + a.level * .25), throat = .32 * s * (1 + a.tone * .08);
  // Two-pass sway: estimate depth, shift the centre to where the path is at that depth, re-solve.
  let r = Math.hypot(nx, ny) + 1e-4, z = throat / r;
  for (let k = 0; k < 2; k++) {
    const p = tunnelPath(t + z), q = tunnelPath(t);
    const fall = Math.min(1, z * .25);
    const dx = nx - (p[0] - q[0]) * .35 * fall, dy = ny - (p[1] - q[1]) * .35 * fall;
    r = Math.hypot(dx, dy) + 1e-4; z = throat / r;
    if (k === 1) {
      const ang = Math.atan2(dy, dx), d = z + t;
      const vine = .5 + .5 * Math.sin(ang * 3 + Math.sin(d * 1.7) * 1.6 + d * .4);
      const band = .5 + .5 * Math.sin(d * 4.2 + Math.sin(ang * 2 + d * .6) * 1.2);
      const leaf = Math.pow(Math.abs(Math.sin(ang * 5 + d * 2.3 + Math.sin(d * .9) * 2)), 6);
      const ripple = a.kick * .25 * Math.sin(d * 9 - a.t * 6);
      let v = vine * .45 + band * .35 + leaf * .35 + ripple;
      const fog = Math.min(1, Math.pow(r * 2.1, 1.4));
      v *= fog * (.75 + a.level * .3);
      const pulse = a.kick * Math.exp(-Math.abs(r - (.12 + (1 - a.kick) * .6)) * 18) * .6;
      const glow = (.18 + a.tone * .5) * Math.exp(-r * r * 60);
      return Math.max(0, Math.min(1, v + pulse + glow));
    }
  }
  return 0;
}
