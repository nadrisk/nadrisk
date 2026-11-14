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
export default function MonkeSprite({ laughing = false, body = false, pose = "run" }: { laughing?: boolean; body?: boolean; pose?: Pose }) {
  if (body) return <svg viewBox="0 0 40 40" aria-hidden="true" shapeRendering="crispEdges" className={`monke-sprite monke-body monke-${pose}`}>
    <g fill="currentColor">
      <g className="monke-tail"><path d="M10 24H6v-2H4V9h2V7h5v2h2v4h-3v-2H8v9h2v1h1v3z" /></g>
      <path d="M12 18h10v2h3v8h-2v2H12v-2h-2v-8h2z" />
      <g className="monke-limbs-a">
        <path d="M22 22h6v-3h3v-2h2v4h-2v2h-3v2h-6zM11 27H7v3H3v3h5v-3h4zM20 29h3v3h5v3h-8z" />
        <path className="monke-banana" d="M32 20h3v-1h1v-2h1v-4h1v6h-1v2h-1v1h-4z" /><path d="M37 12h1v1h-1z" />
      </g>
      <g className="monke-limbs-b">
        <path d="M22 23h8v2h2v3h-3v-1h-7zM11 29h4v4h4v3h-9zM19 29h4v7h-5v-2h1z" />
        <path className="monke-banana" d="M31 28h3v-1h2v-2h1v-3h1v4h-1v2h-2v1h-4z" /><path d="M37 21h1v1h-1z" />
      </g>
    </g>
    <g className="monke-head" fill="currentColor">
      <path d="M23 7h7v2h2v3h3v6h-3v2h-9v-2h-2V9h2z" />
      <path d="M18 11h3v4h-3z" />
      <path className="monke-cutout" d="M19 12h1v2h-1zM27 10h3v3h-3zM30 16h4v1h-4z" />
      <path d="M29 11h1v2h-1z" />
      <path className="monke-laugh-mouth monke-cutout" d="M28 15h7v3h-7z" />
      <path className="monke-laugh-mouth" d="M29 15h6v1h-6z" />
    </g>
  </svg>;
  return <svg viewBox="0 0 25 20" aria-hidden="true" shapeRendering="crispEdges" className={`monke-sprite ${laughing ? "laughing" : ""}`}>
    {face.flatMap((line, y) => Array.from(line).flatMap((p, x) => p === "#" ? [<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />] : []))}
  </svg>;
}