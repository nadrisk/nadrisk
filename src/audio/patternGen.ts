import { midiOf, phraseOrder, type ArpParams } from "./arp";

/** Pure, seeded pattern generators for the sequencer GEN screen. */
export type Role = "kick" | "snare" | "hat" | "open" | "perc" | "none";
export const ROLES: Role[] = ["kick", "snare", "hat", "open", "perc", "none"];
export const BREAK_STYLES = ["AMEN", "2STP", "DNB", "BOOM", "IDM", "4/4"] as const;
export type BreakStyle = typeof BREAK_STYLES[number];
export type GenRow = { pattern: number[]; vel: number[]; chance: number[]; ratchet: number[]; length?: number };
export type GenResult = Record<number, GenRow>;

export function rng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/** Guess a pad's role from its engine, drum kind and name. */
export function detectRole(slot: { name: string; engine: string; role?: Role; drum?: { kind: string } }): Role {
  if (slot.role) return slot.role;
  const n = slot.name.toUpperCase();
  if (/\b(OH|OP|OPEN)\b|OPEN|HAT OP/.test(n)) return "open";
  if (/KICK|KCK|BD|\bKIK/.test(n)) return "kick";
  if (/SNR|SNARE|SD|CLAP|CLP/.test(n)) return "snare";
  if (/HAT|HH|\bCH\b/.test(n)) return "hat";
  if (slot.engine === "drum" && slot.drum) return slot.drum.kind === "kick" ? "kick" : slot.drum.kind === "hat" ? "hat" : "snare";
  if (/PERC|RIM|TOM|CLICK|MTL|SHK/.test(n)) return "perc";
  return "none";
}

const G: Record<Exclude<BreakStyle, "IDM">, Partial<Record<Role, string>>> = {
  AMEN: { kick: "x.x.......xx....", snare: "....x..x.x..x..x", hat: "x.x.x.x.x.x.x.x.", open: "..........x.....", perc: "......x.......x." },
  "2STP": { kick: "x.........x.....", snare: "....x.......x...", hat: "..x...x...x...xx", open: "......x.......x.", perc: "...x.....x......" },
  DNB: { kick: "x.........x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", open: "..............x.", perc: ".......x.....x.." },
  BOOM: { kick: "x......xx.x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", open: "...............x", perc: "..x.........x..." },
  "4/4": { kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...x.", open: "..x...x...x...x.", perc: ".x.....x.x.....x" },
};
const ACC: Record<Role, number> = { kick: 1, snare: .95, hat: .7, open: .75, perc: .65, none: 1 };

export type BreakOpts = { dens: number; fill: number; vary: number; seed: number };
/** Write a groove for each role-tagged row. Rows listed in `rows` are the only ones touched. */
export function genBreak(style: BreakStyle, o: BreakOpts, roles: Role[], rows: number[], steps: 16 | 32): GenResult {
  const r = rng(o.seed), out: GenResult = {};
  const idm = style === "IDM";
  for (const row of rows) {
    const role = roles[row]; if (role === "none") continue;
    const p = Array(32).fill(0), vel = Array(32).fill(1), ch = Array(32).fill(1), rat = Array(32).fill(1);
    let base: string;
    if (idm) {
      // Off-grid feel: hits on odd subdivisions, displaced downbeats.
      const prob = { kick: .22, snare: .16, hat: .45, open: .1, perc: .3, none: 0 }[role];
      base = Array.from({ length: 16 }, (_, i) => (role === "kick" && i === 0) || r() < prob * (.6 + o.dens * .8) ? "x" : ".").join("");
    } else base = G[style][role] ?? "................";
    for (let c = 0; c < steps; c++) {
      let hit = base[c % 16] === "x";
      if (c >= 16 && o.vary > 0 && r() < o.vary * .3) hit = !hit && role !== "kick" ? r() < .5 : role === "kick" && c % 4 === 0 ? hit : !hit && r() < .5;
      if (!hit && role === "hat" && r() < o.dens * .5) { hit = true; vel[c] = .4 + r() * .2; }
      if (!hit && role === "snare" && r() < o.dens * .18) { hit = true; vel[c] = .3 + r() * .15; ch[c] = .7; }
      if (!hit && role === "perc" && r() < o.dens * .15) { hit = true; vel[c] = .45; ch[c] = .6; }
      if (hit) { p[c] = 1; if (vel[c] === 1) vel[c] = Math.round((c % 4 === 0 ? ACC[role] : ACC[role] * (.75 + r() * .2)) * 100) / 100; }
      if (idm && hit && r() < .2 + o.fill * .3) rat[c] = [2, 3, 4, 6][Math.floor(r() * 4)];
    }
    // Fills: end of each bar, snare/hat rolls.
    if (o.fill > 0 && (role === "snare" || role === "hat")) for (let bar = 0; bar < steps / 16; bar++) for (let c = bar * 16 + 12; c < bar * 16 + 16; c++) {
      if (r() < o.fill * (role === "snare" ? .6 : .35)) { p[c] = 1; vel[c] = Math.round((.55 + (c % 16 - 12) * .12) * 100) / 100; rat[c] = o.fill > .6 && r() < .5 ? 3 : 2; }
    }
    out[row] = { pattern: p, vel, chance: ch, ratchet: rat, ...(idm ? { length: steps === 32 ? [32, 31, 29, 27, 30][Math.floor(r() * 5)] : [16, 15, 13, 11, 14][Math.floor(r() * 5)] } : {}) };
  }
  return out;
}

export type RandomOpts = { dens: number; velLo: number; chance: number; roll: number; seed: number };
export function genRandom(o: RandomOpts, rows: number[], steps: 16 | 32): GenResult {
  const r = rng(o.seed), out: GenResult = {};
  for (const row of rows) {
    const p = Array(32).fill(0), vel = Array(32).fill(1), ch = Array(32).fill(1), rat = Array(32).fill(1);
    for (let c = 0; c < steps; c++) {
      if (r() >= o.dens * (row < 3 ? .6 : .3)) continue;
      p[c] = 1; vel[c] = Math.round((o.velLo + r() * (1 - o.velLo)) * 100) / 100;
      if (r() < o.chance) ch[c] = Math.round((.3 + r() * .6) * 100) / 100;
      if (r() < o.roll * .4) rat[c] = [2, 3, 4][Math.floor(r() * 3)];
    }
    out[row] = { pattern: p, vel, chance: ch, ratchet: rat };
  }
  return out;
}

/** Bake a phrase into steps: one cell per step, its pitch as semitones from the root (-24..24) on a 2-octave pitch lane. */
export function bakePhrase(arp: ArpParams, steps: 16 | 32) {
  const order = phraseOrder(arp), root = midiOf(arp, 0);
  const pattern = Array(32).fill(0), vel = Array(32).fill(1), pitch = Array(32).fill(.5);
  if (!order.length) return { pattern, vel, pitch };
  for (let c = 0; c < steps; c++) {
    const cell = arp.cells[order[c % order.length]]; if (!cell?.on) continue;
    pattern[c] = 1; vel[c] = cell.vel;
    const semi = Math.max(-24, Math.min(24, midiOf(arp, cell.deg) - root));
    pitch[c] = (semi + 24) / 48;
  }
  return { pattern, vel, pitch };
}
