import { useEffect, useState } from "react";
import { Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { vjListen, vjSend, vjVisualState } from "./bus";

export default function AvControls({ onClose, onTv }: { onClose?: () => void; onTv?: () => void }) {
  const [color, setColor] = useState(() => vjVisualState().color);
  const [code, setCode] = useState(() => vjVisualState().code);
  useEffect(() => vjListen(m => { if (m.t === "color") setColor(m.enabled); else if (m.t === "code") setCode(m.enabled); else if (m.t === "visual") { setColor(m.state.color); setCode(!!m.state.code); } }), []);
  return <div className="vj-keys" onClick={e => e.stopPropagation()}>
    <Button variant="outline" size="sm" className="av-key" title="Previous backdrop" aria-label="Previous backdrop" onClick={() => vjSend({ t: "ctl", model: -1, size: 0 })}><ChevronLeft />BG</Button>
    <Button variant="outline" size="sm" className="av-key" title="Next backdrop" aria-label="Next backdrop" onClick={() => vjSend({ t: "ctl", model: 1, size: 0 })}>BG<ChevronRight /></Button>
    <Button variant="outline" size="sm" className="av-key av-icon" title="Smaller" aria-label="Smaller" onClick={() => vjSend({ t: "ctl", model: 0, size: -1 })}><Minus /></Button>
    <Button variant="outline" size="sm" className="av-key av-icon" title="Bigger" aria-label="Bigger" onClick={() => vjSend({ t: "ctl", model: 0, size: 1 })}><Plus /></Button>
    <Button variant="outline" size="sm" className="av-key" title="Colour sweep (C)" aria-label="Colour sweep" aria-pressed={color} onClick={() => vjSend({ t: "color", enabled: !vjVisualState().color })}>COLOR</Button>
    <Button variant="outline" size="sm" className="av-key" title="Code overlay (K)" aria-label="Code overlay" aria-pressed={code} onClick={() => vjSend({ t: "code", enabled: !vjVisualState().code })}>CODE</Button>
    {onTv && <Button variant="outline" size="sm" className="av-key" aria-label="Open AV on external screen" onClick={onTv}>TV OUT</Button>}
    {onClose && <Button variant="outline" size="sm" className="av-key" aria-label="Close AV" onClick={onClose}>CLOSE</Button>}
  </div>;
}