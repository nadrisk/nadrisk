import { createContext, useContext } from "react";
import { defaultHarmony, noteLabel, snapNote, type Harmony } from "@/audio/harmony";
import type { Knob } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";

export const HarmonyContext = createContext<Harmony>(defaultHarmony());

/** The pad's root NOTE knob: snaps to the global key/scale and shows its degree. Also the phrase root. */
export function useNoteKnob(slot: Slot, onChange: (p: Partial<Slot>) => void, min = 24, max = 84): Knob {
  const h = useContext(HarmonyContext);
  return { label: "Pad root note", short: "NOTE", value: slot.note, min, max, step: 1, fmt: v => noteLabel(h, snapNote(h, v)), set: v => onChange({ note: Math.min(max, Math.max(min, snapNote(h, v))) }) };
}
