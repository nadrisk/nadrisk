/** Pure grain read-position helpers + a tiny registry the sampler screen polls for its cursor. */

/** Reflect x into [lo, hi] (mirror at the edges) so spray/LFO never pile grains on one edge. */
export function reflect(x: number, lo: number, hi: number): number {
  if (hi <= lo) return lo;
  const span = hi - lo, m = ((x - lo) % (2 * span) + 2 * span) % (2 * span);
  return lo + (m <= span ? m : 2 * span - m);
}

/** Frozen grains shimmer within ±FREEZE_JITTER seconds so a held cloud never buzzes. */
export const FREEZE_JITTER = .004;

/** Next read head: frozen holds, otherwise advances and wraps inside the region. */
export function advance(pos: number, step: number, lo: number, hi: number, frozen: boolean): number {
  if (frozen) return Math.max(lo, Math.min(hi, pos));
  const n = pos + step;
  return n > hi || n < lo ? lo : n;
}

type Read = { frac: number; frozen: boolean; until: number };
const reads = new Map<string, Read>();
export function setGrainRead(key: string, r: Read) { reads.set(key, r); }
/** Current read fraction of a sample's live cloud, or null when none is sounding. */
export function grainRead(key: string | undefined, now = performance.now()): Read | null {
  if (!key) return null; const r = reads.get(key); return r && r.until > now ? r : null;
}
