import { useState } from "react";
import type { useLink } from "@/link/useLink";
import { type DeckId, type DeckState, validRoom, eqDb, syncState, barMs, clockNow } from "@/link/deck";
import { Button } from "@/components/ui/button";
import MixerControl from "./MixerControl";
import type { useMidi } from "@/hooks/useMidi";
import type { ReactNode } from "react";
import { MIXTOUR_MAP } from "@/link/mixtour";
import { CrateBrowser, CrateDeckHeader, type Crate } from "./CrateDecks";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect } from "react";

type Link = ReturnType<typeof useLink>;
const BANDS: [keyof DeckState, string][] = [["high", "HI"], ["mid", "MID"], ["low", "LOW"]];

/** Live position readout: 16 cells, playhead filled, active DJ loop window boxed. Polls ~20 Hz only while the deck plays. */
function DeckPos({ id, link, stepOf }: { id: DeckId; link: Link; stepOf?: (id: DeckId) => number | null }) {
  const st = link.decks[id], playing = !!st?.playing;
  const [, tick] = useState(0);
  useEffect(() => { if (!playing) return; const t = window.setInterval(() => tick(x => x + 1), 50); return () => window.clearInterval(t); }, [playing]);
  const epoch = (link.mix as { epoch?: number }).epoch;
  const raw = !playing ? null : stepOf ? stepOf(id) : epoch != null ? Math.floor((((clockNow() - epoch) % barMs(link.mix.bpm)) + barMs(link.mix.bpm)) % barMs(link.mix.bpm) / barMs(link.mix.bpm) * 16) : null;
  const step = raw == null || raw < 0 ? null : raw % 16;
  const loop = st?.perf.loop ?? 0, off = (((st?.perf.offset ?? 0) % 16) + 16) % 16;
  const inLoop = (c: number) => loop > 0 && ((c - off + 16) % 16) < loop;
  return <div className="lk-pos" aria-label={`Deck ${id} step ${step == null ? "stopped" : step + 1}, loop ${loop ? loop + " steps" : "off"}`}>
    <span className="lk-pos-read"><b>{step == null ? "--" : String(step + 1).padStart(2, "0")}</b><small>/16</small><em className={loop ? "on" : ""}>{loop ? `LOOP ${loop}` : "FULL"}</em></span>
    <span className="lk-pos-cells">{Array.from({ length: 16 }, (_, c) => <i key={c} className={`${c === step ? "on" : ""} ${inLoop(c) ? "lp" : ""} ${c % 4 === 0 ? "beat" : ""}`} />)}</span>
  </div>;
}

