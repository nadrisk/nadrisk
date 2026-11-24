// Rune sequencer: three lanes of magnetic rune cards that compile into the ordinary step banks.
import { useRef, useState } from "react";
import { RUNES, RUNE_RATES, rune, card, padRoleOf, type RuneCard, type RuneId, type LaneId } from "@/audio/runes";
import { PROG_NAMES, PROGS, DEGREE_NAMES, MAX_PROG } from "@/audio/runeHarmony";
import { draggedValue, inLengthGrip } from "./stepDrag";
import type { RuneLayout } from "@/audio/runeCompiler";
import type { Slot } from "@/hooks/useGroovebox";

export const emptyRunes = (): RuneLayout => ({ bars: 1, prog: PROG_NAMES[0], drums: [], bass: [], mod: [], targets: ["cutoff"] });
const LANES: { id: LaneId; label: string; role: string }[] = [{ id: "drums", label: "DRUMS", role: "R" }, { id: "bass", label: "BASS·ARP", role: "B/A" }, { id: "mod", label: "MOD", role: "" }];
const TARGETS: string[][] = [[], ["cutoff"], ["cutoff", "time"]];

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
  // Card gestures: right edge drags length (like notes), body drags AMT up/down, a still tap selects.
  const drag = useRef<{ id: number; lane: LaneId; i: number; mode: "len" | "amt"; x0: number; y0: number; w: number; len0: number; amt0: number; max: number; moved: boolean } | null>(null);
  const down = (ev: React.PointerEvent<HTMLButtonElement>, lane: LaneId, i: number) => { const c = layout[lane][i], r = ev.currentTarget.getBoundingClientRect(), track = ev.currentTarget.parentElement!.getBoundingClientRect();
    const others = layout[lane].reduce((a, x, j) => a + (j === i ? 0 : x.len), 0);
    ev.preventDefault(); ev.currentTarget.setPointerCapture(ev.pointerId);
    drag.current = { id: ev.pointerId, lane, i, mode: inLengthGrip(r.width, r.right - ev.clientX, ev.pointerType === "mouse") ? "len" : "amt", x0: ev.clientX, y0: ev.clientY, w: track.width / beats, len0: c.len, amt0: c.amt, max: Math.max(1, beats - others), moved: false }; };
  const dmove = (ev: React.PointerEvent) => { const d = drag.current; if (!d || d.id !== ev.pointerId) return; const dx = ev.clientX - d.x0, dy = ev.clientY - d.y0; if (!d.moved && Math.hypot(dx, dy) < 4) return; d.moved = true;
    const p: Partial<RuneCard> = d.mode === "len" ? { len: Math.max(1, Math.min(d.max, d.len0 + Math.round(dx / d.w))) } : { amt: draggedValue(d.amt0, -dy) };
    const c = layout[d.lane][d.i]; if (Object.entries(p).every(([k, v]) => c[k as keyof RuneCard] === v)) return; set(d.lane, layout[d.lane].map((x, j) => j === d.i ? { ...x, ...p } : x)); setSel({ lane: d.lane, i: d.i }); };
  const dup = (ev: React.PointerEvent) => { const d = drag.current; if (!d || d.id !== ev.pointerId) return; drag.current = null; if (!d.moved) setSel(sel?.lane === d.lane && sel.i === d.i ? null : { lane: d.lane, i: d.i }); };
  const custom = layout.custom, degs = custom ?? [...PROGS[layout.prog]];
  const nextProg = () => { if (custom) return onChange({ ...layout, custom: undefined, prog: PROG_NAMES[0] }); const j = PROG_NAMES.indexOf(layout.prog) + 1; onChange(j >= PROG_NAMES.length ? { ...layout, custom: [...PROGS[layout.prog]] } : { ...layout, prog: PROG_NAMES[j] }); };
  const setDegs = (d: number[]) => onChange({ ...layout, custom: d });
  const tIdx = Math.max(0, TARGETS.findIndex(t => t.join() === layout.targets.join()));

  return <div className="rune-seq">
    <div className="rune-head" role="group" aria-label="Rune pattern">
      <button className="gb-cycle" aria-label="Progression" onClick={nextProg}>PROG {custom ? "USER" : layout.prog.toUpperCase()}</button>
      <button className="gb-cycle" aria-label="Bars" onClick={() => onChange({ ...layout, bars: layout.bars === 1 ? 2 : layout.bars === 2 ? 4 : 1 })}>BARS {layout.bars}</button>
      <button className="gb-cycle" aria-label="Modulation targets" onClick={() => onChange({ ...layout, targets: TARGETS[(tIdx + 1) % TARGETS.length] })}>TGT {layout.targets.length ? layout.targets.join("+").toUpperCase() : "NOTES"}</button>
      <span className="rune-roles" aria-label="Pad roles">R{count("rhythm")} B{count("bass")} A{count("arp")}</span>
    </div>
    {custom && <div className="rune-prog" role="group" aria-label="Your progression">
      <button className="gb-cycle" aria-label="Fewer chords" disabled={degs.length <= 1} onClick={() => setDegs(degs.slice(0, -1))}>−</button>
      <span className="rune-val">{degs.length} CHORDS</span>
      <button className="gb-cycle" aria-label="More chords" disabled={degs.length >= MAX_PROG} onClick={() => setDegs([...degs, degs[degs.length - 1] ?? 0])}>+</button>
      <div className="rune-degs" style={{ ["--n" as string]: MAX_PROG }}>{degs.map((d, i) => <button key={i} className="gb-cycle" aria-label={`Chord ${i + 1} ${DEGREE_NAMES[d]}, tap for next`} onClick={() => setDegs(degs.map((x, j) => j === i ? (x + 1) % 7 : x))} onContextMenu={e => { e.preventDefault(); setDegs(degs.map((x, j) => j === i ? (x + 6) % 7 : x)); }}>{DEGREE_NAMES[d]}</button>)}</div>
    </div>}
    <div className="rune-lanes" style={{ ["--beats" as string]: beats }}>
      {LANES.map(L => { let used = 0; return <div key={L.id} className="rune-lane">
        <span className="rune-lane-label">{L.label}</span>
        <div className="rune-track" aria-label={`${L.label} lane, tap to add ${rune(pick).name}`} onClick={e => { if (e.target === e.currentTarget) place(L.id); }}>
          {Array.from({ length: beats }, (_, b) => <i key={b} className={`rune-beat ${b % 4 === 0 ? "bar" : ""} ${b === beat ? "now" : ""}`} style={{ gridColumn: b + 1 }} aria-hidden />)}
          {layout[L.id].map((c, i) => { const start = used; used += c.len; const fits = start < beats, span = Math.max(1, Math.min(c.len, beats - start)), d = rune(c.rune);
            return fits && <button key={i} className={`rune-card ${sel?.lane === L.id && sel.i === i ? "on" : ""}`} style={{ gridColumn: `${start + 1} / span ${span}`, ["--amt" as string]: c.amt }} aria-label={`${L.label} card ${i + 1} ${d.name} amount ${Math.round(c.amt * 100)}`}
              onPointerDown={ev => down(ev, L.id, i)} onPointerMove={dmove} onPointerUp={dup} onPointerCancel={() => (drag.current = null)}
              onKeyDown={ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); setSel({ lane: L.id, i }); } else if (ev.key === "ArrowUp" || ev.key === "ArrowDown") { ev.preventDefault(); set(L.id, layout[L.id].map((x, j) => j === i ? { ...x, amt: Math.max(0, Math.min(1, Math.round((x.amt + (ev.key === "ArrowUp" ? .05 : -.05)) * 100) / 100)) } : x)); } }}>
              <i className="rune-fill" aria-hidden /><b>{d.glyph}</b><span>{d.name}</span><i className="rune-grip" aria-hidden /></button>; })}
        </div>
      </div>; })}
    </div>
    <div className="rune-dock" role="group" aria-label="Runes">{RUNES.map(r => <button key={r.id} className={`rune-pick ${pick === r.id ? "on" : ""}`} aria-pressed={pick === r.id} aria-label={`Pick ${r.name}`} onClick={() => setPick(r.id)}><b>{r.glyph}</b><span>{r.name}</span></button>)}</div>
    <div className="rune-edit" role="group" aria-label="Card settings">{cur && sel ? <>
      <span className="rune-edit-name">{rune(cur.rune).glyph} {rune(cur.rune).name}</span>
      <span className="rune-val">LEN {cur.len} · AMT {Math.round(cur.amt * 100)}</span>
      <div className="rune-rates" role="group" aria-label="Card speed">{RUNE_RATES.map(([r]) => <button key={r} className={`gb-cycle ${(cur.rate ?? "1/16") === r ? "on" : ""}`} aria-pressed={(cur.rate ?? "1/16") === r} aria-label={`Card speed ${r}`} onClick={() => edit({ rate: r })}>{r}</button>)}</div>
      {sel.lane === "bass" && rune(cur.rune).arpPassage && <button className="gb-cycle" aria-label="Arp follows" onClick={() => edit({ arp: cur.arp === "root" ? "prog" : "root" })}>ARP {cur.arp === "root" ? "ROOT" : "PROG"}</button>}
      <button className="gb-cycle" aria-label="Move card left" onClick={() => move(-1)}>◀</button><button className="gb-cycle" aria-label="Move card right" onClick={() => move(1)}>▶</button>
      <button className="gb-cycle" aria-label="Remove card" onClick={del}>DEL</button>
    </> : <span className="rune-hint">PICK A RUNE · TAP A LANE TO ADD · DRAG EDGE = LENGTH · DRAG UP/DOWN = AMOUNT</span>}</div>
  </div>;
}
