import { useEffect, useState } from "react";
import VjCanvas from "@/vj/VjCanvas";
import { vjListen, vjSend } from "@/vj/bus";

// Pop-out projector window: drag to the TV, click once for fullscreen. Follows the groovebox theme live.
export default function VjPage() {
  const [theme, setTheme] = useState("oled");
  useEffect(() => { document.title = "Nadrisk VJ"; const off = vjListen(m => { if (m.t === "theme") setTheme(m.theme); }); vjSend({ t: "hello" }); return off; }, []);
  const full = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); };
  return <div className="site-shell vj-page" data-lcd={theme} onClick={full} title="Click for fullscreen">
    <VjCanvas theme={theme} />
  </div>;
}
