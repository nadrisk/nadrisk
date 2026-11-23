import { useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { mangleRow, TOPO_LAWS, TOPO_PATHS, type Puck, type Topo } from "@/audio/topomap";
import { CHANNELS } from "@/audio/channels";

type Props = { topo: Topo; setTopo: (f: (t: Topo) => Topo) => void; puck: Puck; setTouch: (p: Puck | null) => void; commit: () => void; rows?: number[][]; step?: number };

/** TOPOMAP: drag the puck to mangle the clean beat; centre = clean, letting go snaps back. */
export function TopoMap({ topo, setTopo, puck, setTouch, commit, rows = [], step = -1 }: Props) {
  const pad = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null), axes = useRef<HTMLDivElement>(null), latest = useRef({ puck, setTouch }); latest.current = { puck, setTouch };
  useEffect(() => {
    const el = axes.current; if (!el) return;
    const receive = (e: Event) => { const target = e.target as HTMLElement, axis = target.dataset.axis; if (axis !== "x" && axis !== "y") return; latest.current.setTouch({ ...latest.current.puck, [axis]: (e as CustomEvent<number>).detail * 2 - 1 }); };
    el.addEventListener("midivalue", receive); return () => el.removeEventListener("midivalue", receive);
  }, []);
  useEffect(() => {
    const el = canvas.current, root = pad.current; if (!el || !root) return; const c = el.getContext("2d"); if (!c) return;
    const css = getComputedStyle(root); c.clearRect(0, 0, 256, 128); c.strokeStyle = c.fillStyle = css.color;
    rows.forEach((row, r) => { const y = 22 + r * 16; const mangled = r === 0 && topo.anchor ? row : mangleRow(row, 16, topo.law, puck);
      c.font = "8px monospace"; c.fillText(CHANNELS[r]?.name ?? "", 4, y + 2);
      for (let i = 0; i < 16; i++) { const x = 40 + i * 13; c.globalAlpha = .15; c.fillRect(x, y, 1, 1); c.globalAlpha = .45; if (row[i]) c.strokeRect(x - 2, y - 3, 5, 6); c.globalAlpha = 1; if (mangled[i]) c.fillRect(x - 1, y - 2, 3, 4); }
    });
    c.globalAlpha = .45; if (step >= 0) c.fillRect(40 + step % 16 * 13, 12, 1, 106); c.globalAlpha = 1;
  }, [rows, topo, puck, step]);
  const at = (e: React.PointerEvent) => { const r = pad.current?.getBoundingClientRect(); if (!r) return { x: 0, y: 0 }; const c = (v: number) => Math.max(-1, Math.min(1, v));
    return { x: c(((e.clientX - r.left) / r.width) * 2 - 1), y: c(1 - ((e.clientY - r.top) / r.height) * 2) }; };
  const cyc = <T,>(list: readonly T[], v: T) => list[(list.indexOf(v) + 1) % list.length];
  return (
    <div className="topo">
      <div className="topo-keys">
        {TOPO_LAWS.map(l => <Button variant="ghost" key={l} className={`topo-key ${topo.law === l ? "is-on" : ""}`} aria-label={`Topomap law ${l}`} aria-pressed={topo.law === l} onClick={() => setTopo(t => ({ ...t, law: l }))}>{l}</Button>)}
      </div>
      <div ref={pad} className="topo-pad" role="application" tabIndex={0} aria-label="Topomap puck" aria-roledescription="XY sequencer"
        onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setTouch(at(e)); }}
        onPointerMove={e => { if (e.buttons) setTouch(at(e)); }}
        onPointerUp={() => setTouch(null)} onPointerCancel={() => setTouch(null)} onLostPointerCapture={() => setTouch(null)}
        onKeyDown={e => { if (e.key === "Home" || e.key === "Escape") setTouch(null); else if (e.key.startsWith("Arrow")) { e.preventDefault(); const axis = ["ArrowLeft", "ArrowRight"].includes(e.key) ? "x" : "y"; setTouch({ ...puck, [axis]: Math.max(-1, Math.min(1, puck[axis] + (["ArrowRight", "ArrowUp"].includes(e.key) ? .05 : -.05))) }); } }}>
        <canvas ref={canvas} width={256} height={128} className="topo-rhythm" aria-hidden="true"/>
        <span className="topo-cross-h" /><span className="topo-cross-v" />
        <span className="topo-label tl">{topo.law}</span><span className="topo-label br">{Math.abs(puck.x) + Math.abs(puck.y) < .06 ? "CLEAN" : "MANGLE"}</span>
        <span className="topo-puck" style={{ left: `${(puck.x + 1) * 50}%`, top: `${(1 - puck.y) * 50}%` }} />
      </div>
      <div className="topo-keys">
        <Button variant="ghost" className="topo-key" aria-label="Topomap path" onClick={() => setTopo(t => ({ ...t, path: cyc(TOPO_PATHS, t.path) }))}>PATH {topo.path}</Button>
        <Button variant="ghost" className="topo-key" aria-label="Topomap path bars" onClick={() => setTopo(t => ({ ...t, bars: cyc([1, 2, 4, 8], t.bars) }))}>{topo.bars} BAR</Button>
        <Button variant="ghost" className={`topo-key ${topo.anchor ? "is-on" : ""}`} aria-label="Topomap kick anchor" aria-pressed={topo.anchor} onClick={() => setTopo(t => ({ ...t, anchor: !t.anchor }))}>ANCHOR</Button>
        <Button variant="ghost" className="topo-key" aria-label="Topomap commit" onClick={commit}>COMMIT</Button>
      </div>
      <div className="topo-axis-readout" ref={axes}>{(["x", "y"] as const).map(axis => <div key={axis} role="slider" tabIndex={0} data-axis={axis} data-midi-value="" aria-label={`Topomap ${axis.toUpperCase()}`} aria-valuemin={-1} aria-valuemax={1} aria-valuenow={puck[axis]}>{axis.toUpperCase()} {puck[axis].toFixed(2)}</div>)}</div>
    </div>
  );
}
