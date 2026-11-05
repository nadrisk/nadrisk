import { createPortal } from "react-dom";
import VjCanvas from "./VjCanvas";
import { vjSend } from "./bus";

export function openVjWindow() {
  window.open(`${window.location.origin}/?av=1`, "nad-vj", "popup,width=1280,height=720");
}

export default function VjOverlay({ theme, onClose }: { theme: string; onClose: () => void }) {
  return createPortal(<div className="site-shell vj-overlay" data-lcd={theme} role="dialog" aria-label="AV">
    <VjCanvas theme={theme} />
    <div className="vj-keys">
      <button className="gb-cycle" onClick={() => vjSend({ t: "ctl", model: -1, size: 0 })} aria-label="Previous backdrop">&lt; BG</button>
      <button className="gb-cycle" onClick={() => vjSend({ t: "ctl", model: 1, size: 0 })} aria-label="Next backdrop">BG &gt;</button>
      <button className="gb-cycle" onClick={() => vjSend({ t: "ctl", model: 0, size: -1 })} aria-label="Smaller">-</button>
      <button className="gb-cycle" onClick={() => vjSend({ t: "ctl", model: 0, size: 1 })} aria-label="Bigger">+</button>
      <button className="gb-cycle" onClick={openVjWindow} aria-label="Open AV on external screen">TV OUT</button>
      <button className="gb-cycle" onClick={onClose} aria-label="Close AV">CLOSE</button>
    </div>
  </div>, document.body);
}
