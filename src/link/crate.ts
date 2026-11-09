import type { GrooveSet } from "@/hooks/useGroovebox";

export const SETS_KEY = "nadrisk.sets.v1";
export type CrateTrack = { slot: number; name: string; bpm: number; key: number; scale: string; set: GrooveSet };

/** Saved MEM sets as a DJ crate (name, BPM, key); empty slots are skipped. */
export function readCrate(raw: string | null): CrateTrack[] {
  let list: unknown[] = [];
  try { const v = JSON.parse(raw || "[]"); if (Array.isArray(v)) list = v; } catch { /* corrupt storage: empty crate */ }
  return list.flatMap((s, slot) => {
    const st = s as GrooveSet | null;
    if (!st || !Array.isArray(st.slots)) return [];
    return [{ slot, name: st.name || `SET ${slot + 1}`, bpm: Math.round(st.bpm ?? 124), key: st.harmony?.key ?? 0, scale: st.harmony?.scale ?? "off", set: st }];
  });
}

/** Shortest semitone move from one key to another (-5..+6), so KEY SYNC never jumps an octave. */
export function keyShift(from: number, to: number): number {
  const d = (((to - from) % 12) + 12) % 12;
  return d > 6 ? d - 12 : d;
}
