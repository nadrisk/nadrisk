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
      // Geometry: front slice bottom-left, back slice up-right; every slice's peaks and floor stay inside a fixed margin.
      const m = 3, DX = W * .24, DY = H * .36, A = Math.max(1, (H - m * 2 - DY) / 2 - 1), FW = W - m * 2 - DX - 3;
      const geo = (d: number) => { const s = 1 - d * .12, fl = H - m - d * DY; return { x0: m + d * DX, wd: FW * s, fl, by: fl - A, amp: A }; };
      const ptsOf = (vals: ArrayLike<number>, d: number) => { const q = geo(d); return Array.from({ length: pts }, (_, i) => [q.x0 + i / (pts - 1) * q.wd, q.by - Math.max(-1, Math.min(1, vals[i])) * q.amp * .96] as const); };
      const stroke = (pp: ReadonlyArray<readonly [number, number]>) => { g.beginPath(); pp.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke(); };
      g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = fg; g.fillStyle = fg;
      // Cage: floor and back posts.
      const f = geo(0), b = geo(1);
      g.globalAlpha = .25; g.lineWidth = .75;
      g.beginPath(); g.moveTo(f.x0, f.fl); g.lineTo(b.x0, b.fl); g.lineTo(b.x0 + b.wd, b.fl); g.lineTo(f.x0 + f.wd, f.fl); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(b.x0, b.fl); g.lineTo(b.x0, b.fl - 2 * A); g.moveTo(b.x0 + b.wd, b.fl); g.lineTo(b.x0 + b.wd, b.fl - 2 * A); g.stroke();
      // Current (interpolated) wave.
      let cur: number[];
      if (basic) { const mix = waveMix(wave); cur = Array.from({ length: pts }, (_, i) => mix.reduce((a, wk, k) => a + wk * (table.view[k]?.[i] ?? 0), 0)); }
      else { const fp = framePair(p, n); cur = Array.from({ length: pts }, (_, i) => fp.weights[0] * table.view[fp.frames[0]][i] + fp.weights[1] * table.view[fp.frames[1]][i]); }
      const shown = Math.min(n, basic ? 4 : 24), ks = Array.from({ length: shown }, (_, s) => shown === 1 ? 0 : Math.round(s * (n - 1) / (shown - 1)));
      const dOf = (k: number) => n > 1 ? k / (n - 1) : 0;
      // Transparent mesh: every slice visible (no occlusion), back to front, plus front-to-back ribs.
      const rows = ks.map(k => ptsOf(table.view[k], dOf(k)));
      g.lineWidth = .7;
      for (let r = rows.length - 1; r >= 0; r--) { g.globalAlpha = .22 + .2 * (1 - dOf(ks[r])); stroke(rows[r]); }
      if (rows.length > 1) { g.globalAlpha = .14; for (let i = 0; i < pts; i += 4) stroke(rows.map(row => row[i])); }
      // Active wave on top: curtain to its floor + bold line, so it reads through the mesh at any depth.
      const dA = n > 1 ? p : 0, act = ptsOf(cur, dA), qa = geo(dA);
      g.beginPath(); act.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.lineTo(qa.x0 + qa.wd, qa.by); g.lineTo(qa.x0, qa.by); g.closePath();
      g.globalAlpha = .22; g.fill();
      g.globalAlpha = 1; g.lineWidth = 2.6; g.strokeStyle = bg; stroke(act); g.strokeStyle = fg; g.lineWidth = 1.6; stroke(act);
      // Position marker on the right floor rail.
      g.beginPath(); g.arc(qa.x0 + qa.wd + 1.5, qa.fl, 1.4, 0, Math.PI * 2); g.fill();
    };
    paint();
    const ro = new ResizeObserver(paint); ro.observe(el); return () => ro.disconnect();
  }, [table, wave, basic]);
  return <div aria-hidden className="pointer-events-none absolute overflow-hidden" style={pos(x, y, w, h)}><canvas ref={cv} style={{ display: "block", width: "100%", height: "100%", imageRendering: "auto" }} /></div>;
}
