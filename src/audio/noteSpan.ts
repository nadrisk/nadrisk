import type { StepVal } from "@/hooks/useGroovebox";
/** Note length in steps (hit + following ties), limited to the row length. */
export const spanOf = (row: readonly number[], start: number, len = row.length) => { let n = 1; while (start + n < len && row[start + n] >= 2) n++; return n; };
/** Longest span allowed: up to the next hit or empty-after-hit boundary is irrelevant; stops before the next hit and at row end. */
export const maxSpan = (row: readonly number[], start: number, len = row.length) => { let n = 1; while (start + n < len && row[start + n] !== 1) n++; return n; };
/** Sets a hit's length by writing/clearing ties after it; returns a new row or null if unchanged / not a hit. */
export function setSpan(row: readonly StepVal[], start: number, steps: number, len = row.length): StepVal[] | null {
  if (row[start] !== 1) return null;
  const cur = spanOf(row, start, len), want = Math.max(1, Math.min(Math.round(steps), maxSpan(row, start, len)));
  if (want === cur) return null;
  const next = row.slice() as StepVal[];
  for (let i = 1; i < Math.max(cur, want); i++) next[start + i] = (i < want ? 2 : 0) as StepVal;
  return next;
}
export const spanLabel = (n: number) => `${n} STP ${({ 1: "1/16", 2: "1/8", 3: "3/16", 4: "1/4", 6: "3/8", 8: "1/2", 12: "3/4", 16: "1 BAR", 32: "2 BAR" } as Record<number, string>)[n] ?? `${n}/16`}`;
