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

/** Shared beat grid: one 16-step bar = 240000/bpm ms, anchored at the mixer's epoch (mixer clock, ms). */
export const barMs = (bpm: number) => 240000 / bpm;
/** Keep the current position in the bar when the tempo changes, so both decks stay on the same downbeat. */
export function reanchorEpoch(nowMs: number, epoch: number, oldBpm: number, newBpm: number): number {
  const phase = (((nowMs - epoch) / barMs(oldBpm)) % 1 + 1) % 1;
  return nowMs - phase * barMs(newBpm);
}
/** Deck phase error in ms (+ = deck is ahead of the grid), wrapped to half a bar. `deckStep` is the transport position in 16ths. */
export function phaseErrMs(mixerNowMs: number, epoch: number, bpm: number, deckStep: number): number {
  const bar = barMs(bpm), expected = ((((mixerNowMs - epoch) % bar) + bar) % bar) / bar * 16;
  let d = (((deckStep - expected) % 16) + 16) % 16; if (d > 8) d -= 16;
  return d * bar / 16;
}
/** Gentle tempo nudge ratio that removes `errMs` over `overMs`, capped at ±3% so it never sounds like a pitch jump. */
export function nudgeRatio(errMs: number, overMs = 1000): number {
  if (Math.abs(errMs) < 4) return 1;
  return 1 + Math.max(-0.03, Math.min(0.03, -errMs / overMs));
}
/** Clock offset (mixer minus deck, ms) from a ping sent at t0 (deck), answered at t1 (mixer), received at t2 (deck). */
export const clockOffset = (t0: number, t1: number, t2: number) => t1 - (t0 + t2) / 2;
export type SyncState = "LOCK" | "DRIFT" | "OFF";
export const syncState = (playing: boolean, errMs: number | null): SyncState => !playing || errMs == null ? "OFF" : Math.abs(errMs) <= 12 ? "LOCK" : "DRIFT";

/** Live-performance fields a mixer may drive remotely; these return to neutral when the mixer goes away. */
export const LIVE_PERF_KEYS = ["time", "tension", "offset", "loop", "djSweep", "echoSend"] as const;
export type Target = DeckId | "BOTH";
export const targets = (t: Target): DeckId[] => t === "BOTH" ? ["A", "B"] : [t];
