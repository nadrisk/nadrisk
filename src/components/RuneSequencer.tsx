// Rune sequencer: three lanes of magnetic rune cards that compile into the ordinary step banks.
import { useState } from "react";
import { RUNES, rune, card, padRoleOf, type RuneCard, type RuneId, type LaneId } from "@/audio/runes";
import { PROG_NAMES } from "@/audio/runeHarmony";
import type { RuneLayout } from "@/audio/runeCompiler";
import type { Slot } from "@/hooks/useGroovebox";

export const emptyRunes = (): RuneLayout => ({ bars: 1, prog: PROG_NAMES[0], drums: [], bass: [], mod: [], targets: ["cutoff"] });
const LANES: { id: LaneId; label: string; role: string }[] = [{ id: "drums", label: "DRUMS", role: "R" }, { id: "bass", label: "BASS·ARP", role: "B/A" }, { id: "mod", label: "MOD", role: "" }];
const TARGETS: string[][] = [[], ["cutoff"], ["cutoff", "time"]];
const LENS = [1, 2, 4, 8, 16];
const step8 = (v: number, d: number) => Math.max(0, Math.min(1, Math.round((v + d) * 8) / 8));

export function RuneSequencer({ layout, onChange, slots, step }: { layout: RuneLayout; onChange: (L: RuneLayout) => void; slots: Slot[]; step: number }) {
  const [pick, setPick] = useState<RuneId>("euclid");
  const [sel, setSel] = useState<{ lane: LaneId; i: number } | null>(null);
  const beats = layout.bars * 4, beat = step < 0 ? -1 : Math.floor((step % (beats * 4)) / 4);
  const count = (r: string) => slots.filter(s => padRoleOf(s.padRole) === r).length;
  const set = (lane: LaneId, cards: RuneCard[]) => onChange({ ...layout, [lane]: cards });
  const place = (lane: LaneId) => { const used = layout[lane].reduce((a, c) => a + c.len, 0); if (used >= beats) return; const len = Math.min(4, beats - used);
    set(lane, [...layout[lane], card(pick, len, .5, .5, rune(pick).arpPassage && lane === "bass" ? "prog" : undefined)]); setSel({ lane, i: layout[lane].length }); };
  const cur = sel ? layout[sel.lane][sel.i] : null;
  const edit = (p: Partial<RuneCard>) => { if (!sel || !cur) return; set(sel.lane, layout[sel.lane].map((c, i) => i === sel.i ? { ...c, ...p } : c)); };
  const move = (d: number) => { if (!sel) return; const a = layout[sel.lane].slice(), j = sel.i + d; if (j < 0 || j >= a.length) return; [a[sel.i], a[j]] = [a[j], a[sel.i]]; set(sel.lane, a); setSel({ ...sel, i: j }); };
  const del = () => { if (!sel) return; set(sel.lane, layout[sel.lane].filter((_, i) => i !== sel.i)); setSel(null); };
  const tIdx = Math.max(0, TARGETS.findIndex(t => t.join() === layout.targets.join()));

  return <div className="rune-seq">
    <div className="rune-head" role="group" aria-label="Rune pattern">
      <button className="gb-cycle" aria-label="Progression" onClick={() => onChange({ ...layout, prog: PROG_NAMES[(PROG_NAMES.indexOf(layout.prog) + 1) % PROG_NAMES.length] })}>PROG {layout.prog.toUpperCase()}</button>
      <button className="gb-cycle" aria-label="Bars" onClick={() => onChange({ ...layout, bars: layout.bars === 1 ? 2 : layout.bars === 2 ? 4 : 1 })}>BARS {layout.bars}</button>
      <button className="gb-cycle" aria-label="Modulation targets" onClick={() => onChange({ ...layout, targets: TARGETS[(tIdx + 1) % TARGETS.length] })}>TGT {layout.targets.length ? layout.targets.join("+").toUpperCase() : "NOTES"}</button>
      <span className="rune-roles" aria-label="Pad roles">R{count("rhythm")} B{count("bass")} A{count("arp")}</span>
    </div>
    <div className="rune-lanes" style={{ ["--beats" as string]: beats }}>
      {LANES.map(L => { let used = 0; return <div key={L.id} className="rune-lane">
        <span className="rune-lane-label">{L.label}</span>
        <div className="rune-track" aria-label={`${L.label} lane, tap to add ${rune(pick).name}`} onClick={e => { if (e.target === e.currentTarget) place(L.id); }}>
          {Array.from({ length: beats }, (_, b) => <i key={b} className={`rune-beat ${b % 4 === 0 ? "bar" : ""} ${b === beat ? "now" : ""}`} style={{ gridColumn: b + 1 }} aria-hidden />)}
          {layout[L.id].map((c, i) => { const start = used; used += c.len; const fits = start < beats, span = Math.max(1, Math.min(c.len, beats - start)), d = rune(c.rune);
            return fits && <button key={i} className={`rune-card ${sel?.lane === L.id && sel.i === i ? "on" : ""}`} style={{ gridColumn: `${start + 1} / span ${span}` }} aria-label={`${L.label} card ${i + 1} ${d.name}`} onClick={() => setSel(sel?.lane === L.id && sel.i === i ? null : { lane: L.id, i })}><b>{d.glyph}</b><span>{d.name}</span></button>; })}
        </div>
      </div>; })}
    </div>
    <div className="rune-dock" role="group" aria-label="Runes">{RUNES.map(r => <button key={r.id} className={`rune-pick ${pick === r.id ? "on" : ""}`} aria-pressed={pick === r.id} aria-label={`Pick ${r.name}`} onClick={() => setPick(r.id)}><b>{r.glyph}</b><span>{r.name}</span></button>)}</div>
    <div className="rune-edit" role="group" aria-label="Card settings">{cur && sel ? <>
      <span className="rune-edit-name">{rune(cur.rune).glyph} {rune(cur.rune).name}</span>
      <button className="gb-cycle" aria-label="Card length" onClick={() => edit({ len: LENS[(LENS.indexOf(cur.len) + 1) % LENS.length] ?? 4 })}>LEN {cur.len}</button>
      <button className="gb-cycle" aria-label="Card amount less" onClick={() => edit({ amt: step8(cur.amt, -1 / 8) })}>−</button><span className="rune-val">AMT {Math.round(cur.amt * 100)}</span><button className="gb-cycle" aria-label="Card amount more" onClick={() => edit({ amt: step8(cur.amt, 1 / 8) })}>+</button>
      <button className="gb-cycle" aria-label="Card speed less" onClick={() => edit({ spd: step8(cur.spd, -1 / 8) })}>−</button><span className="rune-val">SPD {Math.round(cur.spd * 100)}</span><button className="gb-cycle" aria-label="Card speed more" onClick={() => edit({ spd: step8(cur.spd, 1 / 8) })}>+</button>
      {sel.lane === "bass" && rune(cur.rune).arpPassage && <button className="gb-cycle" aria-label="Arp follows" onClick={() => edit({ arp: cur.arp === "root" ? "prog" : "root" })}>ARP {cur.arp === "root" ? "ROOT" : "PROG"}</button>}
      <button className="gb-cycle" aria-label="Move card left" onClick={() => move(-1)}>◀</button><button className="gb-cycle" aria-label="Move card right" onClick={() => move(1)}>▶</button>
      <button className="gb-cycle" aria-label="Remove card" onClick={del}>DEL</button>
    </> : <span className="rune-hint">PICK A RUNE · TAP A LANE TO LATCH IT · TAP A CARD TO EDIT</span>}</div>
  </div>;
}
