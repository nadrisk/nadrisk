// Pure compiler: three rune lanes -> ordinary bank rows (pattern/vel/chance/ratchet), pitch
// offsets for melodic pads and up to 3 mod targets per pad. The scheduler never sees runes.
import { rune, rateSteps, positioned, type PadRole, type RuneCard, type RuneId } from "./runes";
import { chordAt, chordTones, rootSemi, type ProgName, type ProgDegrees } from "./runeHarmony";
import type { Harmony } from "./harmony";

export const MAX_MOD_TARGETS = 3;
export type RuneLayout = { bars: 1 | 2 | 4; prog: ProgName; notes?: number[]; /** User progression (scale degrees); used instead of prog when present. */ custom?: number[]; drums: RuneCard[]; bass: RuneCard[]; mod: RuneCard[]; /** Legacy global targets. */ targets: string[] };
export type Row = { pattern: number[]; vel: number[]; chance: number[]; ratchet: number[]; pitch?: number[] };
export type Compiled = { steps: number; rows: Record<number, Row>; mods: Record<number, { target: string; targets?: string[]; values: number[] }[]> };

/** SNAKE: 4x4 matrix (cell = row*4+col, row 0 = low) walked along a shape AMT picks. */
export const SNAKE_SHAPES = ["RASTER", "SERPENT", "SPIRAL", "DIAG", "STRIDE"] as const;
const SNAKE_PATHS: number[][] = [
  Array.from({ length: 16 }, (_, i) => i),
  [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12],
  [0, 1, 2, 3, 7, 11, 15, 14, 13, 12, 8, 4, 5, 6, 10, 9],
  [0, 4, 1, 8, 5, 2, 12, 9, 6, 3, 13, 10, 7, 14, 11, 15],
  [0, 2, 8, 10, 5, 7, 13, 15, 1, 3, 9, 11, 4, 6, 12, 14],
];
export const snakeShape = (amt: number) => Math.min(4, Math.max(0, Math.floor(amt * 5)));
export const snakeCell = (amt: number, i: number) => SNAKE_PATHS[snakeShape(amt)][((i % 16) + 16) % 16];

const FIB = new Set([0, 1, 2, 3, 5, 8, 13, 21]);
const isPrime = (n: number) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
export const bjorklund = (k: number, pulses: number, n: number, rot = 0) => pulses > 0 && Math.floor((((k + rot) % n) * pulses) / n) !== Math.floor(((((k + rot) % n) + n - 1) % n * pulses) / n) || (pulses > 0 && (k + rot) % n === 0);

/** Lay cards end to end; each step knows its card and local position. */
export function spans(cards: RuneCard[], steps: number) {
  const out: ({ c: RuneCard; k: number; n: number } | null)[] = Array(steps).fill(null);
  for (const c of positioned(cards)) { const n = Math.max(4, Math.round(c.len) * 4), at = Math.max(0, Math.round(c.start) * 4); for (let k = 0; k < n && at + k < steps; k++) out[at + k] = { c, k, n }; }
  return out;
}

/** Rhythm rule a rune applies on the DRUM and BASS lanes. v = variation (pad index). */
export function hit(r: RuneId, k: number, n: number, amt: number, spd: number, v = 0): boolean {
  const a = Math.min(1, Math.max(0, amt)), pulses = Math.max(1, Math.round(1 + a * (n / 2 - 1)));
  switch (r) {
    case "euclid": return bjorklund(k, pulses, n, v * 2); // AMT = density
    case "shift": return bjorklund(k, Math.max(2, Math.round(n / 4)), n, Math.round(a * 3) + Math.round(spd * 3) + v) || (a > .5 && k % 8 === 3); // AMT = rotation + push
    case "anchor": { const g = a < 1 / 3 ? n : a < 2 / 3 ? 8 : 4; return v === 0 ? k % g === 0 : k % 8 === 4; } // AMT = anchor density
    case "gibbs": { const g = 4 - Math.round(a * 3); return k % g === (v % g); } // AMT = ripple rate
    case "fibo": return FIB.has((k + v) % n) && (k + v) % n <= 2 + a * 19; // AMT = grouping depth
    case "prime": return isPrime(k + v) && k <= 2 + a * (n - 2); // AMT = how far primes reach
    case "stoch": { const x = Math.sin((k + 1) * 12.9898 + v * 78.233) * 43758.5453; return x - Math.floor(x) < .15 + a * .7; } // AMT = probability
    case "snake": { const c = snakeCell(a, k + v * 4); return c % 4 === 0 || (c % 4 === 3 && Math.floor(c / 4) % 2 === 0); } // AMT = shape; edge columns speak
    case "null": return a > 0 && v === 0 && (k === 0 || (a > .5 && k === n / 2)); // AMT = how much breaks the rest
  }
}

