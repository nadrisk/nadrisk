import { useEffect, useRef } from "react";

/** Computer-keyboard pads: 1-8 = pads 1-8, Q-I = pads 9-16; Shift+key mutes, Alt+key solos; Z X C V pick patterns A-D. */
export const QWERTY_PADS = ["1", "2", "3", "4", "5", "6", "7", "8", "q", "w", "e", "r", "t", "y", "u", "i"];
const BANK_KEYS = ["z", "x", "c", "v"];
type Act = { hit: (i: number) => void; release: (i: number) => void; mute: (i: number) => void; solo: (i: number) => void; bank: (b: number) => void; pads: number };

export function useQwerty(on: boolean, act: Act) {
  const a = useRef(act); a.current = act;
  useEffect(() => {
    if (!on) return;
    const held = new Map<string, number>();
    // e.code keeps Shift/Alt combos mapped to the physical key (Alt+Q types "œ" on macOS).
    const keyOf = (e: KeyboardEvent) => e.code.startsWith("Digit") ? e.code.slice(5) : e.code.startsWith("Key") ? e.code.slice(3).toLowerCase() : "";
    const typing = (e: KeyboardEvent) => { const t = e.target as HTMLElement | null; return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };
    const down = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey) return;
      const k = keyOf(e), pad = QWERTY_PADS.indexOf(k), bank = BANK_KEYS.indexOf(k);
      if (pad >= 0 && pad < a.current.pads) {
        e.preventDefault(); if (e.repeat) return;
        if (e.shiftKey) a.current.mute(pad); else if (e.altKey) a.current.solo(pad); else { held.set(e.code, pad); a.current.hit(pad); }
      } else if (bank >= 0 && !e.repeat) { e.preventDefault(); a.current.bank(bank); }
    };
    const up = (e: KeyboardEvent) => { const pad = held.get(e.code); if (pad === undefined) return; held.delete(e.code); a.current.release(pad); };
    const blur = () => { held.forEach(p => a.current.release(p)); held.clear(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    return () => { blur(); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, [on]);
}
