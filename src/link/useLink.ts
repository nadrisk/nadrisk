import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type DeckId, type DeckState, type MixState, DECK_HOME, MIX_HOME, xfGain, nextBarAt, makeRoomCode } from "./deck";

export type LinkRole = "solo" | "mixer" | DeckId;
export type DeckStatus = { playing: boolean; bpm: number; out: number; seen: number };
type Local = { playing: boolean; bpm: number; togglePlay: () => void; setBpm: (b: number) => void; setDeckOut: (d: DeckState, xf: number) => void; out: () => number };

/** Room link over a Cloud realtime broadcast channel: the mixer sends absolute mix state (heartbeat-repeated, idempotent); decks report status and follow it. */
export function useLink(local: Local) {
  const [role, setRole] = useState<LinkRole>("solo");
  const [room, setRoom] = useState("");
  const [mix, setMixState] = useState<MixState>(MIX_HOME);
  const [decks, setDecks] = useState<Record<DeckId, DeckStatus | null>>({ A: null, B: null });
  const [online, setOnline] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const L = useRef(local); L.current = local;
  const mixRef = useRef(mix); mixRef.current = mix;
  const chan = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timers = useRef<number[]>([]);

  const send = useCallback((event: string, payload: unknown) => { chan.current?.send({ type: "broadcast", event, payload }); }, []);
  const applyMix = useCallback((m: MixState, d: DeckId) => { L.current.setDeckOut(m.decks[d], xfGain(d, m.xf, m.curve)); if (Math.round(m.bpm) !== L.current.bpm) L.current.setBpm(Math.round(m.bpm)); }, []);

  useEffect(() => {
    if (role === "solo" || !room) return;
    const ch = supabase.channel(`nad-room-${room}`, { config: { broadcast: { self: false } } });
    chan.current = ch;
    if (role === "mixer") {
      ch.on("broadcast", { event: "deck" }, ({ payload }) => { const p = payload as { deck: DeckId } & Omit<DeckStatus, "seen">; setDecks(s => ({ ...s, [p.deck]: { playing: p.playing, bpm: p.bpm, out: p.out, seen: Date.now() } })); });
    } else {
      const me = role;
      ch.on("broadcast", { event: "mix" }, ({ payload }) => { const m = payload as MixState; setMixState(m); applyMix(m, me); });
      ch.on("broadcast", { event: "start" }, ({ payload }) => { const p = payload as { deck: DeckId; at: number }; if (p.deck !== me) return; setPending(p.at); const id = window.setTimeout(() => { setPending(null); if (!L.current.playing) L.current.togglePlay(); }, Math.max(0, p.at - Date.now())); timers.current.push(id); });
      ch.on("broadcast", { event: "stop" }, ({ payload }) => { const p = payload as { deck: DeckId }; if (p.deck === me && L.current.playing) L.current.togglePlay(); });
    }
    ch.subscribe(st => setOnline(st === "SUBSCRIBED"));
    const beat = window.setInterval(() => {
      if (role === "mixer") send("mix", mixRef.current);
      else send("deck", { deck: role, playing: L.current.playing, bpm: L.current.bpm, out: L.current.out() });
      if (role === "mixer") setDecks(s => ({ A: s.A && Date.now() - s.A.seen < 4000 ? s.A : null, B: s.B && Date.now() - s.B.seen < 4000 ? s.B : null }));
    }, 1000);
    return () => { window.clearInterval(beat); timers.current.forEach(clearTimeout); timers.current = []; supabase.removeChannel(ch); chan.current = null; setOnline(false); setPending(null); L.current.setDeckOut(DECK_HOME, 1); };
  }, [role, room, send, applyMix]);

  const setMix = useCallback((m: MixState) => { setMixState(m); mixRef.current = m; send("mix", m); }, [send]);
  const host = useCallback(() => { setRoom(makeRoomCode()); setDecks({ A: null, B: null }); setMixState({ ...MIX_HOME, bpm: L.current.bpm }); setRole("mixer"); }, []);
  const join = useCallback((code: string, deck: DeckId) => { setRoom(code.toUpperCase()); setRole(deck); }, []);
  const leave = useCallback(() => { setRole("solo"); setRoom(""); }, []);
  /** Start a deck on the next bar so the crossfade lands on the beat. */
  const startDeck = useCallback((deck: DeckId) => send("start", { deck, at: nextBarAt(Date.now(), 0, mixRef.current.bpm, 600) }), [send]);
  const stopDeck = useCallback((deck: DeckId) => send("stop", { deck }), [send]);
  return { role, room, mix, setMix, decks, online, pending, host, join, leave, startDeck, stopDeck };
}
