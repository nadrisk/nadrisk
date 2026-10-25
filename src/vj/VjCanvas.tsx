import { useEffect, useRef } from "react";
import { VjEngine } from "./engine";
import { vjListen, vjSend } from "./bus";

// Resolve a CSS colour to a packed little-endian RGBA word for ImageData.
function packed(css: string) {
  const c = document.createElement("canvas").getContext("2d"); if (!c) return 0; c.fillStyle = css; c.fillRect(0, 0, 1, 1);
  const [r, g, b] = c.getImageData(0, 0, 1, 1).data; return (255 << 24 | b << 16 | g << 8 | r) >>> 0;
}

export default function VjCanvas({ theme, hud = true }: { theme: string; hud?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null), hudRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const eng = new VjEngine();
    const off = vjListen(m => { if (m.t === "hit") eng.hit(m.kind, m.vel); else if (m.t === "level") eng.level += (m.v - eng.level) * 0.5; else if (m.t === "signal") eng.signal(m.wave, m.beat, m.bpm, m.running); else if (m.t === "ctl") eng.ctl(m.model, m.size); });
    // ←/→ switch model, ↑/↓ resize it; broadcast so the TV window and the overlay stay in step.
    const key = (e: KeyboardEvent) => {
      const dm = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0, ds = e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0;
      if (!dm && !ds) return; e.preventDefault(); e.stopPropagation(); vjSend({ t: "ctl", model: dm, size: ds });
    };
    window.addEventListener("keydown", key, true);
    const cs = getComputedStyle(cv), fg = packed(`hsl(${cs.getPropertyValue("--foreground")})`), bg = packed(`hsl(${cs.getPropertyValue("--background")})`);
    let raf = 0, prev = performance.now(), n = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      eng.frame(cv, fg, bg, (now - prev) / 1000); prev = now;
      if (hudRef.current && ++n % 6 === 0) hudRef.current.textContent = `NAD_VJ // ${eng.shapeName()} // ${eng.t < eng.hudUntil ? eng.hudMsg : eng.last || "IDLE"} // LVL ${Math.round(eng.level * 99).toString().padStart(2, "0")}`;
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); off(); window.removeEventListener("keydown", key, true); };
  }, [theme]);
  return <div className="vj-stage">
    <canvas ref={ref} className="vj-canvas" role="img" aria-label="Audio-reactive visual" />
    {hud && <div ref={hudRef} className="vj-hud" aria-hidden />}
  </div>;
}
