import { useEffect, useState } from "react";
import { Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { vjListen, vjSend, vjVisualState } from "./bus";
import { WORLDS, GROUNDS, OBJECTS, MOTIONS, CAMS, SKINS, FORMS, EFFECTS, PALETTES, cleanOpts, type OptKey } from "./gl/options";

const ROWS: Record<string, [OptKey, string, readonly string[]][]> = {
  SPACE: [["ground", "WORLD", GROUNDS], ["object", "OBJ", OBJECTS], ["motion", "MOVE", MOTIONS], ["cam", "CAM", CAMS], ["skin", "SKIN", SKINS], ["floor", "FLOOR", SKINS], ["effect", "FX", EFFECTS], ["palette", "PAL", PALETTES]],
  PLASMA: [["form", "FORM", FORMS], ["effect", "FX", EFFECTS], ["palette", "PAL", PALETTES]],
};

export default function AvControls({ onClose, onTv }: { onClose?: () => void; onTv?: () => void }) {
  const [color, setColor] = useState(() => vjVisualState().color);
  const [code, setCode] = useState(() => vjVisualState().code);
  const [vis, setVis] = useState(() => vjVisualState());
  useEffect(() => vjListen(m => { if (m.t === "color") setColor(m.enabled); else if (m.t === "code") setCode(m.enabled); else if (m.t === "visual") { setColor(m.state.color); setCode(!!m.state.code); } if (m.t === "visual" || m.t === "opt" || m.t === "ctl") setVis(vjVisualState()); }), []);
  const world = WORLDS[vis.model], opts = cleanOpts(vis.opts);
  return <div className="vj-keys" onClick={e => e.stopPropagation()}>
    <span className="av-key av-label" aria-live="polite">{world}</span>
    {(ROWS[world] ?? []).filter(([key]) => key !== "floor" || opts.ground !== 3).map(([key, label, names]) => <Button key={key} variant="outline" size="sm" className="av-key" title={`Next ${label}`} aria-label={`${label} ${names[opts[key]]}, next`} onClick={() => vjSend({ t: "opt", key, d: 1 })}>{label} {names[opts[key]]}</Button>)}
    <Button variant="outline" size="sm" className="av-key" title="Previous backdrop" aria-label="Previous world" onClick={() => vjSend({ t: "ctl", model: -1, size: 0 })}><ChevronLeft />BG</Button>
    <Button variant="outline" size="sm" className="av-key" title="Next backdrop" aria-label="Next world" onClick={() => vjSend({ t: "ctl", model: 1, size: 0 })}>BG<ChevronRight /></Button>
    <Button variant="outline" size="sm" className="av-key av-icon" title="Smaller" aria-label="Smaller" onClick={() => vjSend({ t: "ctl", model: 0, size: -1 })}><Minus /></Button>
    <Button variant="outline" size="sm" className="av-key av-icon" title="Bigger" aria-label="Bigger" onClick={() => vjSend({ t: "ctl", model: 0, size: 1 })}><Plus /></Button>
    <Button variant="outline" size="sm" className="av-key" title="Original colours / 1-bit (C)" aria-label="Original colours" aria-pressed={color} onClick={() => vjSend({ t: "color", enabled: !vjVisualState().color })}>COLOR</Button>
    <Button variant="outline" size="sm" className="av-key" title="Code overlay (K)" aria-label="Code overlay" aria-pressed={code} onClick={() => vjSend({ t: "code", enabled: !vjVisualState().code })}>CODE</Button>
    {onTv && <Button variant="outline" size="sm" className="av-key" aria-label="Open AV on external screen" onClick={onTv}>AV OUT</Button>}
    {onClose && <Button variant="outline" size="sm" className="av-key" aria-label="Close AV" onClick={onClose}>CLOSE</Button>}
  </div>;
}