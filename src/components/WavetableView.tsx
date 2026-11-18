import { useEffect, useRef } from "react";
import { framePair, type WtTable } from "@/audio/wavetable";
import { waveMix } from "@/audio/clean";
import { colors, pos } from "@/pixel/PixelScreen";

/** Serum/Vital-style wavetable view: smooth anti-aliased 3D stack inside a cage, drawn at device resolution over the pixel screen (coords in 128x64 screen units). */
export default function WavetableView({ x, y, w, h, table, wave, basic }: { x: number; y: number; w: number; h: number; table: WtTable; wave: number; basic: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = cv.current; if (!el) return;
    const paint = () => {
      const r = el.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, W = r.width, H = r.height; if (!W || !H) return;
      el.width = Math.round(W * dpr); el.height = Math.round(H * dpr);
      const g = el.getContext("2d")!; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      const { fg, bg } = colors(el), n = table.view.length, pts = table.view[0]?.length ?? 0; if (!pts) return;
      const p = Math.max(0, Math.min(1, wave / 3));
      // Geometry: front slice bottom-left, back slice up-right, mild foreshortening; all inside the box with a margin.
      const m = 2, DX = W * .22, DY = H * .34, FW = W - DX - m * 2, A0 = (H - DY - m * 2) * .48, base = H - m - 1;
      const geo = (d: number) => { const s = 1 - d * .18; return { x0: m + d * DX, wd: FW * s, by: base - d * DY - A0 * s, amp: A0 * s }; };
      const path = (vals: ArrayLike<number>, d: number) => { const q = geo(d); g.beginPath();
        for (let i = 0; i < pts; i++) { const px = q.x0 + i / (pts - 1) * q.wd, py = q.by - Math.max(-1, Math.min(1, vals[i])) * q.amp; i ? g.lineTo(px, py) : g.moveTo(px, py); } return q; };
      g.lineJoin = "round"; g.lineCap = "round";
      // Cage: floor rails and back frame.
      g.strokeStyle = fg; g.globalAlpha = .22; g.lineWidth = .75;
      const f = geo(0), b = geo(1);
      g.beginPath(); g.moveTo(f.x0, f.by + f.amp); g.lineTo(b.x0, b.by + b.amp); g.lineTo(b.x0 + b.wd, b.by + b.amp); g.lineTo(f.x0 + f.wd, f.by + f.amp); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(b.x0, b.by - b.amp); g.lineTo(b.x0, b.by + b.amp); g.moveTo(b.x0 + b.wd, b.by - b.amp); g.lineTo(b.x0 + b.wd, b.by + b.amp); g.stroke();
      g.globalAlpha = 1;
      // Current (interpolated) wave.
      let cur: number[];
      if (basic) { const mix = waveMix(wave); cur = Array.from({ length: pts }, (_, i) => mix.reduce((a, wk, k) => a + wk * (table.view[k]?.[i] ?? 0), 0)); }
      else { const fp = framePair(p, n); cur = Array.from({ length: pts }, (_, i) => fp.weights[0] * table.view[fp.frames[0]][i] + fp.weights[1] * table.view[fp.frames[1]][i]); }
      const shown = Math.min(n, basic ? 4 : 20), ks = Array.from({ length: shown }, (_, s) => shown === 1 ? 0 : Math.round(s * (n - 1) / (shown - 1)));
      const dOf = (k: number) => n > 1 ? k / (n - 1) : 0;
      const slice = (vals: ArrayLike<number>, d: number, active: boolean) => {
        // Occlude farther slices with a background fill down to the floor.
        const q = path(vals, d); g.lineTo(q.x0 + q.wd, q.by + q.amp + 1); g.lineTo(q.x0, q.by + q.amp + 1); g.closePath();
        g.globalAlpha = 1; g.fillStyle = bg; g.fill();
        if (active) { const gr = g.createLinearGradient(0, q.by - q.amp, 0, q.by + q.amp); gr.addColorStop(0, fg); gr.addColorStop(1, "transparent");
          g.globalAlpha = .28; g.fillStyle = gr; g.fill(); }
        path(vals, d); g.strokeStyle = fg; g.globalAlpha = active ? 1 : .2 + .5 * (1 - d); g.lineWidth = active ? 1.8 : .8; g.stroke();
      };
      let drawn = false;
      for (let s = ks.length - 1; s >= 0; s--) { const d = dOf(ks[s]); if (!drawn && p >= d - 1e-6 && n > 1) { slice(cur, p, true); drawn = true; } slice(table.view[ks[s]], d, false); }
      if (!drawn) slice(cur, n > 1 ? p : 0, true);
      // Position marker on the right floor rail.
      const q = geo(n > 1 ? p : 0); g.globalAlpha = 1; g.fillStyle = fg; g.beginPath(); g.arc(q.x0 + q.wd + 2, q.by + q.amp, 1.6, 0, Math.PI * 2); g.fill();
    };
    paint();
    const ro = new ResizeObserver(paint); ro.observe(el); return () => ro.disconnect();
  }, [table, wave, basic]);
  return <div aria-hidden className="pointer-events-none absolute" style={pos(x, y, w, h)}><canvas ref={cv} style={{ display: "block", width: "100%", height: "100%", imageRendering: "auto" }} /></div>;
}