/** Hit at the card's rate: slower rates test a coarser grid; 1/32 marks a double hit. */
export function rateHit(c: RuneCard, k: number, n: number, v = 0): 0 | 1 | 2 {
  const e = rateSteps(c); if (e >= 1) { if (k % e) return 0; return hit(c.rune, k / e, Math.max(1, Math.round(n / e)), c.amt, c.spd, v) ? 1 : 0; }
  return hit(c.rune, k, n, c.amt, c.spd, v) ? 2 : 0;
}

/** Arp rhythm per rune: dense runes run at the card rate, sparse ones fall back to an off-grid variant. */
function arpHit(c: RuneCard, k: number, n: number): 0 | 1 | 2 {
  const e = rateSteps(c, true); if (c.rune === "snake") return e >= 1 ? (k % e ? 0 : 1) : 2;
  if (c.rune === "gibbs") return e < 1 || k % Math.max(1, e) === 0 ? 2 : 0;
  if (c.rune === "null") return k % Math.max(4, Math.round(n / (1 + Math.round(c.amt * 3)))) === 2 ? 1 : 0;
  return rateHit(c, k, n, 1) || (c.rune === "prime" || c.rune === "fibo" ? 0 : rateHit(c, k, n, 2));
}

const FIB_BLOCKS = [1, 1, 2, 3, 5, 8, 13];
/** Which pad (index into the shared list) plays hit i of a card, following the rune's logic. */
export function hocketOwner(r: RuneId, i: number, k: number, t: number, m: number): number {
  switch (r) {
    case "anchor": return k % 4 === 0 ? 0 : 1 + (i % Math.max(1, m - 1));
    case "shift": return Math.floor(i / 2) % m;
    case "fibo": { let acc = 0, b = 0; while (acc + FIB_BLOCKS[b % FIB_BLOCKS.length] <= i) { acc += FIB_BLOCKS[b % FIB_BLOCKS.length]; b++; } return b % m; }
    case "prime": return isPrime(k) ? 0 : 1 + (i % Math.max(1, m - 1));
    case "snake": return Math.floor(snakeCell(0, k) / 4) % m; // matrix row decides the voice
    case "stoch": { const x = Math.sin((t + 1) * 37.719 + k * 4.13) * 43758.5453; return Math.floor((x - Math.floor(x)) * m) % m; }
    default: return i % m; // euclid, gibbs, null: note-by-note ping-pong
  }
}

function hocket(pads: number[], rows: Record<number, Row>, sp: ReturnType<typeof spans>, steps: number) {
  if (pads.length < 2) return; let i = 0, prev: unknown = null, own = pads[0];
  for (let t = 0; t < steps; t++) { const s = sp[t]; if (s?.c !== prev) { prev = s?.c; i = 0; }
    const on = pads.some(p => rows[p].pattern[t] === 1);
    if (on) own = pads[hocketOwner(s ? s.c.rune : "euclid", i++, s ? s.k : t, t, pads.length) % pads.length];
    for (const p of pads) if (p !== own) rows[p].pattern[t] = 0; }
}

const blank = (s: number): Row => ({ pattern: Array(s).fill(0), vel: Array(s).fill(1), chance: Array(s).fill(1), ratchet: Array(s).fill(1) });

