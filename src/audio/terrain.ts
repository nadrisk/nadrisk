// SURF wave terrain: z = f(x, y) evaluated per sample along an orbit around the XY puck.
// Pure math shared by the audio worklet and the 1-bit screen so sound and picture agree.
export interface TerrainParams { freq: number; hold: number; snow: number; fold: number }
export const TERRAIN_DEFAULTS: TerrainParams = { freq: 0.25, hold: 0, snow: 0, fold: 0 };

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// Deterministic hash noise so SNOW is repeatable for the screen.
function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

/** Wavefold into [-1, 1]. */
export function wavefold(v: number): number {
  const t = (v + 1) * 0.25;
  return 4 * Math.abs(t - Math.floor(t + 0.5)) - 1;
}

/** Taper FOLD/SNOW with pitch so high notes stay below Nyquist harshness. */
export function pitchTaper(hz: number): number {
  return hz <= 261.6 ? 1 : clamp(261.6 / hz, 0.15, 1);
}

/** Height at (x, y) in [-1, 1]^2. Output in [-1, 1]. */
export function terrainAt(x: number, y: number, p: TerrainParams, taper = 1): number {
  const k = 1 + p.freq * 7;                 // FREQ: raster density
  const xs = x + p.hold * 0.8 * y;          // HOLD: horizontal shear (TV hold)
  let z = Math.sin(Math.PI * k * xs) * Math.cos(Math.PI * k * 0.5 * y)
        + 0.35 * Math.sin(Math.PI * (k * 0.5) * (xs + y));
  z /= 1.35;
  const sn = p.snow * taper;
  if (sn > 0) z = z * (1 - sn * 0.5) + sn * 0.5 * hash(Math.round(xs * 64), Math.round(y * 64));
  const fd = p.fold * taper;
  if (fd > 0) z = wavefold(z * (1 + fd * 4));
  return clamp(z, -1, 1);
}

/** Orbit point for phase in [0,1): circle of radius r around (cx, cy). */
export function orbit(phase: number, cx: number, cy: number, r: number): [number, number] {
  const a = phase * 2 * Math.PI;
  return [clamp(cx + r * Math.cos(a), -1, 1), clamp(cy + r * Math.sin(a), -1, 1)];
}