function Strip({ id, link, header, stepOf }: { id: DeckId; link: Link; header?: ReactNode; stepOf?: (id: DeckId) => number | null }) {
  const d = link.mix.decks[id], st = link.decks[id];
  const set = (p: Partial<DeckState>) => link.setMix({ ...link.mix, decks: { ...link.mix.decks, [id]: { ...d, ...p } } });
  return <div className="lk-strip">
    <div className="lk-strip-head"><b>CH {id === "A" ? 1 : 2}</b><span>DECK {id}</span><i className={st ? "on" : ""}>{st ? (st.playing ? "▶ " + st.bpm : "■ READY") : "· WAIT"}</i>{st && (() => { const y = syncState(st.playing, st.err); return <em className={`lk-sync ${y === "LOCK" ? "on" : ""}`} aria-label={`Deck ${id} sync ${y}`}>{y}</em>; })()}</div>
    {header}
    <DeckPos id={id} link={link} stepOf={stepOf} />
    <div className="lk-eq-stack">{BANDS.map(([k, l]) => <div className="lk-eq-row" key={k}><MixerControl label={`Deck ${id} ${l} EQ`} name={l} min={0} max={1} home={1} value={d[k]} onChange={v => set({ [k]: v })} readout={d[k] === 0 ? "KILL" : `${eqDb(d[k]).toFixed(0)}dB`} /><Button variant="outline" className="lk-kill" aria-label={`Deck ${id} ${l} kill`} aria-pressed={d[k] === 0} onClick={() => set({ [k]: d[k] === 0 ? 1 : 0 })}>×</Button></div>)}</div>
    <div className="lk-filter"><MixerControl label={`Deck ${id} filter`} name="FILTER" min={-1} max={1} home={0} value={d.filter} onChange={filter => set({ filter })} readout={d.filter < -0.02 ? `LP ${Math.round(-d.filter * 100)}` : d.filter > 0.02 ? `HP ${Math.round(d.filter * 100)}` : "OFF"} /><Button variant="ghost" aria-label={`Reset deck ${id} filter`} onClick={() => set({ filter: 0 })}>↺</Button></div>
    <MixerControl label={`Deck ${id} channel fader`} name="LEVEL" min={0} max={1} home={1} value={d.gain} onChange={gain => set({ gain })} fader="vertical" readout={`${Math.round(d.gain * 100)}`} />
    <div className="lk-transport"><Button variant="outline" aria-label={`Start deck ${id} on next bar`} disabled={!st} onClick={() => link.startDeck(id)}>▶ BAR</Button><Button variant="outline" aria-label={`Stop deck ${id}`} disabled={!st} onClick={() => link.stopDeck(id)}>■</Button></div>
  </div>;
}

