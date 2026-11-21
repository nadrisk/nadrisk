import { useCallback, useEffect, useRef, useState } from "react";
import { MONKE } from "@/audio/monke";

export type MonkePhase = "enter" | "work" | "exit";
type Visit = { phase: MonkePhase; started: number; position: number; edits: number; reaction: "run" | "laugh"; row?: number; col?: number };
type Controls = { available: boolean; playing: boolean; step: number; target: string; begin: () => boolean; mutate: () => { row: number; column: number } | null; end: () => void; showSequence: () => void };
/** Momentary helper: one press runs one job; the trigger is locked until he leaves. */
export function useMonke(controls: Controls) {
  const latest = useRef(controls); latest.current = controls;
  const [visit, setVisit] = useState<Visit | null>(null);
  const current = useRef(visit); current.current = visit;
  const set = (v: Visit | null) => { current.current = v; setVisit(v); };
  const editAt = useRef(0), laughUntil = useRef(0), target = useRef("");
  const leave = useCallback(() => {
    latest.current.end();
    const v = current.current; if (v && v.phase !== "exit") set({ ...v, phase: "exit", reaction: "laugh", started: Date.now() });
  }, []);
  const trigger = useCallback(() => {
    if (current.current || !latest.current.available || !latest.current.begin()) return;
    latest.current.showSequence(); target.current = latest.current.target;
    set({ phase: "enter", started: Date.now(), position: 0, edits: 0, reaction: "run" });
  }, []);
  const edit = useCallback(() => {
    const v = current.current; if (!v || v.phase !== "work") return;
    let hit: { row: number; column: number } | null = null;
    try { hit = latest.current.mutate(); } catch { hit = null; }
    if (hit === null) { leave(); return; }
    editAt.current = Date.now(); laughUntil.current = Date.now() + 320;
    set({ ...v, edits: v.edits + 1, reaction: "laugh", row: hit.row, col: hit.column });
  }, [leave]);
  // While playing, edits land on beats (every 4th step) so changes are heard in time.
  useEffect(() => { if (controls.playing && controls.step >= 0 && controls.step % 4 === 0 && Date.now() - editAt.current >= 300) edit(); }, [controls.step, controls.playing, edit]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now(), v = current.current, c = latest.current;
      if (!v) return;
      // Watchdog: never let a visit hang (enter stuck or work stalled).
      if (v.phase !== "exit" && now - (v.phase === "enter" ? v.started : editAt.current) > 4000) { try { leave(); } catch { set(null); } return; }
      if (v.phase === "exit") { if (now - v.started >= MONKE.exitMs) set(null); return; }
      if (c.target !== target.current || !c.available) { leave(); return; }
      if (v.phase === "enter") { if (now - v.started >= MONKE.enterMs) { editAt.current = now; set({ ...v, phase: "work" }); } return; }
      if (v.reaction === "laugh" && now >= laughUntil.current) set({ ...v, reaction: "run" });
      if ((!c.playing || now - editAt.current > 1500) && now - editAt.current >= MONKE.editGapMs) edit();
    }, 80);
    return () => window.clearInterval(timer);
  }, [edit, leave]);
  useEffect(() => {
    let buffer = "", last = 0;
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key === "Escape" && current.current) { leave(); set(null); return; }
      if (e.repeat || el?.isContentEditable || (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      if (Date.now() - last > 1800) buffer = "";
      last = Date.now(); buffer = (buffer + e.key.toLowerCase()).slice(-5);
      if (buffer === "monke") { buffer = ""; trigger(); }
    };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); latest.current.end(); };
  }, [trigger]);
  return { visit, busy: !!visit, trigger };
}
