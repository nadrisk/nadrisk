// Rune cards: each rune is one rule set; the lane it lands on picks which rule applies.
// Cards are pure data; runeCompiler.ts turns a lane layout into ordinary step-bank data.
export type RuneId = "euclid" | "shift" | "anchor" | "gibbs" | "fibo" | "prime" | "stoch" | "bloom" | "snake";
export type LaneId = "drums" | "bass" | "mod" | "flow";
export type PadRole = "rhythm" | "bass" | "arp" | "free";
export const PAD_ROLES: readonly PadRole[] = ["free", "rhythm", "bass", "arp"];
export const ROLE_BADGE: Record<PadRole, string> = { free: "", rhythm: "DRUM", bass: "BASS", arp: "LEAD" };
/** Saved value → role; anything missing or unknown (older sets) is Free. */
export const padRoleOf = (v: unknown): PadRole => (PAD_ROLES as readonly unknown[]).includes(v) ? v as PadRole : "free";
/** Badge tap cycles — → R → B → A → —. */
export const nextPadRole = (v: unknown): PadRole => PAD_ROLES[(PAD_ROLES.indexOf(padRoleOf(v)) + 1) % PAD_ROLES.length];
/** len in beats (1 beat = 4 steps); amt/spd 0..1. arp: on BASS lane, what the arp follows. */
/** rate: note value the card runs at (missing = legacy spd behaviour). */
export type RuneCard = { rune: RuneId; len: number; amt: number; spd: number; start?: number; targets?: string[]; arp?: "prog" | "root"; rate?: RuneRate; /** FLOW lane only. */ shape?: FlowShape; scope?: FlowScope };
/** Card speed selector, slowest to fastest; value = steps (16ths) per pulse. */
export const RUNE_RATES = [["2", 32], ["1", 16], ["1/2", 8], ["1/4", 4], ["1/8", 2], ["1/16", 1], ["1/32", .5]] as const;
export type RuneRate = typeof RUNE_RATES[number][0];
/** Steps per pulse; old cards without a rate keep their spd meaning (arp: spd < .5 = 1/8). */
export const rateSteps = (c: RuneCard, arp = false): number => { const r = RUNE_RATES.find(x => x[0] === c.rate); return r ? r[1] : arp && c.spd < .5 ? 2 : 1; };

export type RuneDef = { id: RuneId; glyph: string; name: string; /** 0 = cannot touch FX, 1 = full. */ fxDepth: number; /** On BASS lane this rune is an arp passage (bass steps aside). */ arpPassage: boolean /* legacy, unused: every rune now drives the arp */ };
export const RUNES: readonly RuneDef[] = [
  { id: "euclid", glyph: "◎", name: "EUCLID", fxDepth: .5, arpPassage: false },
  { id: "shift", glyph: "⇄", name: "SHIFT", fxDepth: .5, arpPassage: false },
  { id: "anchor", glyph: "⊥", name: "ANCHOR", fxDepth: 0, arpPassage: false },
  { id: "gibbs", glyph: "∿", name: "GIBBS", fxDepth: .8, arpPassage: true },
  { id: "fibo", glyph: "Φ", name: "FIBO", fxDepth: .3, arpPassage: true },
  { id: "prime", glyph: "ℙ", name: "PRIME", fxDepth: 0, arpPassage: false },
  { id: "stoch", glyph: "∴", name: "STOCH", fxDepth: .25, arpPassage: false },
  { id: "bloom", glyph: "✿", name: "BLOOM", fxDepth: .7, arpPassage: false },
  { id: "snake", glyph: "⌇", name: "SNAKE", fxDepth: .6, arpPassage: false },
];
export const rune = (id: RuneId) => RUNES.find(r => r.id === ((id as string) === "null" ? "bloom" : id)) ?? RUNES[0];
export const RUNE_TARGETS: Record<RuneId, string[]> = { euclid: ["cutoff", "time"], shift: ["time", "wave"], anchor: ["cutoff"], gibbs: ["cutoff", "time", "wave"], fibo: ["wave", "cutoff"], prime: ["time", "start"], stoch: ["cutoff", "start", "wave"], bloom: ["cutoff", "time"], snake: ["cutoff", "wave"] };
/** Explicit starts keep gaps; old cards retain their end-to-end placement. */
export function positioned(cards: RuneCard[]) { let end = 0; return cards.map(c => { const start = c.start ?? end; end = start + c.len; return { ...c, start }; }); }
export function firstFree(cards: RuneCard[], beats: number) { const placed = positioned(cards); return Array.from({ length: beats }, (_, i) => i).find(i => !placed.some(c => i >= c.start && i < c.start + c.len)); }
export const newRune = (id: RuneId, start: number): RuneCard => ({ rune: id, start, len: 1, amt: .5, spd: .5, rate: "1/16", targets: RUNE_TARGETS[id].slice(0, 2) });
export const card = (r: RuneId, len = 4, amt = .5, spd = .5, arp?: "prog" | "root"): RuneCard => ({ rune: r, len, amt, spd, ...(arp ? { arp } : {}) });