export default function PerfLink({ link, midi, center, crate, onCrate }: { link: Link; midi: ReturnType<typeof useMidi>; center?: ReactNode; crate?: Crate; onCrate?: () => void }) {
  const [code, setCode] = useState("");
  const [tracksOpen, setTracksOpen] = useState(false);
  const [phone, setPhone] = useState(() => window.matchMedia("(max-width: 699px)").matches);
  useEffect(() => { const mq = window.matchMedia("(max-width: 699px)"); const update = () => { setPhone(mq.matches); setTracksOpen(false); }; mq.addEventListener("change", update); return () => mq.removeEventListener("change", update); }, []);
  if (link.role === "solo") return <div className="lk-join">
    <div className="lk-row" data-midi-ui><Button variant="outline" aria-pressed={link.mode === "tabs"} onClick={() => link.setMode("tabs")}>LOCAL TABS</Button><Button variant="outline" aria-pressed={link.mode === "devices"} onClick={() => link.setMode("devices")}>DEVICES</Button></div>
    <Button variant="outline" className="lk-big" onClick={link.host}>HOST MIXER</Button>
    {onCrate && <Button variant="outline" className="lk-big" aria-label="One-device DJ crate" onClick={onCrate}>ONE DEVICE · CRATE</Button>}
    <div className="lk-row"><input className="lk-code" maxLength={4} placeholder="CODE" aria-label="Room code" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
      <Button variant="outline" disabled={!validRoom(code)} onClick={() => link.join(code, "A")}>JOIN A</Button><Button variant="outline" disabled={!validRoom(code)} onClick={() => link.join(code, "B")}>JOIN B</Button></div>
  </div>;
  const status = <div className="lk-status"><span className={link.online ? "on" : ""}>{link.online ? "● LINKED" : "○ CONNECTING"}</span><b>{crate ? "CRATE" : `${link.mode === "tabs" ? "TABS" : "ROOM"} ${link.room}`}</b>{crate && phone && <Button variant="outline" aria-label="Open project tracks" onClick={() => setTracksOpen(true)}>TRACKS</Button>}<Button variant="outline" onClick={link.leave}>LEAVE</Button></div>;
  if (link.role !== "mixer") return <div className="lk-join">{status}
    <p className="lk-big-label">DECK {link.role}</p>
    <p>{link.pending ? "▶ STARTING ON NEXT BAR…" : link.err != null ? (Math.abs(link.err) <= 12 ? "● SYNC LOCKED" : `◐ SYNCING ${Math.round(link.err)}ms`) : "■ READY"}</p>
    <div className="lk-deck-readback"><span>FLTR {link.mix.decks[link.role].filter.toFixed(2)}</span><span>LEVEL {Math.round(link.mix.decks[link.role].gain * 100)}</span></div>
  </div>;
  const m = link.mix;
  return <div className={`lk-mixer ${crate ? "lk-mixer-crate" : ""}`}>{status}
    {crate && !phone && <CrateBrowser crate={crate} />}
    {crate && phone && <Dialog.Root open={tracksOpen} onOpenChange={setTracksOpen}>
      <Dialog.Overlay className="lk-track-shade" />
      <Dialog.Content className="lk-track-drawer" aria-describedby={undefined}>
        <header><Dialog.Title>CRATE · PROJECTS</Dialog.Title><Button variant="outline" aria-label="Close project tracks" onClick={() => setTracksOpen(false)}>→ MIXER</Button></header>
        <CrateBrowser crate={crate} onLoad={() => setTracksOpen(false)} />
      </Dialog.Content>
    </Dialog.Root>}
    <details className="lk-hardware"><summary>MIDI · HARDWARE</summary><div className="lk-midi" data-midi-ui><Button variant="outline" onClick={midi.connect} aria-label="Connect mixer MIDI">MIDI</Button><Button variant="outline" aria-label="Mixer MIDI learn" aria-pressed={midi.learn} onClick={() => midi.setLearn(!midi.learn)}>LEARN</Button><Button variant="outline" aria-label="Load Reloop Mixtour mapping" onClick={() => { midi.preset(MIXTOUR_MAP); void midi.connect(); }}>MIXTOUR</Button><span>{midi.target ?? (midi.status || (midi.devices?.join(" · ") ?? ""))}</span></div></details>
    <div className="lk-strips"><Strip id="A" link={link} stepOf={crate ? (d => crate.apis.current[d]?.step ?? null) : undefined} header={crate && phone ? <CrateDeckHeader crate={crate} id="A" onLoad={() => setTracksOpen(true)} /> : undefined} />
      <div className="lk-center"><span>NAD<br />2 CH</span><div className="lk-tempo"><Button variant="outline" aria-label="Mixer tempo down" onClick={() => link.setMix({ ...m, bpm: Math.max(60, m.bpm - 1) })}>−</Button><b>{m.bpm}<small>BPM</small></b><Button variant="outline" aria-label="Mixer tempo up" onClick={() => link.setMix({ ...m, bpm: Math.min(180, m.bpm + 1) })}>+</Button></div>
        <div className="lk-meters" aria-label="Deck output meters">{(["A", "B"] as const).map(id => <div className="lk-meter" key={id}><div>{Array.from({ length: 8 }, (_, i) => <i key={i} className={link.decks[id] && (link.decks[id]?.out ?? -60) > -48 + i * 6 ? "on" : ""} />)}</div><span>{id}</span></div>)}</div>
        <Button variant="outline" aria-label="Crossfader curve" onClick={() => link.setMix({ ...m, curve: m.curve === "blend" ? "cut" : "blend" })}>{m.curve === "blend" ? "BLEND" : "CUT"}</Button>{center && <div className="lk-center-pads">{center}</div>}</div>
      <Strip id="B" link={link} stepOf={crate ? (d => crate.apis.current[d]?.step ?? null) : undefined} header={crate && phone ? <CrateDeckHeader crate={crate} id="B" onLoad={() => setTracksOpen(true)} /> : undefined} /></div>
    <div className="lk-xf"><span>A</span><MixerControl label="Crossfader" name="CROSSFADER" min={-1} max={1} home={0} value={m.xf} onChange={xf => link.setMix({ ...m, xf })} fader="horizontal" readout={m.xf === 0 ? "CENTRE" : `${m.xf < 0 ? "A" : "B"} ${Math.round(Math.abs(m.xf) * 100)}`} /><span>B</span></div>
  </div>;
}
