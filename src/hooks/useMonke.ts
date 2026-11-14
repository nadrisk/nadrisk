import { useCallback, useEffect, useRef, useState } from "react";
import { MONKE, nextVisitDelay } from "@/audio/monke";

type Visit = { mode: "summon" | "periodic"; started: number; catches: number; position: number; mutations: number; phase: "enter" | "raid" | "leave" };
type Controls = { available: boolean; playing: boolean; step: number; target: string; begin: () => boolean; mutate: () => number | null; end: () => void; showSequence: () => void };
export function useMonke(controls: Controls) {
  const latest = useRef(controls); latest.current = controls;
  const [armed, setArmed] = useState(false);
  const [visit, setVisit] = useState<Visit | null>(null);
  const current = useRef(visit); current.current = visit;
  const due = useRef(0), pulseAt = useRef(0), target = useRef("");
  const finish = useCallback(() => {
    latest.current.end();
    const v = current.current;
    if (v && v.phase !== "leave") { const next = { ...v, phase: "leave" as const, started: Date.now() }; current.current = next; setVisit(next); }
    due.current = Date.now() + nextVisitDelay();
  }, []);
  const start = useCallback((mode: Visit["mode"]) => {
    if (current.current || !latest.current.available || !latest.current.begin()) return;
    latest.current.showSequence(); target.current = latest.current.target;
    pulseAt.current = Date.now();
    const v: Visit = { mode, started: Date.now(), catches: 0, position: 0, mutations: 0, phase: "enter" };
    current.current = v; setVisit(v);
  }, []);
  const toggle = useCallback(() => setArmed(v => !v), []);
  const summon = useCallback(() => start("summon"), [start]);
  const catchMonke = useCallback(() => {
    const v = current.current;
    if (!v || v.mode !== "periodic" || v.phase !== "raid") return;
    if (v.catches + 1 >= MONKE.catches) finish();
    else { const next = { ...v, catches: v.catches + 1, position: (v.position + 3) % 8 }; current.current = next; setVisit(next); }
  }, [finish]);
  const pulse = useCallback(() => {
    const v = current.current; if (!v || v.phase !== "raid") return;
    const column = latest.current.mutate();
    if (column === null) { finish(); return; }
    pulseAt.current = Date.now();
    const next = { ...v, position: (v.position + 1 + Math.floor(Math.random() * 5)) % 8, mutations: v.mutations + 1 };
    current.current = next; setVisit(next);
  }, [finish]);
  useEffect(() => {
    if (controls.playing && controls.step >= 0 && controls.step % 2 === 0) pulse();
  }, [controls.step, controls.playing, pulse]);
  useEffect(() => {
    if (armed) due.current = Date.now() + nextVisitDelay();
    else if (current.current?.mode === "periodic") finish();
  }, [armed, finish]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now(), v = current.current, c = latest.current;
      if (!v) { if (armed && c.available && c.playing && now >= due.current) start("periodic"); return; }
      if (v.phase === "leave") { if (now - v.started >= 450) { current.current = null; setVisit(null); } return; }
      if (c.target !== target.current || !c.available) { finish(); return; }
      if (now - v.started >= (v.mode === "summon" ? MONKE.summonMs : MONKE.periodicMs)) { finish(); return; }
      if (v.phase === "enter" && now - v.started >= 450) { const next = { ...v, phase: "raid" as const }; current.current = next; setVisit(next); }
      else if (v.phase === "raid" && !c.playing && now - pulseAt.current >= 500) pulse();
    }, 100);
    return () => window.clearInterval(timer);
  }, [armed, start, finish, pulse]);
  useEffect(() => {
    let buffer = "", last = 0;
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.repeat || el?.isContentEditable || (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "m") { e.preventDefault(); toggle(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      if (Date.now() - last > 1800) buffer = "";
      last = Date.now(); buffer = (buffer + e.key.toLowerCase()).slice(-5);
      if (buffer === "monke") { buffer = ""; summon(); }
    };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); latest.current.end(); };
  }, [toggle, summon]);
  return { armed, visit, toggle, summon, catchMonke };
}
