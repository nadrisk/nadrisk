import { createPortal } from "react-dom";
import VjCanvas from "./VjCanvas";
import AvControls from "./AvControls";

export function openVjWindow() {
  window.open(`${window.location.origin}/?av=1`, "nad-vj", "popup,width=1280,height=720");
}

export default function VjOverlay({ theme, onClose }: { theme: string; onClose: () => void }) {
  return createPortal(<div className="site-shell vj-overlay" data-lcd={theme} role="dialog" aria-label="AV">
    <VjCanvas theme={theme} />
    <AvControls onTv={openVjWindow} onClose={onClose} />
  </div>, document.body);
}
