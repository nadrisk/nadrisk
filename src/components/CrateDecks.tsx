import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type MutableRefObject } from "react";
import { useGroovebox, setCrateOwned } from "@/hooks/useGroovebox";
import type { useLink, DeckStatus } from "@/link/useLink";
import { MIX_HOME, xfGain, targets, type DeckId, type Target, type MixState } from "@/link/deck";
import { harmonyOn } from "@/audio/harmony";
import { NOTE_NAMES } from "@/audio/arp";
import { keyShift, readCrate, SETS_KEY, type CrateTrack } from "@/link/crate";
import type { PerformanceParams } from "@/audio/performance";

type G = ReturnType<typeof useGroovebox>;
type Link = ReturnType<typeof useLink>;
type Apis = MutableRefObject<Record<DeckId, G | null>>;
type Loaded = { name: string; bpm: number; sync: { key: number; tune: number } | null };
const IDS: DeckId[] = ["A", "B"];
const other = (d: DeckId): DeckId => (d === "A" ? "B" : "A");
const effKey = (g: G) => (((g.harmony.key + g.tune) % 12) + 12) % 12;
const scaleTag = (s: string) => (s === "off" || s === "chromatic" ? "" : s.slice(0, 3).toUpperCase());

/** Headless deck engine: a second/third groovebox voice on the shared clock, controlled only from the mixer. */
function CrateDeck({ id, apis, onChange }: { id: DeckId; apis: Apis; onChange: () => void }) {
  const g = useGroovebox({ deck: true });
  apis.current[id] = g;
  useEffect(() => { onChange(); }, [g.playing, g.bank, g.queued, g.slots, g.performance, g.harmony, g.tune, g.bpm, onChange]);
  useEffect(() => () => { apis.current[id] = null; }, [apis, id]);
  return null;
}

/** One-device DJ mode: saved projects load into two decks in this tab and play through the regular mixer UI. */
export function useCrate() {
  const [on, setOn] = useState(false);
  const [mix, setMixState] = useState<MixState>(MIX_HOME);
  const [loaded, setLoaded] = useState<Record<DeckId, Loaded | null>>({ A: null, B: null });
  const apis: Apis = useRef({ A: null, B: null });
  const mixRef = useRef(mix); mixRef.current = mix;
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const onChange = useCallback(() => bump(), []);
  useEffect(() => { setCrateOwned(on); if (!on) return; const id = window.setInterval(bump, 1000); return () => { window.clearInterval(id); setCrateOwned(false); }; }, [on]);
  const apply = useCallback((m: MixState) => IDS.forEach(d => { const g = apis.current[d]; if (!g) return; g.setDeckOut(m.decks[d], xfGain(d, m.xf, m.curve)); if (g.bpm !== Math.round(m.bpm)) g.setBpm(Math.round(m.bpm)); }), []);
  useEffect(() => { if (on) apply(mix); }, [on, mix, apply]);
  const setMix = useCallback((m: MixState) => { mixRef.current = m; setMixState(m); }, []);

  const load = useCallback((d: DeckId, t: CrateTrack) => {
    const g = apis.current[d]; if (!g || g.playing) return;
    g.applySet(t.set);
    const busy = IDS.some(x => apis.current[x]?.playing);
    const bpm = busy ? mixRef.current.bpm : t.bpm; // idle crate: first track sets the master tempo
    if (!busy) setMix({ ...mixRef.current, bpm });
    g.setBpm(Math.round(bpm));
    setLoaded(s => ({ ...s, [d]: { name: t.name, bpm: t.bpm, sync: null } }));
  }, [setMix]);
  const keySync = useCallback((d: DeckId) => {
    const g = apis.current[d], o = apis.current[other(d)], l = loaded[d]; if (!g || !l) return;
    if (l.sync) { if (harmonyOn(g.harmony)) g.setHarmony({ ...g.harmony, key: l.sync.key }); g.setTune(l.sync.tune); setLoaded(s => ({ ...s, [d]: { ...l, sync: null } })); return; }
    if (!o || !loaded[other(d)]) return;
    const sh = keyShift(effKey(g), effKey(o)); const sync = { key: g.harmony.key, tune: g.tune };
    if (harmonyOn(g.harmony)) g.setHarmony({ ...g.harmony, key: (((g.harmony.key + sh) % 12) + 12) % 12 }); else g.setTune(Math.max(-12, Math.min(12, g.tune + sh)));
    setLoaded(s => ({ ...s, [d]: { ...l, sync } }));
  }, [loaded]);

  const decks = {} as Record<DeckId, DeckStatus | null>;
  IDS.forEach(d => { const g = apis.current[d]; decks[d] = g && loaded[d] ? { playing: g.playing, bpm: g.bpm, out: g.getMasterDyn()?.out ?? -60, seen: Date.now(), err: g.playing ? 0 : null, pads: g.slots.map(x => ({ name: x.name, mute: x.mute, solo: x.solo })), bank: g.bank, queued: g.queued, perf: g.performance } : null; });

  const startDeck = useCallback((d: DeckId) => { const g = apis.current[d]; if (g) void g.deckStart().then(() => apply(mixRef.current)); }, [apply]);
  const stopDeck = useCallback((d: DeckId) => apis.current[d]?.deckStop(), []);
  const ctl = useCallback((t: Target, op: "mute" | "solo" | "unmute" | "bank" | "perf", i?: number) => targets(t).forEach(d => { const g = apis.current[d]; if (!g) return;
    if (op === "mute" && i != null) g.toggleMute(i); else if (op === "solo" && i != null) g.toggleSolo(i); else if (op === "unmute") g.unmuteAll(); else if (op === "bank" && i != null) g.selectBank(i); }), []);
  const setRemotePerf = useCallback((t: Target, p: PerformanceParams, base: PerformanceParams) => {
    const patch: Partial<PerformanceParams> = {};
    (Object.keys(p) as (keyof PerformanceParams)[]).forEach(k => { if (p[k] !== base[k]) (patch as Record<string, unknown>)[k] = p[k]; });
    if (Object.keys(patch).length) targets(t).forEach(d => { const g = apis.current[d]; if (g) g.setPerformance({ ...g.performance, ...patch }); });
  }, []);
  const open = useCallback(() => { setMix({ ...MIX_HOME }); setLoaded({ A: null, B: null }); setOn(true); }, [setMix]);
  const leave = useCallback(() => { IDS.forEach(d => apis.current[d]?.deckStop()); setOn(false); }, []);
  const noop = () => {};
  const link = { role: on ? "mixer" : "solo", room: "CRATE", mode: "tabs", setMode: noop, mix, setMix, decks, online: true, pending: null, err: null, host: noop, join: noop, leave, startDeck, stopDeck, ctl, setRemotePerf } as unknown as Link;
  const view = { decks, loaded, apis, load, keySync, setMaster: (bpm: number) => setMix({ ...mixRef.current, bpm }) };
  return { on, open, link, apis, onChange, view, anyPlaying: IDS.some(d => decks[d]?.playing) };
}
export type Crate = ReturnType<typeof useCrate>;

