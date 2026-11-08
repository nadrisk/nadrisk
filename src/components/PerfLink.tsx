import { useState } from "react";
import type { useLink } from "@/link/useLink";
import { type DeckId, type DeckState, validRoom } from "@/link/deck";

type Link = ReturnType<typeof useLink>;
const BANDS: [keyof DeckState, string][] = [["high", "HI"], ["mid", "MID"], ["low", "LOW"]];

function Strip({ id, link }: { id: DeckId; link: Link }) {
  const d = link.mix.decks[id], st = link.decks[id];
  const set = (p: Partial<DeckState>) => link.setMix({ ...link.mix, decks: { ...link.mix.decks, [id]: { ...d, ...p } } });
  return <div className="lk-strip">
    <div className="lk-strip-head"><b>CH {id === "A" ? 1 : 2}</b><span>DECK {id}</span><i className={st ? "on" : ""}>{st ? (st.playing ? "▶ " + st.bpm : "■ READY") : "· WAIT"}</i></div>
    {BANDS.map(([k, l]) => <button key={k} className="lk-kill" aria-label={`Deck ${id} ${l} kill`} aria-pressed={d[k] === 0} onClick={() => set({ [k]: d[k] === 0 ? 1 : 0 })}>{d[k] === 0 ? "KILL" : l}</button>)}
    <label className="lk-knob">FLTR<input type="range" min={-1} max={1} step={0.01} value={d.filter} aria-label={`Deck ${id} filter`} onChange={e => set({ filter: +e.target.value })} onDoubleClick={() => set({ filter: 0 })} /><span>{d.filter < -0.02 ? "LP" : d.filter > 0.02 ? "HP" : "OFF"}</span></label>
    <label className="lk-fader"><input type="range" min={0} max={1} step={0.01} value={d.gain} aria-label={`Deck ${id} channel fader`} onChange={e => set({ gain: +e.target.value })} /><span>{Math.round(d.gain * 100)}</span></label>
    <div className="lk-row"><button aria-label={`Start deck ${id} on next bar`} disabled={!st} onClick={() => link.startDeck(id)}>▶ BAR</button><button aria-label={`Stop deck ${id}`} disabled={!st} onClick={() => link.stopDeck(id)}>■</button></div>
  </div>;
}

export default function PerfLink({ link }: { link: Link }) {
  const [code, setCode] = useState("");
  if (link.role === "solo") return <div className="lk-join">
    <p>LINK DEVICES · ANY SCREEN CAN BE THE MIXER. EACH DECK PLAYS ITS OWN SOUND.</p>
    <button className="lk-big" onClick={link.host}>HOST MIXER</button>
    <div className="lk-row"><input className="lk-code" maxLength={4} placeholder="CODE" aria-label="Room code" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
      <button disabled={!validRoom(code)} onClick={() => link.join(code, "A")}>JOIN A</button><button disabled={!validRoom(code)} onClick={() => link.join(code, "B")}>JOIN B</button></div>
  </div>;
  const status = <div className="lk-status"><span className={link.online ? "on" : ""}>{link.online ? "● LINKED" : "○ CONNECTING"}</span><b>ROOM {link.room}</b><button onClick={link.leave}>LEAVE</button></div>;
  if (link.role !== "mixer") return <div className="lk-join">{status}
    <p className="lk-big-label">DECK {link.role}</p>
    <p>{link.pending ? "▶ STARTING ON NEXT BAR…" : "MIXER CONTROLS YOUR OUTPUT, TEMPO AND START. LOAD A SET HERE WHILE THE OTHER DECK PLAYS."}</p>
  </div>;
  const m = link.mix;
  return <div className="lk-mixer">{status}
    <div className="lk-strips"><Strip id="A" link={link} />
      <div className="lk-center"><span>BPM</span><div className="lk-row"><button aria-label="Mixer tempo down" onClick={() => link.setMix({ ...m, bpm: Math.max(60, m.bpm - 1) })}>−</button><b>{m.bpm}</b><button aria-label="Mixer tempo up" onClick={() => link.setMix({ ...m, bpm: Math.min(180, m.bpm + 1) })}>+</button></div>
        <button aria-label="Crossfader curve" onClick={() => link.setMix({ ...m, curve: m.curve === "blend" ? "cut" : "blend" })}>{m.curve === "blend" ? "BLEND" : "CUT"}</button></div>
      <Strip id="B" link={link} /></div>
    <label className="lk-xf"><span>A</span><input type="range" min={-1} max={1} step={0.01} value={m.xf} aria-label="Crossfader" onChange={e => link.setMix({ ...m, xf: +e.target.value })} onDoubleClick={() => link.setMix({ ...m, xf: 0 })} /><span>B</span></label>
  </div>;
}
