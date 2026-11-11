import { useCallback, useEffect, useRef, useState } from "react";
import { openRoom, type LinkMode, type RoomTransport } from "./transport";
import { type DeckId, type DeckState, type MixState, type Target, DECK_HOME, MIX_HOME, xfGain, nextBarAt, makeRoomCode, reanchorEpoch, phaseErrMs, nudgeRatio, clockOffset, LIVE_PERF_KEYS, targets, clockNow } from "./deck";
import { defaultPerformance, type PerformanceParams } from "@/audio/performance";

export type LinkRole = "solo" | "mixer" | DeckId;
export type PadInfo = { name: string; mute: boolean; solo?: boolean };
export type DeckStatus = { playing: boolean; bpm: number; out: number; seen: number; err: number | null; pads: PadInfo[]; bank: number; queued: number | null; perf: PerformanceParams };
type Local = {
  playing: boolean; bpm: number; setBpm: (b: number) => void; setDeckOut: (d: DeckState, xf: number) => void; out: () => number;
  ensure: () => Promise<unknown>; startAt: (targetMs: number, bpm: number) => Promise<number | null>; stop: () => void; nudgeTempo: (ratio: number, ms?: number) => void; stepNow: () => number | null;
  pads: PadInfo[]; bank: number; queued: number | null; performance: PerformanceParams;
  toggleMute: (i: number) => void; toggleSolo: (i: number) => void; unmuteAll: () => void; selectBank: (b: number) => void; setPerformance: (p: PerformanceParams) => void;
};
type Ctl = { deck: DeckId; op: "mute" | "solo" | "unmute" | "bank" | "perf"; i?: number; patch?: Partial<PerformanceParams> };
type Mix = MixState & { epoch?: number };

