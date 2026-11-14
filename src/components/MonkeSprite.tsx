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
type Pose = "run" | "laugh" | "bonk";
export default function MonkeSprite({ laughing = false, body = false, pose = "run" }: { laughing?: boolean; body?: boolean; pose?: Pose }) {
  if (body) return <svg viewBox="0 0 40 40" aria-hidden="true" shapeRendering="crispEdges" className={`monke-sprite monke-body monke-${pose}`}>
    <g fill="currentColor">
      <g className="monke-tail"><path d="M29 26h5v-3h3V12h-6v3h3v7h-5z" /></g>
      <path d="M14 21h13v4h3v10H11V25h3z" />
      <g className="monke-limbs-a"><path d="M11 23H7v5H4v4h7v-4h3zM26 23h5v5h3v4h-7v-4h-3zM13 34h6v5H9v-3h4zM24 34h5v3h4v3H23z" /></g>
      <g className="monke-limbs-b"><path d="M11 23H6v-4H3v8h8v3h3zM26 23h6v-4h4v8h-7v3h-3zM12 34h6v3h4v3H10zM24 34h6v5H20v-3h4z" /></g>
    </g>
    <g className="monke-head" fill="currentColor">
      <path d="M13 3h13v2h3v3h4v8h-4v4h-3v3H13v-3h-3v-4H6V8h4V5h3z" />
      <path className="monke-cutout" d="M8 10h2v4H8zM29 10h2v4h-2zM13 9h6v3h-6zM22 8h5v3h-5zM13 15h14v4H13z" />
      <path d="M16 9h2v3h-2zM23 8h2v3h-2zM15 17h2v2h-2zM19 17h2v2h-2zM23 17h2v2h-2z" />
      <path className="monke-laugh-mouth monke-cutout" d="M14 14h13v6H14z" />
      <path className="monke-laugh-mouth" d="M15 14h11v2H15zM18 19h6v1h-6z" />
      <g className="monke-bonk-eyes"><path className="monke-cutout" d="M12 7h16v6H12z" /><path d="M13 8h2v1h2v2h-2v1h-2v-2h-1V9h1zM23 8h2v1h2v2h-2v1h-2v-2h-1V9h1z" /></g>
    </g>
    <g className="monke-bonk-stars" fill="currentColor"><path d="M4 1h2v2h2v2H6v2H4V5H2V3h2zM32 2h2v2h2v2h-2v2h-2V6h-2V4h2z" /></g>
  </svg>;
  return <svg viewBox="0 0 25 20" aria-hidden="true" shapeRendering="crispEdges" className={`monke-sprite ${laughing ? "laughing" : ""}`}>
    {face.flatMap((line, y) => Array.from(line).flatMap((p, x) => p === "#" ? [<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />] : []))}
  </svg>;
}