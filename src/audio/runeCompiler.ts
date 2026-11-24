// Pure compiler: three rune lanes -> ordinary bank rows (pattern/vel/chance/ratchet), pitch
// offsets for melodic pads and up to 3 mod targets per pad. The scheduler never sees runes.
import { rune, rateSteps, type PadRole, type RuneCard, type RuneId } from "./runes";
import { chordAt, chordTones, rootSemi, type ProgName, type ProgDegrees } from "./runeHarmony";
import type { Harmony } from "./harmony";

export const MAX_MOD_TARGETS = 3;
export type RuneLayout = { bars: 1 | 2 | 4; prog: ProgName; /** User progression (scale degrees); used instead of prog when present. */ custom?: number[]; drums: RuneCard[]; bass: RuneCard[]; mod: RuneCard[]; /** Sound/FX targets (FX targets start with "fx:"). */ targets: string[] };
export type Row = { pattern: number[]; vel: number[]; chance: number[]; ratchet: number[]; pitch?: number[] };
export type Compiled = { steps: number; rows: Record<number, Row>; mods: Record<number, { target: string; values: number[] }[]> };

const FIB = new Set([0, 1, 2, 3, 5, 8, 13, 21]);
const isPrime = (n: number) => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
export const bjorklund = (k: number, pulses: number, n: number, rot = 0) => pulses > 0 && Math.floor((((k + rot) % n) * pulses) / n) !== Math.floor(((((k + rot) % n) + n - 1) % n * pulses) / n) || (pulses > 0 && (k + rot) % n === 0);

/** Lay cards end to end; each step knows its card and local position. */
export function spans(cards: RuneCard[], steps: number) {
  const out: ({ c: RuneCard; k: number; n: number } | null)[] = Array(steps).fill(null); let at = 0;
  for (const c of cards) { const n = Math.max(4, Math.round(c.len) * 4); for (let k = 0; k < n && at < steps; k++, at++) out[at] = { c, k, n }; if (at >= steps) break; }
  return out;
}

/** Rhythm rule a rune applies on the DRUM and BASS lanes. v = variation (pad index). */
export function hit(r: RuneId, k: number, n: number, amt: number, spd: number, v = 0): boolean {
  const pulses = Math.max(1, Math.round(1 + amt * (n / 2 - 1)));
  switch (r) {
    case "euclid": return bjorklund(k, pulses, n, v * 2);
    case "shift": return bjorklund(k, pulses, n, Math.round(spd * 3) + 2 + v);
    case "anchor": return v === 0 ? k % 4 === 0 : k % 8 === 4;
    case "gibbs": return k % 4 === (v % 4);
    case "fibo": return FIB.has((k + v) % n);
    case "prime": return isPrime(k + v);
    case "stoch": return bjorklund(k, pulses, n, v);
    case "null": return amt > 0 && k === 0 && v === 0;
  }
}

/** Hit at the card's rate: slower rates test a coarser grid; 1/32 marks a double hit. */
export function rateHit(c: RuneCard, k: number, n: number, v = 0): 0 | 1 | 2 {
  const e = rateSteps(c); if (e >= 1) { if (k % e) return 0; return hit(c.rune, k / e, Math.max(1, Math.round(n / e)), c.amt, c.spd, v) ? 1 : 0; }
  return hit(c.rune, k, n, c.amt, c.spd, v) ? 2 : 0;
}

const blank = (s: number): Row => ({ pattern: Array(s).fill(0), vel: Array(s).fill(1), chance: Array(s).fill(1), ratchet: Array(s).fill(1) });

export function compileRunes(L: RuneLayout, roles: PadRole[], h: Harmony): Compiled {
  const prog: ProgName | ProgDegrees = L.custom?.length ? L.custom : L.prog;
  const steps = L.bars * 16, rows: Record<number, Row> = {}, mods: Compiled["mods"] = {};
  const pads = (r: PadRole) => roles.map((x, i) => (x === r ? i : -1)).filter(i => i >= 0);
  const drums = pads("rhythm"), basses = pads("bass"), arps = pads("arp");
  const dS = spans(L.drums, steps), bS = spans(L.bass, steps), mS = spans(L.mod, steps);

  drums.forEach((p, v) => { const row = (rows[p] = blank(steps)); dS.forEach((s, t) => { if (!s) return; const { c, k, n } = s;
    const hh = rateHit(c, k, n, v); if (hh) { row.pattern[t] = 1; if (hh === 2) row.ratchet[t] = 2; if (c.rune === "gibbs") row.ratchet[t] = 2 + Math.round(c.amt * 2); if (c.rune === "stoch") row.chance[t] = 1 - c.amt * .6; } }); });

  basses.forEach(p => { const row = (rows[p] = blank(steps)); row.pitch = Array(steps).fill(0); let lastHit = -9;
    bS.forEach((s, t) => { const deg = chordAt(prog, t, steps), root = rootSemi(h, deg); row.pitch![t] = root; if (!s) return; const { c, k, n } = s;
      if (rune(c.rune).arpPassage && arps.length) return; // bass steps aside for the arp
      const hh = rateHit(c, k, n, 0); if (hh) { row.pattern[t] = 1; if (hh === 2) row.ratchet[t] = 2; lastHit = t; const oct = (c.rune === "shift" || c.rune === "euclid") && k % 8 >= 4 && c.amt >= .5; row.pitch![t] = root + (oct ? 12 : 0); }
      else if (c.rune === "anchor" && t - lastHit <= Math.round(1 + c.amt * 2) && row.pattern[t - 1]) row.pattern[t] = 2; }); });

  arps.forEach((p, v) => { const row = (rows[p] = blank(steps)); row.pitch = Array(steps).fill(0);
    bS.forEach((s, t) => { if (!s || !rune(s.c.rune).arpPassage) return; const { c, k } = s; const deg = c.arp === "root" ? 0 : chordAt(prog, t, steps); const tones = chordTones(h, deg);
      const e = rateSteps(c, true), every = Math.max(1, e); if (k % every) return; row.pattern[t] = 1; if (e < 1) row.ratchet[t] = 2; row.pitch![t] = tones[(Math.floor(k / every) + v) % tones.length] + (Math.floor(k / every / tones.length) % 2) * 12; }); });

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
        case "prime": break; // handled below as a span reversal
      } });
    // PRIME: reverse the order of hits inside its span.
    let t0 = 0; while (t0 < steps) { const s = mS[t0]; if (s && s.c.rune === "prime" && s.k === 0) { const end = Math.min(steps, t0 + s.n); for (const key of ["pattern", "vel", "chance", "ratchet", "pitch"] as const) { const a = row[key]; if (a) { const seg = a.slice(t0, end).reverse(); a.splice(t0, seg.length, ...seg); } } t0 = end; } else t0++; }
    const room = MAX_MOD_TARGETS - (row.pitch ? 1 : 0);
    mods[p] = L.targets.slice(0, room).map(target => { const fx = target.startsWith("fx:");
      return { target, values: Array.from({ length: steps }, (_, t) => { const s = mS[t]; if (!s) return .5; const d = s.c.amt * (fx ? rune(s.c.rune).fxDepth : 1); const shape = Math.sin((s.k / s.n) * Math.PI * 2 * (s.c.rate ? Math.max(.25, s.n / (rateSteps(s.c) * 4)) : 1 + Math.round(s.c.spd * 3))) * .5; return .5 + shape * d; }) }; });
  }
  return { steps, rows, mods };
}
