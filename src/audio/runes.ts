// Rune cards: each rune is one rule set; the lane it lands on picks which rule applies.
// Cards are pure data; runeCompiler.ts turns a lane layout into ordinary step-bank data.
export type RuneId = "euclid" | "shift" | "anchor" | "gibbs" | "fibo" | "prime" | "stoch" | "null" | "snake";
export type LaneId = "drums" | "bass" | "mod";
export type PadRole = "rhythm" | "bass" | "arp" | "free";
export const PAD_ROLES: readonly PadRole[] = ["free", "rhythm", "bass", "arp"];
export const ROLE_BADGE: Record<PadRole, string> = { free: "—", rhythm: "R", bass: "B", arp: "A" };
/** Saved value → role; anything missing or unknown (older sets) is Free. */
export const padRoleOf = (v: unknown): PadRole => (PAD_ROLES as readonly unknown[]).includes(v) ? v as PadRole : "free";
/** Badge tap cycles — → R → B → A → —. */
export const nextPadRole = (v: unknown): PadRole => PAD_ROLES[(PAD_ROLES.indexOf(padRoleOf(v)) + 1) % PAD_ROLES.length];
/** len in beats (1 beat = 4 steps); amt/spd 0..1. arp: on BASS lane, what the arp follows. */
/** rate: note value the card runs at (missing = legacy spd behaviour). */
export type RuneCard = { rune: RuneId; len: number; amt: number; spd: number; start?: number; targets?: string[]; arp?: "prog" | "root"; rate?: RuneRate };
/** Card speed selector, slowest to fastest; value = steps (16ths) per pulse. */
export const RUNE_RATES = [["2", 32], ["1", 16], ["1/2", 8], ["1/4", 4], ["1/8", 2], ["1/16", 1], ["1/32", .5]] as const;
export type RuneRate = typeof RUNE_RATES[number][0];
/** Steps per pulse; old cards without a rate keep their spd meaning (arp: spd < .5 = 1/8). */
export const rateSteps = (c: RuneCard, arp = false): number => { const r = RUNE_RATES.find(x => x[0] === c.rate); return r ? r[1] : arp && c.spd < .5 ? 2 : 1; };

export type RuneDef = { id: RuneId; glyph: string; name: string; /** 0 = cannot touch FX, 1 = full. */ fxDepth: number; /** On BASS lane this rune is an arp passage (bass steps aside). */ arpPassage: boolean /* legacy, unused: every rune now drives the arp */ };
export const RUNES: readonly RuneDef[] = [
  { id: "euclid", glyph: "ᛋ", name: "EUCLID", fxDepth: .5, arpPassage: false },
  { id: "shift", glyph: "ᚱ", name: "SHIFT", fxDepth: .5, arpPassage: false },
  { id: "anchor", glyph: "ᚢ", name: "ANCHOR", fxDepth: 0, arpPassage: false },
  { id: "gibbs", glyph: "ᛏ", name: "GIBBS", fxDepth: .8, arpPassage: true },
  { id: "fibo", glyph: "ᛚ", name: "FIBO", fxDepth: .3, arpPassage: true },
  { id: "prime", glyph: "ᛒ", name: "PRIME", fxDepth: 0, arpPassage: false },
  { id: "stoch", glyph: "ᚺ", name: "STOCH", fxDepth: .25, arpPassage: false },
  { id: "null", glyph: "ᛝ", name: "NULL", fxDepth: 1, arpPassage: false },
  { id: "snake", glyph: "ᛇ", name: "SNAKE", fxDepth: .6, arpPassage: false },
];
export const rune = (id: RuneId) => RUNES.find(r => r.id === id) ?? RUNES[0];
export const RUNE_TARGETS: Record<RuneId, string[]> = { euclid: ["cutoff", "time"], shift: ["time", "wave"], anchor: ["cutoff"], gibbs: ["cutoff", "time", "wave"], fibo: ["wave", "cutoff"], prime: ["time", "start"], stoch: ["cutoff", "start", "wave"], null: ["time", "cutoff"], snake: ["cutoff", "wave"] };
/** Explicit starts keep gaps; old cards retain their end-to-end placement. */
export function positioned(cards: RuneCard[]) { let end = 0; return cards.map(c => { const start = c.start ?? end; end = start + c.len; return { ...c, start }; }); }
export function firstFree(cards: RuneCard[], beats: number) { const placed = positioned(cards); return Array.from({ length: beats }, (_, i) => i).find(i => !placed.some(c => i >= c.start && i < c.start + c.len)); }
export const newRune = (id: RuneId, start: number): RuneCard => ({ rune: id, start, len: 1, amt: .5, spd: .5, rate: "1/16", targets: RUNE_TARGETS[id].slice(0, 2) });
export const card = (r: RuneId, len = 4, amt = .5, spd = .5, arp?: "prog" | "root"): RuneCard => ({ rune: r, len, amt, spd, ...(arp ? { arp } : {}) });
