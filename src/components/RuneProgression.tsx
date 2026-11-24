import { useState } from "react";
import { Button } from "./ui/button";
import { PxSelect } from "./PxSelect";
import { MAX_PROG, PROGS, DEGREE_NAMES } from "@/audio/runeHarmony";
import type { RuneLayout } from "@/audio/runeCompiler";
import type { Harmony } from "@/audio/harmony";

export const PROGRESSION_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export function RuneProgression({ layout, harmony, onChange }: { layout: RuneLayout; harmony: Harmony; onChange: (l: RuneLayout) => void }) {
  const [open, setOpen] = useState(false);
  const notes: number[] = [...(layout.custom?.length ? layout.custom : PROGS[layout.prog])];
  const put = (custom: number[]) => onChange({ ...layout, custom, notes: undefined });
  void harmony;
  return <div className="rune-progression-control">
    <Button variant="ghost" className="gb-cycle" aria-label="Edit progression" aria-expanded={open} onClick={() => setOpen(v => !v)}>PROG {notes.map(n => DEGREE_NAMES[n]).join("·")}</Button>
    {open && <div className="rune-progression-popup" role="group" aria-label="Your progression">
      <label>NOTES <PxSelect label="Progression note count" value={notes.length} options={Array.from({ length: MAX_PROG }, (_, i) => [i + 1, String(i + 1)] as [number, string])} onChange={n => put(Array.from({ length: n }, (_, i) => notes[i] ?? 0))} /></label>
      <div className="rune-progression-notes">{notes.map((n, i) => <label key={i}>{i + 1}<PxSelect label={`Progression note ${i + 1}`} value={n} options={DEGREE_NAMES.map((s, v) => [v, s] as [number, string])} onChange={x => put(notes.map((v, j) => i === j ? x : v))} /></label>)}</div>
    </div>}
  </div>;
}
