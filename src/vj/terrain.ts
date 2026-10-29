// TERRAIN: an endless generative noise landscape flown through by a drifting camera.
// Pure functions (no DOM) so the generative maths is testable; the engine only projects and draws.
import type { Reaction } from "./models";

export const ROWS = 34, COLS = 56, DEPTH = 14, WIDTH = 9, SPEED = 1.4;

const hash = (x: number, y: number, s: number) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
};
const smooth = (t: number) => t * t * (3 - 2 * t);
export function noise(x: number, y: number, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), u = smooth(x - xi), v = smooth(y - yi);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}

/** Slowly self-mutating landscape character: never repeats, never waits for input. */
export type Climate = { amp: number; freq: number; ridge: number; warp: number; seed: number; blend: number };
export function climate(t: number): Climate {
  const era = t / 22, seed = Math.floor(era), blend = smooth(Math.min(1, (era - seed) * 4));
  return {
    amp: .9 + noise(t * .05, 1.3) * .5,
    freq: .32 + (noise(t * .04, 7.1) + 1) * .14,
    ridge: (noise(t * .03, 3.7) + 1) / 2,
    warp: .4 + (noise(t * .06, 9.2) + 1) * .6,
    seed, blend,
  };
}

function field(x: number, z: number, c: Climate, seed: number) {
  // Domain warp, then 3 octaves blended between rolling dunes and sharp ridges.
  const wx = x + noise(x * .2, z * .2, seed + 11) * c.warp * 2, wz = z + noise(x * .2 + 5, z * .2, seed + 13) * c.warp * 2;
  let h = 0, a = 1, f = c.freq;
  for (let o = 0; o < 3; o++) {
    const n = noise(wx * f, wz * f, seed + o);
    h += a * (n * (1 - c.ridge) + (1 - Math.abs(n) * 2) * c.ridge * .8); a *= .5; f *= 2.1;
  }
  return h;
}

/** World-space ground height. Kick rings roll out ahead of the camera; tone ripples the near rows. */
export function terrainHeight(x: number, z: number, t: number, audio: Reaction, wave: readonly number[] = [], ahead = 0) {
  const c = climate(t);
  const base = field(x, z, c, c.seed) * (1 - c.blend) + field(x, z, c, c.seed + 1) * c.blend;
  let h = base * c.amp * (1 + audio.snare * .5);
  // The channel the camera follows stays a valley so the fly-through never hits a wall.
  const valley = Math.min(1, Math.abs(x - pathX(z)) / 2.2);
  h *= .25 + valley * .75;
  h += Math.sin(ahead * 2.2 - t * 9) * audio.kick * .35 * Math.exp(-ahead * .18);
  if (wave.length && ahead < 5) h += (wave[Math.floor(((x / WIDTH + .5) * wave.length)) & (wave.length - 1)] ?? 0) * audio.tone * .6 * (1 - ahead / 5);
  return h;
}

export const pathX = (z: number) => noise(z * .05, 2.2) * 3;
/** Camera position and heading over time; distance flown speeds up with energy. */
export function camera(dist: number, t: number) {
  return { x: pathX(dist), y: 1.5 + noise(t * .08, 4.4) * .5, z: dist, yaw: (pathX(dist + 1) - pathX(dist)) * .8, roll: noise(t * .1, 6.6) * .12 };
}

export type Pt = [number, number, number];
/** Grid rows in camera space, nearest first, ready for floating-horizon occlusion. */
export function terrainRows(dist: number, t: number, audio: Reaction, wave: readonly number[]): Pt[][] {
  const cam = camera(dist, t), rows: Pt[][] = [], z0 = Math.ceil(dist / (DEPTH / ROWS)) * (DEPTH / ROWS);
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
  for (let r = 0; r < ROWS; r++) {
    const wz = z0 + r * DEPTH / ROWS, row: Pt[] = [];
    for (let i = 0; i < COLS; i++) {
      const wx = cam.x + (i / (COLS - 1) - .5) * WIDTH * (1 + r / ROWS * 2);
      const y = terrainHeight(wx, wz, t, audio, wave, wz - dist) - cam.y;
      const dx = wx - cam.x, dz = wz - dist;
      row.push([dx * cy - dz * sy, y, dx * sy + dz * cy]);
    }
    rows.push(row);
  }
  return rows;
}

/** Sparse monoliths on the landscape; kicks lift them out of the ground. */
export function monoliths(dist: number, t: number, audio: Reaction) {
  const out: { x: number; z: number; h: number; w: number }[] = [];
  for (let cz = Math.floor(dist / 2); cz < Math.floor((dist + DEPTH) / 2); cz++) for (let cx = -3; cx <= 3; cx++) {
    if (hash(cx, cz, 77) < .9) continue;
    const x = cx * 1.6 + hash(cx, cz, 3) * .8, z = cz * 2 + hash(cx, cz, 5);
    if (Math.abs(x - pathX(z)) < 1) continue;
    out.push({ x, z, w: .12 + hash(cx, cz, 9) * .1, h: .5 + hash(cx, cz, 8) * 1.2 + audio.kick * 1.1 + Math.sin(t + cz) * .1 });
  }
  return out;
}