export function compileRunes(L: RuneLayout, roles: PadRole[], h: Harmony): Compiled {
  const prog: ProgName | ProgDegrees = L.custom?.length ? L.custom : L.prog;
  const rootAt = (t: number) => L.notes?.length ? ((chordAt(L.notes, t, L.bars * 16) - h.key) % 12 + 12) % 12 : rootSemi(h, chordAt(prog, t, L.bars * 16));
  const steps = L.bars * 16, rows: Record<number, Row> = {}, mods: Compiled["mods"] = {};
  const pads = (r: PadRole) => roles.map((x, i) => (x === r ? i : -1)).filter(i => i >= 0);
  const drums = pads("rhythm"), basses = pads("bass"), arps = pads("arp");
  const dS = spans(L.drums, steps), bS = spans(L.bass, steps), mS = spans(L.mod, steps);

  drums.forEach((p, v) => { const row = (rows[p] = blank(steps)); dS.forEach((s, t) => { if (!s) return; const { c, k, n } = s;
    const hh = rateHit(c, k, n, v); if (hh) { row.pattern[t] = 1; if (hh === 2) row.ratchet[t] = 2; if (c.rune === "gibbs") row.ratchet[t] = 2 + Math.round(c.amt * 2); if (c.rune === "stoch") row.chance[t] = 1 - c.amt * .6; } }); });

  basses.forEach(p => { const row = (rows[p] = blank(steps)); row.pitch = Array(steps).fill(0); let lastHit = -9;
    bS.forEach((s, t) => { const root = rootAt(t); row.pitch![t] = root; if (!s) return; const { c, k, n } = s;
      const hh = rateHit(c, k, n, 0); if (hh) { row.pattern[t] = 1; row.vel[t] = k % 4 ? 1 - .5 * c.amt : 1; if (hh === 2) row.ratchet[t] = 2; lastHit = t; const oct = (c.rune === "shift" || c.rune === "euclid") && k % 8 >= 4 && c.amt >= .5; row.pitch![t] = root + (oct ? 12 : 0); }
      else if (c.rune === "anchor" && t - lastHit <= Math.round(1 + c.amt * 2) && row.pattern[t - 1]) row.pattern[t] = 2; }); });

  // Every rune has an arp personality; the arp fills around bass hits so the two interlock.
  const bassHit = (t: number) => basses.some(p => rows[p].pattern[t] === 1);
  const arpLine = blank(steps); arpLine.pitch = Array(steps).fill(0); let walk = 0, ai = 0, prevArpC: unknown = null;
  bS.forEach((s, t) => { if (!s || !arps.length) return; const { c, k, n } = s; if (c !== prevArpC) { prevArpC = c; ai = 0; walk = 0; }
    const deg = c.arp === "root" ? 0 : chordAt(prog, t, steps); const tones = L.notes?.length && c.arp !== "root" ? [0, h.scale === "major" ? 4 : 3, 7].map(x => rootAt(t) + x) : chordTones(h, deg);
    const hh = arpHit(c, k, n); if (!hh || (basses.length && bassHit(t))) return; const i = ai++, T = tones.length;
    const at = (j: number) => tones[((j % T) + T) % T] + Math.floor(j / T) * 12;
    let pitch: number;
    switch (c.rune) {
      case "euclid": pitch = at(i % (T * 2)); break; // climbing chord tones across pulses
      case "shift": pitch = at((i + Math.floor(i / T)) % T) + (i % 2) * 12; break; // rotating inversions, octave displaced
      case "anchor": pitch = i % 2 ? at(1 + (Math.floor(i / 2) % (T + 1))) : at(0); break; // pedal back to the root
      case "gibbs": pitch = at(i % 2 ? 1 : 0) + (Math.floor(i / 4) % 2) * 12; break; // fast trill ripples
      case "fibo": pitch = at([0, 1, 2, 4, 7][i % 5]); break; // Fibonacci leaps
      case "prime": pitch = at([1, 2, 4, 6][i % 4]); break; // angular prime-degree leaps
      case "stoch": { const x = Math.sin((t + 1) * 91.17) * 43758.5; walk = Math.max(-1, Math.min(T * 2, walk + (x - Math.floor(x) < .5 ? -1 : 1))); pitch = at(walk); break; }
      case "snake": { const cell = snakeCell(c.amt, i); pitch = at(cell % 4) + (Math.floor(cell / 4) % 2) * 12 + (Math.floor(cell / 4) >= 2 ? 7 : 0); break; } // column = chord tone, row = register
      default: pitch = at(i % 2 ? 2 : 1); // NULL: sparse suspended tones
    }
    arpLine.pattern[t] = 1; arpLine.pitch![t] = pitch; arpLine.vel[t] = i % 2 ? 1 - .45 * c.amt : 1; if (hh === 2) arpLine.ratchet[t] = c.rune === "gibbs" ? 2 + Math.round(c.amt) : 2;
    if (c.rune === "null" && t + 1 < steps && bS[t + 1]?.c === c) arpLine.pattern[t + 1] = 2; });
  arps.forEach(p => { rows[p] = { pattern: [...arpLine.pattern], vel: [...arpLine.vel], chance: [...arpLine.chance], ratchet: [...arpLine.ratchet], pitch: [...arpLine.pitch!] }; });

  // Shared roles hocket: each rune decides which pad speaks each note.
  hocket(basses, rows, bS, steps); hocket(arps, rows, bS, steps);

  // MOD lane: transforms notes above, then sound/FX targets (capped).
  for (const [pk, row] of Object.entries(rows)) { const p = +pk;
    mS.forEach((s, t) => { if (!s || !row.pattern[t]) return; const { c, k, n } = s;
      switch (c.rune) {
        case "gibbs": if (row.pattern[t] === 1) row.ratchet[t] = 2 + Math.round(c.amt * 2); break;
        case "stoch": row.chance[t] = Math.min(row.chance[t], 1 - c.amt * .6); break;
        case "euclid": row.vel[t] = k % 4 === 0 ? 1 : .5 + .5 * (1 - c.amt); break;
        case "fibo": row.vel[t] = .3 + .7 * (k / Math.max(1, n - 1)); break;
        case "shift": if (row.pitch && row.pattern[t] === 1 && k % 2) row.pitch[t] += 12; break;
        case "null": if (row.pattern[t] === 2) row.pattern[t] = 0; break;
        case "anchor": if (t + 1 < steps && !row.pattern[t + 1]) row.pattern[t + 1] = 2; break;
        case "snake": { const cell = snakeCell(c.amt, k); row.vel[t] = .4 + .2 * Math.floor(cell / 4); break; } // row = dynamics
        case "prime": break; // handled below as a span reversal
      } });
    // PRIME: reverse the order of hits inside its span.
    let t0 = 0; while (t0 < steps) { const s = mS[t0]; if (s && s.c.rune === "prime" && s.k === 0) { const end = Math.min(steps, t0 + s.n); for (const key of ["pattern", "vel", "chance", "ratchet", "pitch"] as const) { const a = row[key]; if (a) { const seg = a.slice(t0, end).reverse(); a.splice(t0, seg.length, ...seg); } } t0 = end; } else t0++; }
    const room = MAX_MOD_TARGETS - (row.pitch ? 1 : 0);
    const targetAt = (t: number) => mS[t]?.c.targets ?? (roles[p] === "rhythm" ? dS[t]?.c.targets : bS[t]?.c.targets) ?? L.targets;
    const size = Math.min(room, Math.max(0, ...Array.from({ length: steps }, (_, t) => targetAt(t).length)));
    mods[p] = Array.from({ length: size }, (_, i) => {
      const targets = Array.from({ length: steps }, (_, t) => mS[t] ? targetAt(t)[i] ?? "off" : "off");
      return { target: targets.find(t => t !== "off") ?? "off", targets, values: Array.from({ length: steps }, (_, t) => { const s = mS[t]; if (!s) return .5; const fx = targets[t].includes(":"); const d = s.c.amt * (fx ? rune(s.c.rune).fxDepth : 1); const shape = Math.sin((s.k / s.n) * Math.PI * 2 * (s.c.rate ? Math.max(.25, s.n / (rateSteps(s.c) * 4)) : 1 + Math.round(s.c.spd * 3))) * .5; return .5 + shape * d; }) };
    });
  }
  return { steps, rows, mods };
}
