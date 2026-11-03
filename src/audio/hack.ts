// HACK (circuit bend) helpers. They are pure so they can be tested and are also stringified into the hack worklet;
// keep each one self-contained (no references to other module identifiers).

/** Seeded LCG so chaos events repeat for the same seed. */
export const hackRng = (seed: number) => { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };

/** Bus short: quantise to a 12-bit word, XOR the shorted data lines, convert back. Output always stays in [-1, 1]. */
export const bitFlip = (x: number, mask: number) => { const q = Math.max(0, Math.min(4095, Math.round((Math.max(-1, Math.min(1, x)) + 1) * 2047.5))); return ((q ^ mask) & 4095) / 2047.5 - 1; };

/** Picks which data lines are shorted: more SHRT = more lines, top bit (sign flip) only near full. */
export const hackMask = (amount: number, r: () => number) => { const n = Math.round(Math.max(0, Math.min(1, amount)) * 6); let m = 0; for (let i = 0; i < n; i++) m |= 1 << (4 + Math.floor(r() * (amount > .8 ? 8 : 7))); return m; };

/** GEN pattern: 4 lanes x 16 sample-and-hold steps (SHRT, CLK, STRV, SKIP), values in [-1, 1] on 9 levels.
 *  A lane is re-rolled if it has fewer than 3 different levels or holds one level more than 3 steps; SKIP is sparse spikes (0..1). */
export const hackPattern = (seed: number) => {
  let s = (seed >>> 0) || 1; const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const out: number[] = [];
  for (let lane = 0; lane < 4; lane++) {
    for (let tries = 0; ; tries++) {
      const v: number[] = []; for (let i = 0; i < 16; i++) v.push(lane === 3 ? (r() < .3 ? Math.round((.4 + r() * .6) * 4) / 4 : 0) : Math.round((r() * 2 - 1) * 4) / 4);
      let run = 1, maxRun = 1; for (let i = 1; i < 16; i++) { run = v[i] === v[i - 1] ? run + 1 : 1; if (run > maxRun) maxRun = run; }
      const distinct = new Set(v).size;
      if (tries > 50 || (lane === 3 ? distinct >= 2 && v.some(x => x === 0) : distinct >= 3 && maxRun <= 3)) { out.push(...v); break; }
    }
  }
  return out;
};

/** Which pattern step plays at `sec` seconds of transport: RATE 0..3 = 1/4, 1/8, 1/16, 1/32. */
export const hackStep = (sec: number, bpm: number, rate: number, steps: number) => { const n = Math.max(1, Math.round(steps)), k = Math.floor(Math.max(0, sec) * bpm / 60 * [1, 2, 4, 8][Math.max(0, Math.min(3, Math.round(rate)))] + 1e-6); return k % n; };

/** Knob value moved by the (smoothed) step; knob at 0 is fully off, DEPTH 0 returns the knob exactly,
 *  and the swing fades in over the first quarter of the knob so low settings stay subtle. */
export const hackMod = (knob: number, depth: number, v: number) => knob <= .001 ? 0 : Math.max(0, Math.min(1, knob + depth * v * Math.min(1, knob * 4)));

/** SMTH slew: per-block glide factor toward the step value; 0 = instant steps, 1 = glide of about one step. */
export const hackSlew = (smth: number, blockSec: number, stepSec: number) => smth <= .001 ? 1 : 1 - Math.exp(-blockSec / Math.max(1e-4, smth * smth * stepSec * .5));

/** Safety limiter gain for a peak envelope: unity below the ceiling, otherwise pulls the peak down to it. */
export const hackLimit = (peak: number, ceil: number) => peak > ceil ? ceil / peak : 1;