/** XY mangler: X shifts DRUMS card rates, Y shifts BASS·LEAD, distance from centre speeds MOD; each axis moves -2..+2 rate notches (right/up = faster). */
export const mangleShift = (v: number) => Math.max(-2, Math.min(2, Math.round(v * 2)));
export function mangleLayout<L extends { drums: RuneCard[]; bass: RuneCard[]; mod: RuneCard[] }>(L: L, x: number, y: number): L {
  const sh = (cards: RuneCard[], s: number) => s ? cards.map(c => { const i = RUNE_RATES.findIndex(r => r[0] === (c.rate ?? "1/16")); return { ...c, rate: RUNE_RATES[Math.max(0, Math.min(RUNE_RATES.length - 1, i + s))][0] }; }) : cards;
  return { ...L, drums: sh(L.drums, mangleShift(x)), bass: sh(L.bass, mangleShift(y)), mod: sh(L.mod, mangleShift(Math.min(1, Math.hypot(x, y)))) };
}

/** DUP 1: copies every card that starts in bar 1 into bar 2 (clipped to the bar), replacing bar 2, and makes the layout 2 bars. */
export function dupBar1<L extends { bars: number; drums: RuneCard[]; bass: RuneCard[]; mod: RuneCard[] }>(L: L): L {
  const d = (cards: RuneCard[]) => { const p = positioned(cards), a = p.filter(c => c.start < 4).map(c => ({ ...c, len: Math.min(c.len, 4 - c.start) })); return [...a, ...a.map(c => ({ ...c, start: c.start + 4 }))]; };
  return { ...L, bars: 2, drums: d(L.drums), bass: d(L.bass), mod: d(L.mod), ...((L as { flow?: RuneCard[] }).flow ? { flow: d((L as { flow?: RuneCard[] }).flow!) } : {}) };
}

/** FLOW lane: shape cards that change the order the compiled steps play in (MDD SnAkE style).
 *  The span is a matrix of 4 columns; the shape is the path walked through it. AMT rotates where the walk starts;
 *  SPD sets the cell size (1/16 = single steps, 1/8 = pairs...). scope picks which pads follow. */
export type FlowShape = "raster" | "serpent" | "spiral" | "diag" | "knight" | "stride" | "weave" | "bounce" | "reverse";
export type FlowScope = "all" | "drums" | "melo";
export const FLOW_SHAPES: readonly { id: FlowShape; glyph: string; name: string }[] = [
  { id: "raster", glyph: "⇉", name: "RASTER" }, { id: "serpent", glyph: "∽", name: "SERPENT" }, { id: "spiral", glyph: "⊚", name: "SPIRAL" },
  { id: "diag", glyph: "⟋", name: "DIAG" }, { id: "knight", glyph: "↱", name: "KNIGHT" }, { id: "stride", glyph: "⋰", name: "STRIDE" },
  { id: "weave", glyph: "⋈", name: "WEAVE" }, { id: "bounce", glyph: "⇅", name: "BOUNCE" }, { id: "reverse", glyph: "⇇", name: "REVERSE" },
];
export const flowShape = (id?: string) => FLOW_SHAPES.find(f => f.id === id) ?? FLOW_SHAPES[0];
export const newFlow = (id: FlowShape, start: number): RuneCard => ({ rune: "snake", shape: id, start, len: 1, amt: 0, spd: .5, rate: "1/16", scope: "all" });
/** Path through `cells` cells laid out 4 wide; result[k] = source cell played at position k. */
export function flowPath(shape: FlowShape, cells: number, amt = 0): number[] {
  const W = Math.min(4, cells), R = Math.max(1, Math.ceil(cells / W)), id = (r: number, c: number) => r * W + c; let p: number[] = [];
  switch (shape) {
    case "serpent": for (let r = 0; r < R; r++) for (let c = 0; c < W; c++) p.push(id(r, r % 2 ? W - 1 - c : c)); break;
    case "spiral": { let t = 0, b = R - 1, l = 0, rr = W - 1; while (t <= b && l <= rr) { for (let c = l; c <= rr; c++) p.push(id(t, c)); t++; for (let r = t; r <= b; r++) p.push(id(r, rr)); rr--; if (t <= b) { for (let c = rr; c >= l; c--) p.push(id(b, c)); b--; } if (l <= rr) { for (let r = b; r >= t; r--) p.push(id(r, l)); l++; } } break; }
    case "diag": for (let d = 0; d < R + W - 1; d++) for (let r = Math.min(d, R - 1); r >= 0; r--) { const c = d - r; if (c < W) p.push(id(r, c)); } break;
    case "knight": { const seen = new Set<number>(); let r = 0, c = 0; for (let i = 0; i < R * W; i++) { let n = id(r, c); while (seen.has(n)) n = (n + 1) % (R * W); seen.add(n); p.push(n); r = (Math.floor(n / W) + 1) % R; c = (n % W + 2) % W; } break; }
    case "stride": for (let o = 0; o < 2; o++) for (let r = 0; r < R; r++) for (let c = o; c < W; c += 2) p.push(id(r, c)); break;
    case "weave": { const h = Math.ceil(cells / 2); for (let i = 0; i < h; i++) { p.push(i); if (i + h < cells) p.push(i + h); } break; }
    case "bounce": { const h = Math.ceil(cells / 2); p = Array.from({ length: cells }, (_, k) => k < h ? k : cells - 1 - k); break; }
    case "reverse": p = Array.from({ length: cells }, (_, k) => cells - 1 - k); break;
    default: p = Array.from({ length: cells }, (_, k) => k);
  }
  p = p.filter(x => x < cells); const rot = Math.round(Math.min(1, Math.max(0, amt)) * (p.length - 1));
  return p.map((_, k) => p[(k + rot) % p.length]);
}
