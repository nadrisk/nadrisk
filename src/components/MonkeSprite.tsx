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
  if (body) return <svg viewBox={`0 -6 ${MONKE_W + 4} ${MONKE_H + 6}`} aria-hidden="true" shapeRendering="crispEdges" className={`monke-sprite monke-body monke-${pose}`}>
    {MONKE_FRAMES.map((f, i) => <g key={i} className={`monke-f monke-f${i}`} fill="currentColor">{px(f)}</g>)}
    <MonkeFace /><BananaArm />
  </svg>;
  if (icon) return <svg viewBox={`0 -6 ${MONKE_W + 4} ${MONKE_H + 6}`} aria-hidden="true" shapeRendering="crispEdges" className="monke-sprite monke-icon"><g fill="currentColor">{px(MONKE_FRAMES[0])}</g><MonkeFace /><BananaArm /></svg>;
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
// Cheeky squint, raised brow and wide toothy grin over the walk frames' head.
function MonkeFace() {
  return <g className="monke-face">
    <path className="monke-cutout" d="M32 3h8v5h-8z" />
    <path fill="currentColor" d="M33 2h2v1h2v1h2v1h-3v-1h-3z M37 5h1v1h-1z M32 7h1v1h7v-1h1v-1h1v2h-1v1h-8v-1h-1z" />
    <path className="monke-cutout" d="M34 7h1v1h-1z M36 7h1v1h-1z M38 7h1v1h-1z" />
  </g>;
}
// Arm pivots at the shoulder so the gripped banana hammers down with the paw.
function BananaArm() {
  return <g className="monke-arm">
    <path fill="currentColor" d="M39 14h3v1h2v1h2v1h2v3h-3v-1h-2v-1h-2v-1h-2z" />
    <path className="monke-banana" d="M48 10h1v1h1v2h1v4h-1v1h-1v1h-2v-1h1v-1h1v-4h-1v-2h-1z" />
  </g>;
}
