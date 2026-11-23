// TOPOMAP: the clean beat is the terrain; the puck mangles it through pure math laws.
// Every function is pure, so the same puck position always gives the same groove.
import { bjorklund } from "./arp";

export const TOPO_LAWS = ["SHIFT", "CAT", "SIEVE", "R90"] as const; // affine warp, torus cat map, euclid sieve, rule 90
export type TopoLaw = typeof TOPO_LAWS[number];
export const TOPO_PATHS = ["FREE", "RING", "SIGIL", "SNAKE"] as const;
export type TopoPath = typeof TOPO_PATHS[number];
export type Topo = { law: TopoLaw; path: TopoPath; bars: number; anchor: boolean };
export const TOPO_DEFAULT: Topo = { law: "SHIFT", path: "FREE", bars: 2, anchor: true };
export type Puck = { x: number; y: number }; // -1..1, centre = clean

const REST = 0.06;
const clamp = (v: number) => Math.max(-1, Math.min(1, v));
const mod = (a: number, n: number) => ((a % n) + n) % n;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
export const atRest = (p: Puck) => Math.hypot(p.x, p.y) < REST;

/** Multiplier for SHIFT: the nearest value coprime to len, so the warp is always a permutation. */
export function coprime(want: number, len: number) {
  for (let d = 0; d < len; d++) for (const s of [1, -1]) { const a = want + s * d; if (a >= 1 && gcd(a, len) === 1) return a; }
  return 1;
}

const hit = (v: number) => (v === 1 ? 1 : 0);

/** Mangled hits (0/1) of one row of length len for a puck position. Ties/notes stay untouched only at rest. */
export function mangleRow(row: readonly number[], len: number, law: TopoLaw, p: Puck): number[] {
  const n = Math.max(1, Math.min(len, row.length)), src = row.slice(0, n).map(hit);
  if (atRest(p)) return row.slice(0, n).map(v => v);
  const x = clamp(p.x), y = clamp(p.y);
  if (law === "SHIFT") {
    const a = coprime(1 + Math.round(Math.abs(y) * (n - 2)), n), b = Math.round(x * n / 2);
    return src.map((_, s) => src[mod(a * s + b, n)]);
  }
  if (law === "CAT") {
    // Arnold's cat map on a w×h torus of steps; |y| = iterations, x = row shift before mapping.
    const w = n % 4 === 0 ? 4 : n, h = Math.max(1, n / w), it = 1 + Math.round(Math.abs(y) * 3), sh = Math.round(x * (w - 1));
    return src.map((_, s) => { let r = Math.floor(s / w), c = mod(s % w + sh, w); for (let k = 0; k < it; k++) { const nr = mod(2 * r + c, h), nc = mod(r + c, w); r = nr; c = nc; } return src[r * w + c] ?? 0; });
  }
  if (law === "SIEVE") {
    // y > 0 fills with an euclid pattern, y < 0 thins through one; x rotates the sieve.
    const k = y >= 0 ? Math.round(y * n / 2) : Math.max(1, Math.round(n * (1 + y))), m = bjorklund(Math.min(n, k), n), rot = Math.round(x * n / 2);
    return src.map((v, s) => { const on = m[mod(s + rot, n)] ? 1 : 0; return y >= 0 ? (v | on) : (v & on); });
  }
  // R90: each generation XORs neighbours; distance = generations, x = which neighbour leads.
  const gens = Math.max(1, Math.round(Math.hypot(x, y) * 6)), lead = x >= 0 ? 1 : -1;
  let cur: number[] = src;
  for (let g = 0; g < gens; g++) cur = cur.map((_, s) => cur[mod(s - lead, n)] ^ cur[mod(s + lead, n)]);
  // Never let the automaton erase the whole row: fall back to the clean source.
  return cur.some(Boolean) ? cur : src;
}

/** Orbit shapes for the puck, phase 0..1 over `bars`. FREE = centre (touch only). */
export function pathAt(path: TopoPath, phase: number, size = 0.8): Puck {
  const t = mod(phase, 1) * Math.PI * 2;
  if (path === "RING") return { x: size * Math.cos(t), y: size * Math.sin(t) };
  if (path === "SIGIL") { // five-pointed star {5/2}, walked corner to corner
    const f = mod(phase, 1) * 5, i = Math.floor(f), u = f - i, ang = (k: number) => -Math.PI / 2 + k * 4 * Math.PI / 5;
    const a = ang(i), b = ang(i + 1);
    return { x: size * ((1 - u) * Math.cos(a) + u * Math.cos(b)), y: size * ((1 - u) * Math.sin(a) + u * Math.sin(b)) };
  }
  if (path === "SNAKE") return { x: size * Math.sin(3 * t), y: size * Math.sin(2 * t) };
  return { x: 0, y: 0 };
}

/** Is row `i` held clean? With ANCHOR the kick never moves. */
export const anchored = (topo: Topo, isKick: boolean) => topo.anchor && isKick;
