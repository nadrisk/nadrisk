import { useEffect, useState } from "react";
import { MONKE_DOWN, MONKE_H, MONKE_UP, MONKE_W } from "./monkeFrames";
// Original 1-bit sprite; hard pixel edges stay sharp at every integer scale.
const face = [
  "        ########        ",
  "      ############      ",
  "     ##############     ",
  " ### ################ ###",
  "########################",
  "###  ###      ###  #####",
  "##   ##        ##   ####",
  "##  #  ##    ##  #  ####",
  "###    ##    ##    #####",
  " ###              ##### ",
  "  ###    ####    #####  ",
  "   ###          #####   ",
  "   ##  ########  ####   ",
  "   ## # # # # ## ####   ",
  "    # ########## ###    ",
  "    ## ######## ###     ",
  "     ##        ###      ",
  "      ##########        ",
  "        ######          ",
];
type Pose = "run" | "laugh";
export default function MonkeSprite({ laughing = false, body = false, icon = false }: { laughing?: boolean; body?: boolean; icon?: boolean; pose?: Pose }) {
  if (body) return <MonkeHunter laughing={false} />;
  if (icon) return <MonkeArt frame={MONKE_UP} className="monke-icon" />;
  return <svg viewBox="0 0 25 20" aria-hidden="true" shapeRendering="crispEdges" className={`monke-sprite ${laughing ? "laughing" : ""}`}>
    {face.flatMap((line, y) => Array.from(line).flatMap((p, x) => p === "#" ? [<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />] : []))}
  </svg>;
}
// One merged rect per run of the same colour keeps frames light.
function px(rows: string[], ch: string) {
  return rows.flatMap((line, y) => { const out: JSX.Element[] = []; let x = 0;
    while (x < line.length) { if (line[x] !== ch) { x++; continue; } const s = x; while (line[x] === ch) x++; out.push(<rect key={`${ch}${s}-${y}`} x={s} y={y} width={x - s} height="1" />); }
    return out; });
}
function MonkeArt({ frame, className = "", style }: { frame: string[]; className?: string; style?: React.CSSProperties }) {
  return <svg viewBox={`0 0 ${MONKE_W} ${MONKE_H}`} aria-hidden="true" shapeRendering="crispEdges" className={`monke-sprite ${className}`} style={style}>
    <g fill="currentColor">{px(frame, "#")}</g>
    <g className="monke-cutout">{px(frame, ".")}</g>
    <g className="monke-banana">{px(frame, "y")}</g>
  </svg>;
}

/** In-grid Monke: alternates two complete drawings (banana raised / banana struck down). */
export function MonkeHunter({ laughing }: { laughing: boolean }) {
  const [t, setT] = useState(0);
  useEffect(() => { const id = window.setInterval(() => setT(x => x + 1), laughing ? 140 : 220); return () => window.clearInterval(id); }, [laughing]);
  const down = t % 2 === 1;
  return <MonkeArt frame={down ? MONKE_DOWN : MONKE_UP} className="monke-hunter" style={{ transform: down ? "translateY(1px)" : undefined }} />;
}
