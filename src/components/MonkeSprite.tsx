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
export default function MonkeSprite({ laughing = false }: { laughing?: boolean }) {
  return <svg viewBox="0 0 25 20" aria-hidden="true" shapeRendering="crispEdges" className={`monke-sprite ${laughing ? "laughing" : ""}`}>
    {face.flatMap((line, y) => Array.from(line).flatMap((p, x) => p === "#" ? [<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />] : []))}
  </svg>;
}