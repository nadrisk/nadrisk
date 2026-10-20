import { useEffect, useRef } from "react";
import { VjEngine } from "./engine";
import { vjListen } from "./bus";

// Resolve a CSS colour to a packed little-endian RGBA word for ImageData.
function packed(css: string) {
  const c = document.createElement("canvas").getContext("2d")!; c.fillStyle = css; c.fillRect(0, 0, 1, 1);
  const [r, g, b] = c.getImageData(0, 0, 1, 1).data; return (255 << 24 | b << 16 | g << 8 | r) >>> 0;
}

export default function VjCanvas({ theme, hud = true }: { theme: string; hud?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null), hudRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const eng = new VjEngine();
    const off = vjListen(m => { if (m.t === "hit") eng.hit(m.kind, m.vel); else if (m.t === "level") eng.level += (m.v - eng.level) * 0.5; });
    const cs = getComputedStyle(cv), fg = packed(`hsl(${cs.getPropertyValue("--foreground")})`), bg = packed(`hsl(${cs.getPropertyValue("--background")})`);
    let raf = 0, prev = performance.now(), n = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      eng.frame(cv, fg, bg, (now - prev) / 1000); prev = now;
      if (hudRef.current && ++n % 6 === 0) hudRef.current.textContent = `NAD_VJ // ${eng.shapeName()} // ${eng.last || "IDLE"} // LVL ${Math.round(eng.level * 99).toString().padStart(2, "0")}`;
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); off(); };
  }, [theme]);
  return <div className="vj-stage">
    <canvas ref={ref} className="vj-canvas" role="img" aria-label="Audio-reactive visual" />
    {hud && <div ref={hudRef} className="vj-hud" aria-hidden />}
  </div>;
}
