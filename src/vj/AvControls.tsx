import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { vjListen, vjSend, vjVisualState } from "./bus";
import { WORLDS, GROUNDS, OBJECTS, MOTIONS, SKINS, FORMS, EFFECTS, PALETTES, SURFACE_PALETTES, INERTIAS, cleanOpts, type OptKey } from "./gl/options";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ROWS: Record<string, [OptKey, string, readonly string[]][]> = {
  SPACE: [["ground", "WORLD", GROUNDS], ["object", "OBJ", OBJECTS], ["motion", "MOVE", MOTIONS], ["effect", "FX", EFFECTS]],
  PLASMA: [["form", "FORM", FORMS], ["effect", "FX", EFFECTS], ["palette", "PAL", PALETTES]],
};

export default function AvControls({ onClose, onTv }: { onClose?: () => void; onTv?: () => void }) {
  const [color, setColor] = useState(() => vjVisualState().color);
  const [code, setCode] = useState(() => vjVisualState().code);
  const [vis, setVis] = useState(() => vjVisualState());
  useEffect(() => vjListen(m => { if (m.t === "color") setColor(m.enabled); else if (m.t === "code") setCode(m.enabled); else if (m.t === "visual") { setColor(m.state.color); setCode(!!m.state.code); } if (m.t === "visual" || m.t === "opt" || m.t === "ctl") setVis(vjVisualState()); }), []);
  const world = WORLDS[vis.model], opts = cleanOpts(vis.opts);
  const OBJ_PALETTES = ["CHROME", ...SURFACE_PALETTES.slice(1)];
  const option = (key: OptKey, label: string, names: readonly string[]) => <Button key={key} variant="outline" size="sm" className="av-key" title={`Next ${label}`} aria-label={`${label} ${names[opts[key]]}, next`} onClick={() => vjSend({ t: "opt", key, d: 1 })}>{label} {names[opts[key]]}</Button>;
  return <>
    <div className="vj-keys vj-utilities" onClick={e => e.stopPropagation()}>
      <span className="av-brand">NAD / AV</span>
      <Button variant="outline" size="sm" className="av-key" title="Original colours / 1-bit" aria-label="Original colours" aria-pressed={color} onClick={() => vjSend({ t: "color", enabled: !vjVisualState().color })}>COLOR</Button>
      <Button variant="outline" size="sm" className="av-key" title="Code overlay" aria-label="Code overlay" aria-pressed={code} onClick={() => vjSend({ t: "code", enabled: !vjVisualState().code })}>CODE</Button>
      {onTv && <Button variant="outline" size="sm" className="av-key" aria-label="Open AV on external screen" onClick={onTv}>AV OUT</Button>}
      {onClose && <Button variant="outline" size="sm" className="av-key" aria-label="Close AV" onClick={onClose}>CLOSE</Button>}
    </div>
    <div className="vj-keys vj-performance" onClick={e => e.stopPropagation()}>
    <Button variant="outline" size="sm" className="av-key" aria-label={`Mode ${world}, next`} onClick={() => vjSend({ t: "ctl", model: 1, size: 0 })}>MODE {world}</Button>
    {(ROWS[world] ?? []).map(([key, label, names]) => option(key, label, names))}
    {world === "SPACE" && <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className="av-key" aria-label="Materials">MAT</Button></PopoverTrigger><PopoverContent side="top" className="av-materials" onClick={e => e.stopPropagation()}><div>{option("skin", "OBJ SKIN", SKINS)}{option("objectPalette", "OBJ PAL", OBJ_PALETTES)}<Button variant="outline" size="sm" className="av-key" aria-label="Reset object to chrome" onClick={() => { vjSend({ t: "opt", key: "skin", d: -opts.skin }); vjSend({ t: "opt", key: "objectPalette", d: -opts.objectPalette }); }}>CHROME</Button></div><div>{option("floor", "WORLD SKIN", SKINS)}{option("floorPalette", "WORLD PAL", SURFACE_PALETTES)}</div></PopoverContent></Popover>}
    {world !== "NONE" && <div className="av-size">
    {option("inertia", "INERT", INERTIAS)}
    <Button variant="outline" size="sm" className="av-key av-icon" title="Smaller" aria-label="Smaller" onClick={() => vjSend({ t: "ctl", model: 0, size: -1 })}><Minus /></Button>
    <Button variant="outline" size="sm" className="av-key av-icon" title="Bigger" aria-label="Bigger" onClick={() => vjSend({ t: "ctl", model: 0, size: 1 })}><Plus /></Button>
    </div>}
    </div>
  </>;
}