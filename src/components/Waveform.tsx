import { useEffect, useRef } from "react";
import type { Analyser } from "tone";
import { gatedLoop } from "@/lib/frameGate";

export default function Waveform({ analyser, playing, eco = false, theme }: { analyser: Analyser | null; playing: boolean; eco?: boolean; theme: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const context = element.getContext("2d");
    if (!context) return;
    const colors = getComputedStyle(element);
    const line = colors.getPropertyValue("--scope-line").trim();
    const grid = colors.getPropertyValue("--scope-grid").trim();
    let last = 0;
    const draw = (now = 0) => {
      if (now - last < (eco ? 66 : 16)) return;
      last = now;
      const width = element.clientWidth, height = element.clientHeight;
      if (width < 2 || height < 2) return; // hidden: zero-size grid steps would never advance
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      if (element.width !== Math.round(width * ratio) || element.height !== Math.round(height * ratio)) { element.width = Math.round(width * ratio); element.height = Math.round(height * ratio); }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.strokeStyle = grid; context.lineWidth = 1;
      for (let x = 0; x <= width; x += width / 8) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
      for (let y = 0; y <= height; y += height / 4) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
      context.strokeStyle = line; context.lineWidth = 1.5; context.beginPath();
      const values = playing && analyser ? analyser.getValue() as Float32Array : null;
      for (let x = 0; x < width; x++) {
        const value = values ? Number(values[Math.floor(x / width * values.length)]) || 0 : 0;
        const y = height / 2 - value * height * 1.35;
        if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.stroke();
    };
    return gatedLoop(element, draw);
  }, [analyser, playing, eco, theme]);
  return <canvas ref={canvas} className="scope-canvas" aria-label={playing ? "Live audio waveform" : "Audio waveform idle"} role="img" />;
}