/** Mixer = master clock (shared epoch + bpm); decks start on its downbeats, phase-lock by tempo trims, and take mute/bank/FX commands. Absolute state repeats every second so lost messages self-heal. */
export function useLink(local: Local) {
  const [role, setRole] = useState<LinkRole>("solo");
  const [mode, setMode] = useState<LinkMode>("tabs");
  const [room, setRoom] = useState("");
  const [mix, setMixState] = useState<Mix>(MIX_HOME);
  const [decks, setDecks] = useState<Record<DeckId, DeckStatus | null>>({ A: null, B: null });
  const [online, setOnline] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const [err, setErr] = useState<number | null>(null);
  const L = useRef(local); L.current = local;
  const mixRef = useRef<Mix>(mix); mixRef.current = mix;
  const chan = useRef<RoomTransport | null>(null);
  const timers = useRef<number[]>([]);
  const startGeneration = useRef(0);
  const offset = useRef({ ms: 0, rtt: Infinity, n: 0 });
  const lastMix = useRef(0);
  const remote = useRef({ perf: false, mutes: new Set<number>(), solos: new Set<number>() });
  const holdPerf = useRef<Record<DeckId, number>>({ A: 0, B: 0 });
  const pendingStart = useRef(false);

  const send = useCallback((event: string, payload: unknown) => { chan.current?.send(event, payload); }, []);
  const applyMix = useCallback((m: MixState, d: DeckId) => { L.current.setDeckOut(m.decks[d], xfGain(d, m.xf, m.curve)); if (Math.round(m.bpm) !== L.current.bpm) L.current.setBpm(Math.round(m.bpm)); }, []);

  useEffect(() => {
    if (role === "solo" || !room) return;
    offset.current = { ms: 0, rtt: Infinity, n: 0 }; lastMix.current = clockNow();
    const cancelStart = () => { startGeneration.current++; if (pendingStart.current) { L.current.stop(); pendingStart.current = false; } timers.current.forEach(clearTimeout); timers.current = []; setPending(null); };
    const releaseRemote = () => { // mixer gone: never leave a deck muted, held or filtered by it
      const r = remote.current, l = L.current;
      if (r.perf) { const h = defaultPerformance(); const p = { ...l.performance }; LIVE_PERF_KEYS.forEach(k => { (p as Record<string, unknown>)[k] = h[k]; }); l.setPerformance(p); }
      r.mutes.forEach(i => { if (l.pads[i]?.mute) l.toggleMute(i); }); r.solos.forEach(i => { if (l.pads[i]?.solo) l.toggleSolo(i); });
      remote.current = { perf: false, mutes: new Set(), solos: new Set() };
    };
    const ch = openRoom(room, mode, ({ event, payload }) => {
      if (role === "mixer") {
        if (event === "deck") {
          const p = payload as { deck: DeckId } & Omit<DeckStatus, "seen">;
          if (p.deck !== "A" && p.deck !== "B") return;
          setDecks(s => { const prev = s[p.deck]; const keep = prev && clockNow() < holdPerf.current[p.deck]; return { ...s, [p.deck]: { ...p, perf: keep ? prev.perf : p.perf ?? defaultPerformance(), pads: p.pads ?? [], seen: clockNow() } }; });
        } else if (event === "ping") { const p = payload as { deck: DeckId; t0: number }; send("pong", { deck: p.deck, t0: p.t0, t1: clockNow() }); }
        return;
      }
      if (event === "mix") { const m = payload as Mix; lastMix.current = clockNow(); setMixState(m); mixRef.current = m; applyMix(m, role); }
      else if (event === "pong") {
        const p = payload as { deck: DeckId; t0: number; t1: number }; if (p.deck !== role) return;
        const t2 = clockNow(), rtt = t2 - p.t0, o = offset.current;
        if (rtt <= o.rtt * 1.5 || o.n > 8) offset.current = { ms: clockOffset(p.t0, p.t1, t2), rtt: Math.min(rtt, o.rtt * 1.2 + 1), n: 0 }; else o.n++;
      } else if (event === "start") {
        const p = payload as { deck: DeckId; at: number }; if (p.deck !== role) return;
        cancelStart();
        const localAt = p.at - offset.current.ms, generation = startGeneration.current;
        pendingStart.current = true; setPending(localAt);
        void L.current.startAt(localAt, mixRef.current.bpm).then(at => {
          if (generation !== startGeneration.current) return;
          if (at == null) { pendingStart.current = false; setPending(null); return; }
          setPending(at);
          timers.current.push(window.setTimeout(() => { pendingStart.current = false; setPending(null); }, Math.max(0, at - clockNow())));
        });
      } else if (event === "stop" && (payload as { deck: DeckId }).deck === role) { cancelStart(); L.current.stop(); }
      else if (event === "ctl") {
        const c = payload as Ctl; if (c.deck !== role) return; const l = L.current, r = remote.current;
        if (c.op === "mute" && c.i != null) { l.toggleMute(c.i); r.mutes.add(c.i); }
        else if (c.op === "solo" && c.i != null) { l.toggleSolo(c.i); r.solos.add(c.i); }
        else if (c.op === "unmute") l.unmuteAll();
        else if (c.op === "bank" && c.i != null) l.selectBank(c.i);
        else if (c.op === "perf" && c.patch) { l.setPerformance({ ...l.performance, ...c.patch }); r.perf = true; }
      }
    }, setOnline);
    chan.current = ch;
    const tick = () => {
      if (role === "mixer") {
        send("mix", mixRef.current);
        setDecks(s => ({ A: s.A && clockNow() - s.A.seen < 4000 ? s.A : null, B: s.B && clockNow() - s.B.seen < 4000 ? s.B : null }));
        return;
      }
      const l = L.current, m = mixRef.current;
      send("ping", { deck: role, t0: clockNow() });
      let e: number | null = null;
      const step = l.stepNow();
      if (l.playing && !pendingStart.current && step != null && m.epoch != null && clockNow() - lastMix.current < 4000) { e = phaseErrMs(clockNow() + offset.current.ms, m.epoch, m.bpm, step); }
      setErr(e);
      send("deck", { deck: role, playing: l.playing, bpm: l.bpm, out: l.out(), err: e, pads: l.pads, bank: l.bank, queued: l.queued, perf: l.performance });
      if (clockNow() - lastMix.current > 4000) releaseRemote();
    };
    tick();
    const phase = window.setInterval(() => {
      if (role === "mixer") return;
      const l = L.current, m = mixRef.current, step = l.stepNow(), now = clockNow();
      if (!l.playing || pendingStart.current || step == null || m.epoch == null || now - lastMix.current > 4000) { l.nudgeTempo(1); return; }
      const e = phaseErrMs(now + offset.current.ms, m.epoch, m.bpm, step);
      l.nudgeTempo(nudgeRatio(e, 600), 250);
    }, 100);
    const beat = window.setInterval(tick, 1000);
    return () => { window.clearInterval(beat); window.clearInterval(phase); cancelStart(); releaseRemote(); L.current.nudgeTempo(1); ch.close(); chan.current = null; setOnline(false); setErr(null); L.current.setDeckOut(DECK_HOME, 1); };
  }, [role, room, mode, send, applyMix]);

  const setMix = useCallback((m: Mix) => {
    const prev = mixRef.current, now = clockNow();
    const next = { ...m, epoch: m.bpm !== prev.bpm && prev.epoch != null ? reanchorEpoch(now, prev.epoch, prev.bpm, m.bpm) : m.epoch ?? prev.epoch ?? now };
    setMixState(next); mixRef.current = next; send("mix", next);
  }, [send]);
  const host = useCallback(() => { const m = { ...MIX_HOME, bpm: L.current.bpm, epoch: clockNow() }; setRoom(makeRoomCode()); setDecks({ A: null, B: null }); setMixState(m); mixRef.current = m; setRole("mixer"); }, []);
  const join = useCallback((code: string, deck: DeckId) => { void L.current.ensure().catch(() => {}); setRoom(code.toUpperCase()); setRole(deck); }, []);
  const leave = useCallback(() => { setRole("solo"); setRoom(""); }, []);
  /** Start a deck on the next shared bar so it lands on the same downbeat as the other deck. */
  const startDeck = useCallback((deck: DeckId) => { const m = mixRef.current; send("start", { deck, at: nextBarAt(clockNow(), m.epoch ?? 0, m.bpm, 600) }); }, [send]);
  const stopDeck = useCallback((deck: DeckId) => send("stop", { deck }), [send]);

  /** Mixer-side remote controls: optimistic local view, the deck's next status confirms it. */
  const editDeck = useCallback((d: DeckId, f: (s: DeckStatus) => DeckStatus) => setDecks(s => s[d] ? { ...s, [d]: f(s[d]!) } : s), []);
  const ctl = useCallback((t: Target, op: Ctl["op"], i?: number) => targets(t).forEach(d => {
    send("ctl", { deck: d, op, i });
    editDeck(d, s => op === "mute" ? { ...s, pads: s.pads.map((p, j) => j === i ? { ...p, mute: !p.mute } : p) } : op === "solo" ? { ...s, pads: s.pads.map((p, j) => j === i ? { ...p, solo: !p.solo } : p) } : op === "unmute" ? { ...s, pads: s.pads.map(p => ({ ...p, mute: false })) } : op === "bank" && i != null ? { ...s, queued: s.playing && i !== s.bank ? i : null, bank: s.playing ? s.bank : i } : s);
  }), [send, editDeck]);
  const setRemotePerf = useCallback((t: Target, p: PerformanceParams, base: PerformanceParams) => {
    const patch: Partial<PerformanceParams> = {};
    (Object.keys(p) as (keyof PerformanceParams)[]).forEach(k => { if (p[k] !== base[k]) (patch as Record<string, unknown>)[k] = p[k]; });
    if (!Object.keys(patch).length) return;
    targets(t).forEach(d => { holdPerf.current[d] = clockNow() + 1500; send("ctl", { deck: d, op: "perf", patch }); editDeck(d, s => ({ ...s, perf: { ...s.perf, ...patch } })); });
  }, [send, editDeck]);

  return { role, room, mode, setMode, mix, setMix, decks, online, pending, err, host, join, leave, startDeck, stopDeck, ctl, setRemotePerf };
}
