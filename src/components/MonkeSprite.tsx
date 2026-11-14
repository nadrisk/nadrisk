import { MONKE_FRAMES, MONKE_H, MONKE_W } from "./monkeFrames";
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
export default function MonkeSprite({ laughing = false, body = false, icon = false, pose = "run" }: { laughing?: boolean; body?: boolean; icon?: boolean; pose?: Pose }) {
  if (body) return <svg viewBox={`0 0 ${MONKE_W} ${MONKE_H}`} aria-hidden="true" shapeRendering="crispEdges" className={`monke-sprite monke-body monke-${pose}`}>
    {MONKE_FRAMES.map((f, i) => <g key={i} className={`monke-f monke-f${i}`} fill="currentColor">{px(f)}</g>)}
    <path className="monke-banana" d="M45 17h1v1h1v2h1v4h-1v2h-1v1h-3v-1h2v-2h1v-4h-1z" />
  </svg>;
  if (icon) return <svg viewBox={`0 0 ${MONKE_W} ${MONKE_H}`} aria-hidden="true" shapeRendering="crispEdges" className="monke-sprite monke-icon"><g fill="currentColor">{px(MONKE_FRAMES[0])}</g><path className="monke-banana" d="M45 17h1v1h1v2h1v4h-1v2h-1v1h-3v-1h2v-2h1v-4h-1z" /></svg>;
  return <svg viewBox="0 0 25 20" aria-hidden="true" shapeRendering="crispEdges" className={`monke-sprite ${laughing ? "laughing" : ""}`}>
    {face.flatMap((line, y) => Array.from(line).flatMap((p, x) => p === "#" ? [<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />] : []))}
  </svg>;
}
// One merged rect per ink run keeps the frames light.
function px(rows: string[]) {
  return rows.flatMap((line, y) => { const out: JSX.Element[] = []; let x = 0;
    while (x < line.length) { if (line[x] !== "#") { x++; continue; } const s = x; while (line[x] === "#") x++; out.push(<rect key={`${s}-${y}`} x={s} y={y} width={x - s} height="1" />); }
    return out; });
}
