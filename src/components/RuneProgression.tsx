import { useState } from "react";
import { Button } from "./ui/button";
import { MAX_PROG, PROGS, rootSemi } from "@/audio/runeHarmony";
import type { RuneLayout } from "@/audio/runeCompiler";
import type { Harmony } from "@/audio/harmony";

export const PROGRESSION_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export function RuneProgression({ layout, harmony, onChange }: { layout: RuneLayout; harmony: Harmony; onChange: (l: RuneLayout) => void }) {
  const [open, setOpen] = useState(false);
  const notes = layout.notes?.length ? layout.notes : (layout.custom ?? PROGS[layout.prog]).map(d => (harmony.key + rootSemi(harmony, d)) % 12);
  return <div className="rune-progression-control">
    <Button variant="ghost" className="gb-cycle" aria-label="Edit progression" aria-expanded={open} onClick={() => setOpen(v => !v)}>PROG {notes.map(n => PROGRESSION_NOTES[n]).join("·")}</Button>
    {open && <div className="rune-progression-popup" role="group" aria-label="Your progression">
      <label>NOTES <select aria-label="Progression note count" value={notes.length} onChange={e => { const n = Number(e.target.value); onChange({ ...layout, notes: Array.from({ length: n }, (_, i) => notes[i] ?? harmony.key) }); }}>{Array.from({ length: MAX_PROG }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label>
      <div className="rune-progression-notes">{notes.map((n, i) => <label key={i}>{i + 1}<select aria-label={`Progression note ${i + 1}`} value={n} onChange={e => onChange({ ...layout, notes: notes.map((v, j) => i === j ? Number(e.target.value) : v) })}>{PROGRESSION_NOTES.map((s, v) => <option key={s} value={v}>{s}</option>)}</select></label>)}</div>
    </div>}
  </div>;
}
