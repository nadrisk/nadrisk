import { useState } from "react";
import type { useLink } from "@/link/useLink";
import { type DeckId, type DeckState, validRoom, eqDb, syncState } from "@/link/deck";
import { Button } from "@/components/ui/button";
import MixerControl from "./MixerControl";
import type { useMidi } from "@/hooks/useMidi";
import type { ReactNode } from "react";
import { MIXTOUR_MAP } from "@/link/mixtour";

type Link = ReturnType<typeof useLink>;
const BANDS: [keyof DeckState, string][] = [["high", "HI"], ["mid", "MID"], ["low", "LOW"]];

function Strip({ id, link }: { id: DeckId; link: Link }) {
  const d = link.mix.decks[id], st = link.decks[id];
  const set = (p: Partial<DeckState>) => link.setMix({ ...link.mix, decks: { ...link.mix.decks, [id]: { ...d, ...p } } });
  return <div className="lk-strip">
    <div className="lk-strip-head"><b>CH {id === "A" ? 1 : 2}</b><span>DECK {id}</span><i className={st ? "on" : ""}>{st ? (st.playing ? "▶ " + st.bpm : "■ READY") : "· WAIT"}</i>{st && (() => { const y = syncState(st.playing, st.err); return <em className={`lk-sync ${y === "LOCK" ? "on" : ""}`} aria-label={`Deck ${id} sync ${y}`}>{y}</em>; })()}</div>
    <div className="lk-eq-stack">{BANDS.map(([k, l]) => <div className="lk-eq-row" key={k}><MixerControl label={`Deck ${id} ${l} EQ`} name={l} min={0} max={1} home={1} value={d[k]} onChange={v => set({ [k]: v })} readout={d[k] === 0 ? "KILL" : `${eqDb(d[k]).toFixed(0)}dB`} /><Button variant="outline" className="lk-kill" aria-label={`Deck ${id} ${l} kill`} aria-pressed={d[k] === 0} onClick={() => set({ [k]: d[k] === 0 ? 1 : 0 })}>×</Button></div>)}</div>
    <div className="lk-filter"><MixerControl label={`Deck ${id} filter`} name="FILTER" min={-1} max={1} home={0} value={d.filter} onChange={filter => set({ filter })} readout={d.filter < -0.02 ? `LP ${Math.round(-d.filter * 100)}` : d.filter > 0.02 ? `HP ${Math.round(d.filter * 100)}` : "OFF"} /><Button variant="ghost" aria-label={`Reset deck ${id} filter`} onClick={() => set({ filter: 0 })}>↺</Button></div>
    <MixerControl label={`Deck ${id} channel fader`} name="LEVEL" min={0} max={1} home={1} value={d.gain} onChange={gain => set({ gain })} fader="vertical" readout={`${Math.round(d.gain * 100)}`} />
    <div className="lk-transport"><Button variant="outline" aria-label={`Start deck ${id} on next bar`} disabled={!st} onClick={() => link.startDeck(id)}>▶ BAR</Button><Button variant="outline" aria-label={`Stop deck ${id}`} disabled={!st} onClick={() => link.stopDeck(id)}>■</Button></div>
  </div>;
}

