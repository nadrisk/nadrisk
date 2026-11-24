import { FX_DEFS, type FxUnit, type FxType } from "./effects";

export type FxMacroMapping = { id: string; owner: string; fx: number; param: string; axis: "x" | "y"; depth: number };
export type FxMacroPosition = { mode: string; x: number; y: number };
// Structural switches, sources, seeds and masks must not rebuild nodes under a finger.
const switches = new Set(["source", "sync", "mode", "offs", "sp", "nmode", "track", "lofi", "preset", "mask", "steps", "seed", "lock", "rate", "typeA", "typeB", "oppose", "wave", "retrig", "dir", "ping"]);
export const macroParamsOf = (type: FxType) => Object.keys(FX_DEFS[type].params).filter(k => !switches.has(k));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : 0));

/** Bipolar offsets in the parameter's normalized domain; centre is exactly the saved patch.
 * Both axes on one parameter sum before clamping; all parameters of one unit update together. */
export function macroFxParams(owner: string, fx: FxUnit, mappings: FxMacroMapping[], pos: FxMacroPosition, base = fx.params): Record<string, number> {
  const result = { ...Object.fromEntries(Object.entries(FX_DEFS[fx.type].params).map(([k, r]) => [k, r[0]])), ...base };
  if (pos.mode !== "macro") return result;
  const offsets: Record<string, number> = {};
  for (const m of mappings) {
    if (m.owner !== owner || m.fx !== fx.id || !macroParamsOf(fx.type).includes(m.param)) continue;
    offsets[m.param] = (offsets[m.param] ?? 0) + clamp(pos[m.axis], -1, 1) * clamp(m.depth, -1, 1);
  }
  for (const [k, offset] of Object.entries(offsets)) {
    if (!offset) continue;
    const r = (FX_DEFS[fx.type].params as Record<string, number[]>)[k];
    const [home, lo, hi] = r;
    // Frequency/time controls are perceptual rather than linear-Hz jumps.
    const log = lo > 0 && hi / lo >= 20 && /freq|cutoff|tone|damp|manual|time|size|attack|release|decay|pre|hp/.test(k);
    const start = clamp(result[k] ?? home, lo, hi);
    result[k] = log ? Math.exp(clamp(Math.log(start) + offset * Math.log(hi / lo), Math.log(lo), Math.log(hi))) : clamp(start + offset * (hi - lo), lo, hi);
    if (k === "time") result.sync = 0;
  }
  return result;
}