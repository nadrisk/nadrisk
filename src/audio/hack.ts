// HACK (circuit bend) helpers. They are pure so they can be tested and are also stringified into the hack worklet;
// keep each one self-contained (no references to other module identifiers).

/** Seeded LCG so chaos events repeat for the same seed. */
export const hackRng = (seed: number) => { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };

/** Bus short: quantise to a 12-bit word, XOR the shorted data lines, convert back. Output always stays in [-1, 1]. */
export const bitFlip = (x: number, mask: number) => { const q = Math.max(0, Math.min(4095, Math.round((Math.max(-1, Math.min(1, x)) + 1) * 2047.5))); return ((q ^ mask) & 4095) / 2047.5 - 1; };

/** Picks which data lines are shorted: more SHRT = more lines, top bit (sign flip) only near full. */
export const hackMask = (amount: number, r: () => number) => { const n = Math.round(Math.max(0, Math.min(1, amount)) * 6); let m = 0; for (let i = 0; i < n; i++) m |= 1 << (4 + Math.floor(r() * (amount > .8 ? 8 : 7))); return m; };
