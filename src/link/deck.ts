/** Pure deck-mixer math shared by the mixer UI, the deck audio stage and tests. */
export type DeckId = "A" | "B";
export type DeckState = { gain: number; low: number; mid: number; high: number; filter: number };
export type MixState = { xf: number; curve: "blend" | "cut"; bpm: number; decks: Record<DeckId, DeckState> };
export const DECK_HOME: DeckState = { gain: 1, low: 1, mid: 1, high: 1, filter: 0 };
export const MIX_HOME: MixState = { xf: 0, curve: "blend", bpm: 124, decks: { A: { ...DECK_HOME }, B: { ...DECK_HOME } } };

/** Crossfader gain for a deck. xf -1 = full A, +1 = full B. BLEND is equal-power; CUT is full on both sides with a fast edge cut. */
export function xfGain(deck: DeckId, xf: number, curve: MixState["curve"]): number {
  const x = Math.max(-1, Math.min(1, xf)), side = deck === "A" ? -x : x; // side: +1 = fully toward this deck
  if (curve === "cut") return side <= -0.9 ? 0 : side >= -0.8 ? 1 : (side + 0.9) / 0.1;
  return Math.cos((1 - side) / 2 * Math.PI / 2);
}

/** EQ knob 0..1 -> dB: 1 = flat, 0 = full kill (-40 dB), with a usable cut range in between. */
export const eqDb = (v: number) => v >= 1 ? 0 : v <= 0 ? -40 : -24 * (1 - v) ** 1.3;

/** Bipolar DJ filter: <0 lowpass sweep (20 kHz -> 200 Hz), >0 highpass (20 Hz -> 4 kHz). */
export function filterHz(f: number): { lp: number; hp: number } {
  const v = Math.max(-1, Math.min(1, f));
  return { lp: v < 0 ? 20000 * (200 / 20000) ** -v : 20000, hp: v > 0 ? 20 * (4000 / 20) ** v : 20 };
}

/** Next bar boundary (epoch ms) at or after now + lead, on a grid anchored at anchorMs. */
export function nextBarAt(nowMs: number, anchorMs: number, bpm: number, leadMs = 300): number {
  const bar = 240000 / bpm, t = nowMs + leadMs;
  return anchorMs + Math.ceil((t - anchorMs) / bar) * bar;
}

export const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeRoomCode(rand: () => number = Math.random): string {
  return Array.from({ length: 4 }, () => ROOM_ALPHABET[Math.floor(rand() * ROOM_ALPHABET.length)]).join("");
}
export const validRoom = (c: string) => /^[A-HJ-NP-Z2-9]{4}$/.test(c);
