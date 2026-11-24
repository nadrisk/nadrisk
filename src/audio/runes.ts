// Rune cards: each rune is one rule set; the lane it lands on picks which rule applies.
// Cards are pure data; runeCompiler.ts turns a lane layout into ordinary step-bank data.
export type RuneId = "euclid" | "shift" | "anchor" | "gibbs" | "fibo" | "prime" | "stoch" | "null";
export type LaneId = "drums" | "bass" | "mod";
export type PadRole = "rhythm" | "bass" | "arp" | "free";
export const PAD_ROLES: readonly PadRole[] = ["free", "rhythm", "bass", "arp"];
export const ROLE_BADGE: Record<PadRole, string> = { free: "—", rhythm: "R", bass: "B", arp: "A" };
/** Saved value → role; anything missing or unknown (older sets) is Free. */
export const padRoleOf = (v: unknown): PadRole => (PAD_ROLES as readonly unknown[]).includes(v) ? v as PadRole : "free";
/** Badge tap cycles — → R → B → A → —. */
export const nextPadRole = (v: unknown): PadRole => PAD_ROLES[(PAD_ROLES.indexOf(padRoleOf(v)) + 1) % PAD_ROLES.length];
/** len in beats (1 beat = 4 steps); amt/spd 0..1. arp: on BASS lane, what the arp follows. */
export type RuneCard = { rune: RuneId; len: number; amt: number; spd: number; arp?: "prog" | "root" };

export type RuneDef = { id: RuneId; glyph: string; name: string; /** 0 = cannot touch FX, 1 = full. */ fxDepth: number; /** On BASS lane this rune is an arp passage (bass steps aside). */ arpPassage: boolean };
export const RUNES: readonly RuneDef[] = [
  { id: "euclid", glyph: "ᛋ", name: "EUCLID", fxDepth: .5, arpPassage: false },
  { id: "shift", glyph: "ᚱ", name: "SHIFT", fxDepth: .5, arpPassage: false },
  { id: "anchor", glyph: "ᚢ", name: "ANCHOR", fxDepth: 0, arpPassage: false },
  { id: "gibbs", glyph: "ᛏ", name: "GIBBS", fxDepth: .8, arpPassage: true },
  { id: "fibo", glyph: "ᛚ", name: "FIBO", fxDepth: .3, arpPassage: true },
  { id: "prime", glyph: "ᛒ", name: "PRIME", fxDepth: 0, arpPassage: false },
  { id: "stoch", glyph: "ᚺ", name: "STOCH", fxDepth: .25, arpPassage: false },
  { id: "null", glyph: "ᛝ", name: "NULL", fxDepth: 1, arpPassage: false },
];
export const rune = (id: RuneId) => RUNES.find(r => r.id === id)!;
export const card = (r: RuneId, len = 4, amt = .5, spd = .5, arp?: "prog" | "root"): RuneCard => ({ rune: r, len, amt, spd, ...(arp ? { arp } : {}) });
