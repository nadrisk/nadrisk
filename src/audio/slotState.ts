import type { Slot } from "@/hooks/useGroovebox";

/** Pure pad-state labels: no audio context, so the hardware readouts can be tested on their own. */

/** Unassigned pad: the disengaged sampler engine with no sample loaded. */
export const isBlankSlot = (s: Slot) => s.engine === "sampler" && !s.sampler?.sampleId && (s.sampler?.sampleName ?? "EMPTY") === "EMPTY";

/** Badge under each pad in the grid. */
export const padBadge = (s: Slot) => s.engine === "drum" ? s.drum.kind : isBlankSlot(s) ? "blnk" : s.engine === "sampler" ? "smp" : s.engine === "synth" ? "syn" : s.engine === "idm" ? "prc" : s.engine;

/** One-word engine name shown in the slot editor header. */
export const slotTitle = (s: Slot) => isBlankSlot(s) ? "BLNK" : s.engine === "idm" ? "PRC" : s.engine.toUpperCase();