export function CrateEngines({ crate }: { crate: Crate }) {
  if (!crate.on) return null;
  return <>{IDS.map(d => <CrateDeck key={d} id={d} apis={crate.apis} onChange={crate.onChange} />)}</>;
}

/** Tracklist: saved MEM projects with BPM and key; LOAD A / LOAD B into an idle deck (a playing deck is locked, like a CDJ). */
export function CrateBrowser({ crate }: { crate: Crate }) {
  const [tracks, setTracks] = useState<CrateTrack[]>([]);
  const refresh = useCallback(() => { try { setTracks(readCrate(localStorage.getItem(SETS_KEY))); } catch { setTracks([]); } }, []);
  useEffect(refresh, [refresh]);
  const v = crate.view, master = crate.link.mix.bpm;
  const info = useMemo(() => IDS.map(d => { const g = v.apis.current[d], l = v.loaded[d]; return { d, g, l }; }), [v]);
  return <div className="lk-crate" data-midi-ui>
    <div className="lk-crate-decks">{info.map(({ d, g, l }) => <div key={d} className="lk-crate-deck">
      <span className="lk-crate-tag">{d}</span>
      <b>{l ? l.name : "— EMPTY —"}</b>
      <small>{l && g ? `${l.bpm} BPM${l.bpm !== master ? ` → ${master}` : ""} · ${NOTE_NAMES[effKey(g)]} ${scaleTag(g.harmony.scale)}` : "LOAD A TRACK"}</small>
      <span className="lk-crate-acts">
        <button className="gb-cycle" aria-label={`Deck ${d} key sync`} aria-pressed={!!l?.sync} disabled={!l || (!l.sync && !v.loaded[other(d)])} onClick={() => v.keySync(d)}>KEY SYNC</button>
        <button className="gb-cycle" aria-label={`Use deck ${d} tempo as master`} disabled={!l || l.bpm === master} onClick={() => l && v.setMaster(l.bpm)}>BPM ⇢ MST</button>
      </span>
    </div>)}</div>
    <div className="lk-crate-head"><span>TRACK</span><span>BPM</span><span>KEY</span><button className="gb-cycle" aria-label="Refresh crate" onClick={refresh}>↻</button></div>
    <ul className="lk-crate-list" aria-label="Project crate">
      {tracks.length === 0 && <li className="lk-crate-empty">No saved projects yet. Save sets in MEM, then they show up here.</li>}
      {tracks.map(t => <li key={t.slot}>
        <span className="lk-crate-name">{String(t.slot + 1).padStart(2, "0")} {t.name}</span><span>{t.bpm}</span><span>{NOTE_NAMES[t.key]}{scaleTag(t.scale) && ` ${scaleTag(t.scale)}`}</span>
        <span className="lk-crate-load">{IDS.map(d => <button key={d} className="gb-cycle" aria-label={`Load ${t.name} to deck ${d}`} disabled={!!v.decks[d]?.playing} onClick={() => v.load(d, t)}>{d}</button>)}</span>
      </li>)}
    </ul>
  </div>;
}
