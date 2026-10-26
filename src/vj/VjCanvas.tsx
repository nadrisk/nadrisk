import { useEffect, useRef, useState } from "react";
import { VjEngine } from "./engine";
import { vjListen, vjSend } from "./bus";
import { MODELS } from "./models";
import { VjCamera, type CameraStatus } from "./camera";
import { Button } from "@/components/ui/button";
import { noteName } from "./raster";

// Resolve a CSS colour to a packed little-endian RGBA word for ImageData.
function packed(css: string) {
  const c = document.createElement("canvas").getContext("2d"); if (!c) return 0; c.fillStyle = css; c.fillRect(0, 0, 1, 1);
  const [r, g, b] = c.getImageData(0, 0, 1, 1).data; return (255 << 24 | b << 16 | g << 8 | r) >>> 0;
}

export default function VjCanvas({ theme, hud = true }: { theme: string; hud?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null), hudRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VjEngine | null>(null), cameraRef = useRef<VjCamera | null>(null);
  const [cameraState, setCameraState] = useState<CameraStatus>("off");
  useEffect(() => {
    const cv = ref.current, eng = engineRef.current;
    if (!cv || !eng) return;
    const cs = getComputedStyle(cv);
    colours.current = { fg: packed(`hsl(${cs.getPropertyValue("--foreground")})`), bg: packed(`hsl(${cs.getPropertyValue("--background")})`) };
    eng.theme = theme;
  }, [theme]);
  const colours = useRef({ fg: 0, bg: 0 });
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const eng = new VjEngine();
    engineRef.current = eng;
    const camera = new VjCamera(setCameraState); cameraRef.current = camera; eng.camera = camera;
    const syncCamera = () => {
      if (MODELS[eng.model] === "CAM" && !document.hidden) void camera.start();
      else if (camera.status !== "off") camera.stop();
    };
    const off = vjListen(m => {
      if (m.t === "hit") eng.hit(m.kind, m.vel, m.pad);
      else if (m.t === "level") eng.level += (m.v - eng.level) * 0.5;
      else if (m.t === "signal") eng.signal(m.wave, m.beat, m.bpm, m.running, m.peak, m.rms, m.step, m.bank);
      else if (m.t === "ctl") { const before = eng.model; eng.ctl(m.model, m.size); if (eng.model !== before) syncCamera(); }
    });
    document.addEventListener("visibilitychange", syncCamera);
    // ←/→ switch model, ↑/↓ resize it; broadcast so the TV window and the overlay stay in step.
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
      const dm = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0, ds = e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0;
      if (!dm && !ds) return; e.preventDefault(); e.stopPropagation(); vjSend({ t: "ctl", model: dm, size: ds });
    };
    window.addEventListener("keydown", key, true);
    const cs = getComputedStyle(cv);
    colours.current = { fg: packed(`hsl(${cs.getPropertyValue("--foreground")})`), bg: packed(`hsl(${cs.getPropertyValue("--background")})`) };
    eng.theme = cv.closest("[data-lcd]")?.getAttribute("data-lcd") ?? "oled";
    let raf = 0, prev = performance.now(), n = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      eng.frame(cv, colours.current.fg, colours.current.bg, (now - prev) / 1000); prev = now;
      if (++n % 6 === 0) {
        const cam = MODELS[eng.model] === "CAM";
        if (hudRef.current) { hudRef.current.hidden = cam; hudRef.current.textContent = `NAD_VJ // ${eng.shapeName()} // ${eng.t < eng.hudUntil ? eng.hudMsg : eng.last || "IDLE"} // LVL ${Math.round(eng.level * 99).toString().padStart(2, "0")}`; }
        cv.setAttribute("aria-label", cam ? `CAM ${camera.status}: ${eng.pad ? `PAD ${eng.pad.index + 1} ${eng.pad.name}, notes ${eng.pad.notes.map(noteName).join(" ")}` : "no pad"}, ${eng.bpm} BPM, ${eng.running ? "PLAY" : "STOP"}, step ${eng.step + 1}, peak ${eng.peak.toFixed(3)}, RMS ${eng.rms.toFixed(3)}` : `Audio-reactive visual ${eng.shapeName()}`);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); off(); camera.stop(); engineRef.current = null; cameraRef.current = null; document.removeEventListener("visibilitychange", syncCamera); window.removeEventListener("keydown", key, true); };
  }, []);
  return <div className="vj-stage">
    <canvas ref={ref} className="vj-canvas" role="img" aria-label="Audio-reactive visual" />
    {hud && <div ref={hudRef} className="vj-hud" aria-hidden />}
    {["denied", "missing", "unavailable"].includes(cameraState) && <div className="vj-camera-error" role="status" onClick={e => e.stopPropagation()}>
      <span>{cameraState === "denied" ? "Allow camera access in your browser, then retry." : cameraState === "missing" ? "Connect a camera, then retry." : "Camera unavailable. Close other camera apps, then retry."}</span>
      <Button variant="outline" size="sm" className="gb-cycle" onClick={() => void cameraRef.current?.start()}>RETRY CAMERA</Button>
    </div>}
  </div>;
}
