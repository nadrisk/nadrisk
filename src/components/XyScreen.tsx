import { memo, useRef } from "react";
import { Tap, XYPad } from "@/pixel/PixelScreen";
import { Panel } from "./pixelScreens";
import type { Slot } from "@/hooks/useGroovebox";
import { commitXY, xyLabels } from "@/audio/xyMaps";

const X0 = 2, Y0 = 11, PW = 124, PH = 34;
// XY: explore the instrument's own sound. X = tight..open, Y = dark..bright, centre = saved patch.
// HOLD keeps the position after lift; SNAP springs back to centre. COMMIT writes the explored sound into the knobs.
function XyScreen({ slot, onChange }: { slot: Slot; onChange: (p: Partial<Slot>) => void }) {
  const xy = slot.xy ?? { x: 0, y: 0 }, hold = xy.hold ?? true, h = xyHome(xy);
  const at = (x: number, y: number, hd = hold) => ({ xy: { x, y, hold: hd, ox: xy.ox, oy: xy.oy } });
  const trail = useRef<[number, number][]>([]);
  const [lx, ly] = xyLabels(slot);
  const move = (x: number, y: number) => { trail.current = [...trail.current.slice(-7), [x, y]]; onChange(at(+x.toFixed(3), +y.toFixed(3))); };
  const lift = () => { trail.current = []; if (!hold) onChange(at(h.x, h.y)); };
  const px = (v: number) => X0 + Math.round((v + 1) / 2 * (PW - 1)), py = (v: number) => Y0 + Math.round((1 - v) / 2 * (PH - 1));
  const off = Math.abs(xy.x - h.x) > .01 || Math.abs(xy.y - h.y) > .01;
  return <Panel name="XY" label="Instrument XY pad" pages={["XY"]} deps={[xy.x, xy.y, hold, slot.engine, slot.bass.mode, lx]}
    knobs={() => []}
    body={p => {
      p.box(X0, Y0, PW, PH);
      for (let x = X0 + 4; x < X0 + PW; x += 6) p.dot(x, Y0 + PH / 2);
      for (let y = Y0 + 3; y < Y0 + PH; y += 4) p.dot(X0 + PW / 2, y);
      p.text("TIGHT", 4, 13); p.text("OPEN", 106, 13); p.text("BRT", 54, 13); p.text("DRK", 54, 39);
      trail.current.forEach(([x, y]) => p.dot(px(x), py(y)));
      const cx = px(xy.x), cy = py(xy.y); p.rect(cx - 2, cy - 2, 5, 5); p.rect(cx - 1, cy - 1, 3, 3, false);
      p.text(`X ${lx}`.slice(0, 15), 2, 47); p.text(`Y ${ly}`.slice(0, 15), 2, 54);
      [["HOLD", hold], ["SNAP", !hold]].forEach(([t, on], i) => { const x = 66 + i * 21; if (on) p.rect(x, 46, 20, 8); else p.box(x, 46, 20, 8); p.textC(t as string, x + 10, 48, !on); });
      p.box(108, 46, 19, 8); if (off) p.textC("SET", 117, 48); else p.textC("---", 117, 48);
      p.box(66, 55, 61, 8); p.textC("CENTER", 96, 57);
    }}
    extra={() => <>
      <XYPad x={X0} y={Y0} w={PW} h={PH} label="Sound XY: left tight, right open, down dark, up bright" onMove={move} onLift={lift} />
      <Tap x={66} y={46} w={20} h={8} label="XY hold position" pressed={hold} onClick={() => onChange({ xy: { ...xy, hold: true } })} />
      <Tap x={87} y={46} w={20} h={8} label="XY snap back to centre" pressed={!hold} onClick={() => onChange(at(h.x, h.y, false))} />
      <Tap x={108} y={46} w={19} h={8} label="Commit XY sound into the knobs" disabled={!off} onClick={() => onChange(commitXY(slot))} />
      <Tap x={66} y={55} w={61} h={8} label="XY back to centre" onClick={() => onChange({ xy: { x: 0, y: 0, hold } })} />
    </>} />;
}
export default memo(XyScreen);
