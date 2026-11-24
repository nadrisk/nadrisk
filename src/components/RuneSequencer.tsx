// Independently positioned rune cards; each grid slot is one beat.
import { useRef, useState } from "react";
import { Button } from "./ui/button";
import { RUNES, RUNE_RATES, RUNE_TARGETS, rune, padRoleOf, positioned, firstFree, newRune, type RuneCard, type RuneId, type LaneId, type PadRole } from "@/audio/runes";
import { PROG_NAMES } from "@/audio/runeHarmony";
import { FX_DEFS, MOD_LABEL, modParamsOf } from "@/audio/effects";
import { draggedValue } from "./stepDrag";
import { PxSelect } from "./PxSelect";
import { SNAKE_SHAPES, snakeShape, type RuneLayout } from "@/audio/runeCompiler";
import type { Slot } from "@/hooks/useGroovebox";

export const emptyRunes = (): RuneLayout => ({ bars: 1, prog: PROG_NAMES[0], drums: [], bass: [], mod: [], targets: [] });
const LANES: { id: LaneId; label: string }[] = [{ id: "drums", label: "DRUMS" }, { id: "bass", label: "BASS·LEAD" }, { id: "mod", label: "MOD" }];
export function RuneSequencer({ layout, onChange, slots, step, assign, setAssign }: { assign?: PadRole | null; setAssign?: (r: PadRole | null) => void; layout: RuneLayout; onChange: (L: RuneLayout) => void; slots: Slot[]; step: number }) {
  const [active, setActive] = useState<LaneId>("drums");
  const [sel, setSel] = useState<{ lane: LaneId; i: number } | null>(null);
  const [dragging, setDragging] = useState<RuneId | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; lane?: LaneId; beat?: number; ok?: boolean; swap?: boolean; len?: number } | null>(null);
  const dockDrag = useRef<{ id: number; rune: RuneId; x: number; y: number; moved: boolean } | null>(null);
  const beats = layout.bars * 4, beat = step < 0 ? -1 : Math.floor((step % (beats * 4)) / 4);
  const set = (lane: LaneId, cards: RuneCard[]) => onChange({ ...layout, [lane]: cards });
  const place = (lane: LaneId, id: RuneId, at?: number) => {
    const cards = positioned(layout[lane]), start = at ?? firstFree(cards, beats);
    if (start === undefined || start < 0 || start >= beats) return;
    const hit = at === undefined ? -1 : cards.findIndex(c => start >= c.start && start < c.start + c.len);
    if (hit >= 0) { const old = cards[hit]; set(lane, cards.map((c, j) => j === hit ? { ...newRune(id, old.start), len: old.len, amt: old.amt, rate: old.rate, ...(lane === "bass" && rune(id).arpPassage ? { arp: old.arp ?? "prog" as const } : {}) } : c)); setSel({ lane, i: hit }); setActive(lane); return; }
    if (cards.some(c => start >= c.start && start < c.start + c.len)) return;
    set(lane, [...cards, { ...newRune(id, start), ...(lane === "bass" && rune(id).arpPassage ? { arp: "prog" as const } : {}) }]);
    setSel({ lane, i: cards.length }); setActive(lane);
  };
  const cur = sel ? layout[sel.lane][sel.i] : undefined;
  const edit = (p: Partial<RuneCard>) => { if (sel && cur) set(sel.lane, positioned(layout[sel.lane]).map((c, i) => i === sel.i ? { ...c, ...p } : c)); };
  const remove = (lane: LaneId, i: number) => { set(lane, positioned(layout[lane]).filter((_, j) => j !== i)); setSel(null); };
  const drag = useRef<{ id: number; lane: LaneId; i: number; mode: "len" | "amt"; x: number; y: number; w: number; len: number; amt: number; max: number; moved: boolean } | null>(null);
  const down = (ev: React.PointerEvent<HTMLButtonElement>, lane: LaneId, i: number) => {
    const parent = ev.currentTarget.parentElement; if (!parent) return;
    const cards = positioned(layout[lane]), c = cards[i], r = ev.currentTarget.getBoundingClientRect();
    const next = Math.min(beats, ...cards.filter((x, j) => j !== i && x.start >= c.start + c.len).map(x => x.start));
    ev.preventDefault(); ev.currentTarget.setPointerCapture(ev.pointerId); setActive(lane);
    drag.current = { id: ev.pointerId, lane, i, mode: ev.clientX >= r.right - Math.min(10, r.width / 3) ? "len" : "amt", x: ev.clientX, y: ev.clientY, w: parent.getBoundingClientRect().width / beats, len: c.len, amt: c.amt, max: next - c.start, moved: false };
  };
  const move = (ev: React.PointerEvent) => {
    const d = drag.current; if (!d || d.id !== ev.pointerId) return;
    const dx = ev.clientX - d.x, dy = ev.clientY - d.y; if (!d.moved && Math.hypot(dx, dy) < 5) return; d.moved = true;
    const p = d.mode === "len" ? { len: Math.max(1, Math.min(d.max, d.len + Math.round(dx / d.w))) } : { amt: draggedValue(d.amt, -dy) };
    set(d.lane, positioned(layout[d.lane]).map((c, i) => i === d.i ? { ...c, ...p } : c)); setSel({ lane: d.lane, i: d.i });
  };
  const up = (ev: React.PointerEvent) => { const d = drag.current; if (!d || d.id !== ev.pointerId) return; drag.current = null; if (!d.moved) { const now = performance.now(), t = lastTap.current; if (t && t.lane === d.lane && t.i === d.i && now - t.at < 350) { lastTap.current = null; remove(d.lane, d.i); return; } lastTap.current = { lane: d.lane, i: d.i, at: now }; setSel({ lane: d.lane, i: d.i }); setActive(d.lane); } else lastTap.current = null; };
  const lastTap = useRef<{ lane: LaneId; i: number; at: number } | null>(null);
  const available = cur ? [...RUNE_TARGETS[cur.rune].map(t => [t, t === "wave" ? "WT POS" : t === "start" ? "SMP START" : t.toUpperCase()]), ...slots.filter(s => padRoleOf(s.padRole) !== "free").flatMap(s => s.fx.filter(f => f.on && rune(cur.rune).fxDepth > 0).flatMap(f => modParamsOf(f.type).map(p => [`${f.id}:${p}`, `${s.name} ${FX_DEFS[f.type].label.replace("~", "")} ${MOD_LABEL[p] ?? p}`])))].filter((v, i, a) => a.findIndex(x => x[0] === v[0]) === i) : [];
  return <div className="rune-seq">
    <div className="rune-head"><Button variant="ghost" className="gb-cycle" aria-label="Bars" onClick={() => onChange({ ...layout, bars: layout.bars === 1 ? 2 : layout.bars === 2 ? 4 : 1 })}>BARS {layout.bars}</Button><div className="rune-assign" role="group" aria-label="Assign pads to groups">{([["rhythm", "DRUM"], ["bass", "BASS"], ["arp", "LEAD"]] as [PadRole, string][]).map(([r, n]) => <Button key={r} variant="ghost" className={`gb-cycle ${assign === r ? "on" : ""}`} aria-pressed={assign === r} aria-label={`Assign pads to ${n}`} onClick={() => setAssign?.(assign === r ? null : r)}>{n} {slots.filter(s => padRoleOf(s.padRole) === r).length}</Button>)}</div>{assign && <span className="rune-hint">TAP PADS TO ADD/REMOVE · TAP {assign === "rhythm" ? "DRUM" : assign === "bass" ? "BASS" : "LEAD"} TO FINISH</span>}</div>
    <div className="rune-lanes" style={{ ["--beats" as string]: beats }}><div className="rune-labels">{LANES.map(L => <Button key={L.id} variant="ghost" className={`rune-lane-label ${active === L.id ? "active" : ""}`} aria-label={`Select ${L.label} lane`} aria-pressed={active === L.id} onClick={() => setActive(L.id)}>{L.label}</Button>)}</div><div className="rune-viewport">{LANES.map(L => <div key={L.id} className="rune-lane">
      <div className="rune-track" data-rune-lane={L.id} aria-label={`${L.label} lane`}>
        {Array.from({ length: beats }, (_, b) => <span key={b} className={`rune-beat ${b % 4 === 0 ? "bar" : ""} ${b === beat ? "now" : ""}`} style={{ gridColumn: b + 1 }} aria-hidden />)}
        {ghost?.lane === L.id && ghost.beat !== undefined && <span className={`rune-drop ${ghost.swap ? "swap" : ""}`} style={{ gridColumn: `${ghost.beat + 1} / span ${ghost.len ?? 1}` }} aria-hidden />}
        {positioned(layout[L.id]).map((c, i) => c.start < beats && <Button variant="ghost" key={i} className={`rune-card ${sel?.lane === L.id && sel.i === i ? "editing" : ""}`} style={{ gridColumn: `${c.start + 1} / span ${Math.min(c.len, beats - c.start)}`, ["--amt" as string]: c.amt }} title={`${rune(c.rune).name} · ${Math.round(c.amt * 100)}%`} aria-label={`${L.label} card ${i + 1} ${rune(c.rune).name} amount ${Math.round(c.amt * 100)}`}
          onPointerDown={ev => down(ev, L.id, i)} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null; }}
          onContextMenu={ev => { ev.preventDefault(); setSel({ lane: L.id, i }); }}
          onKeyDown={ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); setSel({ lane: L.id, i }); } else if (ev.key === "Delete" || ev.key === "Backspace") { ev.preventDefault(); remove(L.id, i); } }}>
          <i className="rune-fill" aria-hidden /><b>{rune(c.rune).glyph}</b><small className="rune-rate">{c.rate ?? "1/16"}</small><i className="rune-grip" aria-hidden /></Button>)}
      </div>
    </div>)}</div></div>
    {ghost && dragging && <div className="rune-drag-chip" style={{ left: ghost.x, top: ghost.y }} aria-hidden><b>{rune(dragging).glyph}</b><span>{rune(dragging).name}</span></div>}
    <div className="rune-dock" role="group" aria-label="Runes">{RUNES.map(r => <Button variant="ghost" key={r.id} className={`rune-pick ${dragging === r.id ? "dragging" : ""}`} aria-label={`Add ${r.name} to ${active} lane`} title={r.name}
      onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); dockDrag.current = { id: e.pointerId, rune: r.id, x: e.clientX, y: e.clientY, moved: false }; }}
      onPointerMove={e => { const d = dockDrag.current; if (!d || d.id !== e.pointerId) return; if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) <= 6) return; d.moved = true; setDragging(r.id);
        const track = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>(".rune-track"), lane = track?.dataset.runeLane as LaneId | undefined;
        let b: number | undefined, ok = false, swap = false; if (track && lane) { const rect = track.getBoundingClientRect(); b = Math.max(0, Math.min(beats - 1, Math.floor((e.clientX - rect.left) / rect.width * beats))); const over = positioned(layout[lane]).find(c => b! >= c.start && b! < c.start + c.len); ok = true; if (over) { swap = true; b = over.start; } }
        setGhost({ x: e.clientX, y: e.clientY, lane, beat: b, ok, swap, len: swap ? positioned(layout[lane!]).find(c => c.start === b)?.len : 1 }); }}
      onPointerUp={e => { const d = dockDrag.current; if (!d || d.id !== e.pointerId) return; dockDrag.current = null; setDragging(null); setGhost(null); if (!d.moved) { place(active, r.id); return; } const track = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>(".rune-track"); const lane = track?.dataset.runeLane as LaneId | undefined; if (track && lane) { const rect = track.getBoundingClientRect(); place(lane, r.id, Math.floor((e.clientX - rect.left) / rect.width * beats)); } }}
      onPointerCancel={() => { dockDrag.current = null; setDragging(null); setGhost(null); }} onClick={e => { if (e.detail === 0) place(active, r.id); }}><b>{r.glyph}</b><span>{r.name}</span></Button>)}</div>
    {cur && sel && <div className="rune-edit" role="group" aria-label="Card settings">
      <div className="rune-edit-row">
        <PxSelect className="rune-edit-pick" label="Rune to edit" value={`${sel.lane}:${sel.i}`} options={LANES.flatMap(L => layout[L.id].map((c, i) => [`${L.id}:${i}`, `${L.label} ${i + 1} ${rune(c.rune).name}`] as [string, string]))} onChange={v => { const [lane, i] = v.split(":"); setSel({ lane: lane as LaneId, i: Number(i) }); }} />
        <span className="rune-val">LEN {cur.len} · AMT {Math.round(cur.amt * 100)}{cur.rune === "snake" ? ` · ${SNAKE_SHAPES[snakeShape(cur.amt)]}` : ""}</span>
        <button type="button" className="rune-edit-btn" aria-label="Delete rune" onClick={() => remove(sel.lane, sel.i)}>DEL</button>
      </div>
      <div className="rune-edit-row rune-edit-params">
        <label className="rune-field"><span>SPD</span><PxSelect label="Card speed" value={cur.rate ?? "1/16"} options={RUNE_RATES.map(([r]) => [r, r] as [string, string])} onChange={v => edit({ rate: v as RuneCard["rate"] })} /></label>
        {[0, 1, ...(sel.lane === "drums" ? [2] : [])].map(i => <label key={i} className="rune-field"><span>T{i + 1}</span><PxSelect label={`Rune target ${i + 1}`} value={(cur.targets ?? layout.targets)[i] ?? "off"} options={[["off", "OFF"], ...available] as [string, string][]} onChange={v => { const targets = [...(cur.targets ?? layout.targets)]; targets[i] = v; edit({ targets }); }} /></label>)}
        {sel.lane === "bass" && rune(cur.rune).arpPassage && <button type="button" className="rune-edit-btn" onClick={() => edit({ arp: cur.arp === "root" ? "prog" : "root" })}>LEAD {cur.arp === "root" ? "ROOT" : "PROG"}</button>}
      </div>
    </div>}
  </div>;
}
