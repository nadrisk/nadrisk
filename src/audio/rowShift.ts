import type { Bank, StepVal } from "@/hooks/useGroovebox";

const rot = <T,>(row: readonly T[], len: number, d: number): T[] => {
  const out = row.slice(), n = Math.max(1, Math.min(len, row.length));
  for (let c = 0; c < n; c++) out[(((c + d) % n) + n) % n] = row[c];
  return out;
};
/** Rotates one track's steps and step lanes by d (+ = later) within its own length. A tie wrapped to step 1 becomes a hit, so notes never vanish. */
export function shiftRow(b: Bank, r: number, d: number): Bank {
  const len = Math.min(b.lengths[r] ?? 16, b.pattern[r]?.length ?? 16);
  const row = rot(b.pattern[r], len, d) as StepVal[];
  if (row[0] >= 2) row[0] = 1 as StepVal;
  const each = (m?: number[][]) => m?.map((x, i) => i === r ? rot(x, len, d) : x);
  return { ...b, pattern: b.pattern.map((x, i) => i === r ? row : x), vel: each(b.vel)!, chance: each(b.chance)!, ...(b.ratchet ? { ratchet: each(b.ratchet) } : {}), ...(b.cond ? { cond: each(b.cond) } : {}), ...(b.nudge ? { nudge: each(b.nudge) } : {}) };
}