export default function PerfLink({ link, midi, center, crate, onCrate }: { link: Link; midi: ReturnType<typeof useMidi>; center?: ReactNode; crate?: ReactNode; onCrate?: () => void }) {
  const [code, setCode] = useState("");
  if (link.role === "solo") return <div className="lk-join">
    <div className="lk-row" data-midi-ui><Button variant="outline" aria-pressed={link.mode === "tabs"} onClick={() => link.setMode("tabs")}>LOCAL TABS</Button><Button variant="outline" aria-pressed={link.mode === "devices"} onClick={() => link.setMode("devices")}>DEVICES</Button></div>
    <Button variant="outline" className="lk-big" onClick={link.host}>HOST MIXER</Button>
    {onCrate && <Button variant="outline" className="lk-big" aria-label="One-device DJ crate" onClick={onCrate}>ONE DEVICE · CRATE</Button>}
    <div className="lk-row"><input className="lk-code" maxLength={4} placeholder="CODE" aria-label="Room code" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
      <Button variant="outline" disabled={!validRoom(code)} onClick={() => link.join(code, "A")}>JOIN A</Button><Button variant="outline" disabled={!validRoom(code)} onClick={() => link.join(code, "B")}>JOIN B</Button></div>
  </div>;
  const status = <div className="lk-status"><span className={link.online ? "on" : ""}>{link.online ? "● LINKED" : "○ CONNECTING"}</span><b>{crate ? "ONE DEVICE · CRATE" : `${link.mode === "tabs" ? "TABS" : "ROOM"} ${link.room}`}</b><Button variant="outline" onClick={link.leave}>LEAVE</Button></div>;
  if (link.role !== "mixer") return <div className="lk-join">{status}
    <p className="lk-big-label">DECK {link.role}</p>
    <p>{link.pending ? "▶ STARTING ON NEXT BAR…" : link.err != null ? (Math.abs(link.err) <= 12 ? "● SYNC LOCKED" : `◐ SYNCING ${Math.round(link.err)}ms`) : "■ READY"}</p>
    <div className="lk-deck-readback"><span>FLTR {link.mix.decks[link.role].filter.toFixed(2)}</span><span>LEVEL {Math.round(link.mix.decks[link.role].gain * 100)}</span></div>
  </div>;
  const m = link.mix;
  return <div className="lk-mixer">{status}{crate}
    <div className="lk-midi" data-midi-ui><Button variant="outline" onClick={midi.connect} aria-label="Connect mixer MIDI">MIDI</Button><Button variant="outline" aria-label="Mixer MIDI learn" aria-pressed={midi.learn} onClick={() => midi.setLearn(!midi.learn)}>LEARN</Button><Button variant="outline" aria-label="Load Reloop Mixtour mapping" onClick={() => { midi.preset(MIXTOUR_MAP); void midi.connect(); }}>MIXTOUR</Button><span>{midi.target ?? (midi.status || (midi.devices?.join(" · ") ?? ""))}</span></div>
    <div className="lk-strips"><Strip id="A" link={link} />
      <div className="lk-center"><span>NAD<br />2 CH</span><div className="lk-tempo"><Button variant="outline" aria-label="Mixer tempo down" onClick={() => link.setMix({ ...m, bpm: Math.max(60, m.bpm - 1) })}>−</Button><b>{m.bpm}<small>BPM</small></b><Button variant="outline" aria-label="Mixer tempo up" onClick={() => link.setMix({ ...m, bpm: Math.min(180, m.bpm + 1) })}>+</Button></div>
        <div className="lk-meters" aria-label="Deck output meters">{(["A", "B"] as const).map(id => <div className="lk-meter" key={id}><div>{Array.from({ length: 8 }, (_, i) => <i key={i} className={link.decks[id] && (link.decks[id]?.out ?? -60) > -48 + i * 6 ? "on" : ""} />)}</div><span>{id}</span></div>)}</div>
        <Button variant="outline" aria-label="Crossfader curve" onClick={() => link.setMix({ ...m, curve: m.curve === "blend" ? "cut" : "blend" })}>{m.curve === "blend" ? "BLEND" : "CUT"}</Button>{center && <div className="lk-center-pads">{center}</div>}</div>
      <Strip id="B" link={link} /></div>
    <div className="lk-xf"><span>A</span><MixerControl label="Crossfader" name="CROSSFADER" min={-1} max={1} home={0} value={m.xf} onChange={xf => link.setMix({ ...m, xf })} fader="horizontal" readout={m.xf === 0 ? "CENTRE" : `${m.xf < 0 ? "A" : "B"} ${Math.round(Math.abs(m.xf) * 100)}`} /><span>B</span></div>
  </div>;
}
