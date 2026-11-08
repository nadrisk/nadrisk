// Dirtywave-style trig conditions and micro-timing. Pure so the scheduler, grid and tracker agree.
export const CONDS = ["ALL", "1:2", "2:2", "1:3", "2:3", "3:3", "1:4", "2:4", "3:4", "4:4", "1ST", "!1ST"] as const;
/** Does a step with condition `idx` play on loop `cycle` (0 = first time through after PLAY)? */
export function condPass(idx: number, cycle: number): boolean {
  const c = CONDS[Math.round(idx)] ?? "ALL";
  if (c === "ALL") return true;
  if (c === "1ST") return cycle === 0;
  if (c === "!1ST") return cycle > 0;
  const [a, b] = c.split(":").map(Number);
  return cycle % b === a - 1;
}
/** Largest nudge, as a fraction of a 16th, either way. */
export const NUDGE_MAX = .4;
/** Seconds to move a step: v is 0..1 with .5 = on the grid. */
export const nudgeSec = (v: number | undefined, sixteenth: number) => (Math.max(0, Math.min(1, v ?? .5)) - .5) * 2 * NUDGE_MAX * sixteenth;
export const nudgeLabel = (v: number) => { const n = Math.round((v - .5) * 200); return n === 0 ? "0" : `${n > 0 ? "+" : ""}${n}`; };
