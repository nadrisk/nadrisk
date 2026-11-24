import { defaultInstrumentNote } from "@/audio/instrumentPitch";
import { createContext, useContext } from "react";
import { noteName } from "@/audio/arp";
import { defaultHarmony, degreeLabel, snapNote, type Harmony } from "@/audio/harmony";
import type { Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";

export const HarmonyContext = createContext<Harmony>(defaultHarmony());

/** The pad's root NOTE knob: snaps to the global key/scale and shows its degree. Also the phrase root. */
/** NOTE is retired in favour of OCT: pitch comes from KEY/SCL/PROG, the pad only picks its register. Set false to bring NOTE back. */
export const NOTE_RETIRED = true;
/** Octave offset (-2..+2) of a pad's note against its engine's home note; the hidden semitone remainder keeps old sets sounding the same. */
export const padOctave = (slot: Pick<Slot, "note" | "engine">) => Math.max(-2, Math.min(2, Math.round((slot.note - defaultInstrumentNote(slot.engine)) / 12))) || 0;

export function useNoteKnob(slot: Slot, onChange: (p: Partial<Slot>) => void, min = 24, max = 84): Knob {
  const h = useContext(HarmonyContext);
  if (NOTE_RETIRED) {
    const home = defaultInstrumentNote(slot.engine), fine = slot.note - home - padOctave(slot) * 12;
    return { label: "Pad octave", short: "OCT", value: padOctave(slot), reset: 0, min: -2, max: 2, step: 1, fmt: v => `${v > 0 ? "+" : ""}${Math.round(v)}`, set: v => onChange({ note: home + Math.round(v) * 12 + fine }) };
  }
  return { label: "Pad root note", short: "NOTE", value: slot.note, reset: defaultInstrumentNote(slot.engine), min, max, step: 1, fmt: v => { const n = snapNote(h, v), d = degreeLabel(h, n); return d ? `${noteName(n)} ${d}` : noteName(n); }, set: v => onChange({ note: Math.min(max, Math.max(min, snapNote(h, v))) }) };
}
