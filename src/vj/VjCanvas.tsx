import { useEffect, useRef } from "react";
import { VjEngine } from "./engine";
import { vjListen, vjSend, vjVisualState } from "./bus";
import { GlScene } from "./gl/renderer";
import { cleanOpts } from "./gl/options";

// Resolve a CSS colour to a packed little-endian RGBA word for ImageData.
function packed(css: string) {
  const c = document.createElement("canvas").getContext("2d"); if (!c) return 0; c.fillStyle = css; c.fillRect(0, 0, 1, 1);
  const [r, g, b] = c.getImageData(0, 0, 1, 1).data; return (255 << 24 | b << 16 | g << 8 | r) >>> 0;
}

export default function VjCanvas({ theme, hud = true }: { theme: string; hud?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null), glRef = useRef<HTMLCanvasElement>(null), hudRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VjEngine | null>(null);
  useEffect(() => {
    const cv = ref.current, eng = engineRef.current;
    if (!cv || !eng) return;
    const cs = getComputedStyle(cv);
    { const f = `hsl(${cs.getPropertyValue("--foreground")})`, b = `hsl(${cs.getPropertyValue("--background")})`; colours.current = { fg: packed(f), bg: packed(b), f, b }; }
    eng.theme = theme;
  }, [theme]);
  const colours = useRef({ fg: 0, bg: 0, f: "#fff", b: "#000" });
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const eng = new VjEngine();
    const initial = vjVisualState(); eng.model = initial.model; eng.size = initial.size; eng.color = initial.color; eng.code = initial.code; eng.opts = cleanOpts(initial.opts);
    engineRef.current = eng;
    const glScene = glRef.current ? new GlScene(glRef.current) : undefined; eng.gl = glScene;
    const clearFrames = () => eng.clearPerformance();
    const off = vjListen(m => {
      if (m.t === "hit") eng.hit(m.kind, m.vel, m.pad);
      else if (m.t === "level") eng.level += (m.v - eng.level) * 0.5;
      else if (m.t === "signal") { if (m.perf) eng.setPerformance(m.perf); eng.signal(m.wave, m.beat, m.bpm, m.running, m.peak, m.rms, m.step, m.bank); }
      else if (m.t === "perf") eng.setPerformance(m.params);
      else if (m.t === "doc") eng.setDoc(m.pads, m.bpm, m.bank);
      else if (m.t === "ctl") { const before = eng.model; eng.ctl(m.model, m.size); if (eng.model !== before) clearFrames(); }
      else if (m.t === "color") eng.color = m.enabled;
      else if (m.t === "opt") { eng.opts = cleanOpts(vjVisualState().opts); }
      else if (m.t === "code") eng.code = m.enabled;
      else if (m.t === "visual") { const before = eng.model; eng.model = m.state.model; eng.size = m.state.size; eng.color = m.state.color; eng.code = !!m.state.code; eng.opts = cleanOpts(m.state.opts); if (before !== eng.model) clearFrames(); }
    });
    vjSend({ t: "hello" });
    clearFrames();
    document.addEventListener("visibilitychange", clearFrames);
    // ←/→ switch model, ↑/↓ resize it; broadcast so the TV window and the overlay stay in step.
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
      if (e.key.toLowerCase() === "c" && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); e.stopPropagation(); vjSend({ t: "color", enabled: !vjVisualState().color }); return; }
      if (e.key.toLowerCase() === "k" && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); e.stopPropagation(); vjSend({ t: "code", enabled: !vjVisualState().code }); return; }
      const dm = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0, ds = e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0;
      if (!dm && !ds) return; e.preventDefault(); e.stopPropagation(); vjSend({ t: "ctl", model: dm, size: ds });
    };
    window.addEventListener("keydown", key, true);
    const cs = getComputedStyle(cv);
    { const f = `hsl(${cs.getPropertyValue("--foreground")})`, b = `hsl(${cs.getPropertyValue("--background")})`; colours.current = { fg: packed(f), bg: packed(b), f, b }; }
    eng.theme = cv.closest("[data-lcd]")?.getAttribute("data-lcd") ?? "oled";
    let raf = 0, prev = performance.now(), n = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      eng.frame(cv, colours.current.fg, colours.current.bg, (now - prev) / 1000, colours.current.f, colours.current.b); prev = now;
      if (++n % 6 === 0) {
        if (hudRef.current) { hudRef.current.hidden = true; hudRef.current.textContent = `NAD_VJ // ${eng.shapeName()} // ${eng.t < eng.hudUntil ? eng.hudMsg : eng.last || "IDLE"} // LVL ${Math.round(eng.level * 99).toString().padStart(2, "0")}`; }
        cv.dataset.backdrop = eng.shapeName(); cv.dataset.opts = JSON.stringify(eng.opts); cv.dataset.glError = eng.gl?.error ?? "none"; cv.dataset.color = String(eng.color); cv.dataset.running = String(eng.running); cv.dataset.step = String(eng.step); cv.dataset.pads = String(eng.pads.length);
        cv.dataset.perfMode = String(eng.perf.mode); cv.dataset.echoSend = String(eng.perf.echoSend ?? 0); cv.dataset.feedbackFrames = String(eng.performanceFrames.frames); cv.dataset.feedbackBytes = String(eng.performanceFrames.bytes);
        cv.setAttribute("aria-label", `${eng.code ? "NAD code overlay" : "Visual"}, ${eng.pads.length} pads, bank ${eng.bank}, step ${eng.step + 1}, ${eng.running ? "PLAY" : "STOP"}, over ${eng.shapeName()} backdrop, colour ${eng.color ? "on" : "off"}`);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); off(); eng.clearPerformance(); glScene?.dispose(); engineRef.current = null; document.removeEventListener("visibilitychange", clearFrames); window.removeEventListener("keydown", key, true); };
  }, []);
  return <div className="vj-stage">
    <canvas ref={glRef} className="vj-canvas vj-gl" aria-hidden />
    <canvas ref={ref} className="vj-canvas vj-top" role="img" aria-label="Audio-reactive visual" />
    {hud && <div ref={hudRef} className="vj-hud" aria-hidden hidden />}
  </div>;
}
