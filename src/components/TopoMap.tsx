import { useRef } from "react";
import { TOPO_LAWS, TOPO_PATHS, type Puck, type Topo } from "@/audio/topomap";

type Props = { topo: Topo; setTopo: (f: (t: Topo) => Topo) => void; puck: Puck; setTouch: (p: Puck | null) => void; commit: () => void };

/** TOPOMAP: drag the puck to mangle the clean beat; centre = clean, letting go snaps back. */
export function TopoMap({ topo, setTopo, puck, setTouch, commit }: Props) {
  const pad = useRef<HTMLDivElement>(null);
  const at = (e: React.PointerEvent) => { const r = pad.current!.getBoundingClientRect(); const c = (v: number) => Math.max(-1, Math.min(1, v));
    return { x: c(((e.clientX - r.left) / r.width) * 2 - 1), y: c(1 - ((e.clientY - r.top) / r.height) * 2) }; };
  const cyc = <T,>(list: readonly T[], v: T) => list[(list.indexOf(v) + 1) % list.length];
  return (
    <div className="topo">
      <div className="topo-keys">
        {TOPO_LAWS.map(l => <button key={l} className={`topo-key ${topo.law === l ? "is-on" : ""}`} aria-label={`Topomap law ${l}`} aria-pressed={topo.law === l} onClick={() => setTopo(t => ({ ...t, law: l }))}>{l}</button>)}
      </div>
      <div ref={pad} className="topo-pad" role="slider" aria-label="Topomap puck" aria-valuetext={`${puck.x.toFixed(2)} ${puck.y.toFixed(2)}`}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setTouch(at(e)); }}
        onPointerMove={e => { if (e.buttons) setTouch(at(e)); }}
        onPointerUp={() => setTouch(null)} onPointerCancel={() => setTouch(null)}>
        <span className="topo-cross-h" /><span className="topo-cross-v" />
        <span className="topo-label tl">{topo.law}</span><span className="topo-label br">{Math.abs(puck.x) + Math.abs(puck.y) < .06 ? "CLEAN" : "MANGLE"}</span>
        <span className="topo-puck" style={{ left: `${(puck.x + 1) * 50}%`, top: `${(1 - puck.y) * 50}%` }} />
      </div>
      <div className="topo-keys">
        <button className="topo-key" aria-label="Topomap path" onClick={() => setTopo(t => ({ ...t, path: cyc(TOPO_PATHS, t.path) }))}>PATH {topo.path}</button>
        <button className="topo-key" aria-label="Topomap path bars" onClick={() => setTopo(t => ({ ...t, bars: cyc([1, 2, 4, 8], t.bars) }))}>{topo.bars} BAR</button>
        <button className={`topo-key ${topo.anchor ? "is-on" : ""}`} aria-label="Topomap kick anchor" aria-pressed={topo.anchor} onClick={() => setTopo(t => ({ ...t, anchor: !t.anchor }))}>ANCHOR</button>
        <button className="topo-key" aria-label="Topomap commit" onClick={commit}>COMMIT</button>
      </div>
    </div>
  );
}
