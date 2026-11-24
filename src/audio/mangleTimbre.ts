import type { Slot } from "@/hooks/useGroovebox";
import { padRoleOf } from "./runes";

/** Rune XY mangler sound mode. TIMBRE: X tight..open, Y dark..bite on every grouped pad. SPLIT: X morphs DRUM pads, Y morphs BASS/LEAD pads.
 *  It is a transient offset added to each slot's own XY at trigger time (and pushed to ringing voices), never saved into the patch. */
export type MangleMode = "clock" | "timbre" | "split";
let macro = { mode: "clock" as MangleMode, x: 0, y: 0 };
export const setMangleMacro = (m: typeof macro) => { macro = m; };
export const mangleOffset = (s: Pick<Slot, "padRole">, m = macro): { x: number; y: number } => {
  const r = padRoleOf(s.padRole);
  if (m.mode === "clock" || r === "free") return { x: 0, y: 0 };
  if (m.mode === "timbre") return { x: m.x, y: m.y };
  const v = r === "rhythm" ? m.x : m.y; return { x: v, y: v };
};
const cl = (v: number) => Math.max(-1, Math.min(1, v));
export function withMangle(s: Slot): Slot {
  const o = mangleOffset(s); if (!o.x && !o.y) return s;
  const xy = s.xy ?? { x: 0, y: 0 };
  return { ...s, xy: { ...xy, x: cl(xy.x + o.x), y: cl(xy.y + o.y) } };
}
