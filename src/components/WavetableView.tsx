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
      // Elevated three-quarter isometric camera: phase runs right/slightly down, depth recedes up-right, amplitude is vertical.
      // Project in unit space, then fit the whole cage to ~80% width x ~67% height and centre it in the frame.
      const PX = [1, .3], DX = [.62, -.42], AV = .26;
      const raw = (u: number, d: number, v: number) => [u * PX[0] + d * DX[0], u * PX[1] + d * DX[1] - v * AV] as const;
      const corners = [0, 1].flatMap(u => [0, 1].flatMap(d => [-1, 1].map(v => raw(u, d, v))));
      const minX = Math.min(...corners.map(c => c[0])), maxX = Math.max(...corners.map(c => c[0])), minY = Math.min(...corners.map(c => c[1])), maxY = Math.max(...corners.map(c => c[1]));
      const sx = W * .8 / (maxX - minX), sy = H * .67 / (maxY - minY), ox = W * .1 - minX * sx, oy = H * .165 - minY * sy;
      const P = (u: number, d: number, v: number) => { const [rx, ry] = raw(u, d, v); return [ox + rx * sx, oy + ry * sy] as const; };
      const ptsOf = (vals: ArrayLike<number>, d: number) => Array.from({ length: pts }, (_, i) => P(i / (pts - 1), d, Math.max(-1, Math.min(1, vals[i])) * .95));
      const stroke = (pp: ReadonlyArray<readonly [number, number]>) => { g.beginPath(); pp.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke(); };
      const poly = (pp: ReadonlyArray<readonly [number, number]>) => { g.beginPath(); pp.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath(); };
      g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = fg; g.fillStyle = fg;
      // Cage: floor plate (at -1), back wall edges and front-right post.
      g.globalAlpha = .07; poly([P(0, 0, -1), P(1, 0, -1), P(1, 1, -1), P(0, 1, -1)]); g.fill();
      g.globalAlpha = .3; g.lineWidth = .75; poly([P(0, 0, -1), P(1, 0, -1), P(1, 1, -1), P(0, 1, -1)]); g.stroke();
      g.globalAlpha = .18; stroke([P(0, 1, -1), P(0, 1, 1), P(1, 1, 1), P(1, 1, -1)]); stroke([P(1, 0, -1), P(1, 0, 1)]);
      // Current (interpolated) wave.
      let cur: number[];
      if (basic) { const mix = waveMix(wave); cur = Array.from({ length: pts }, (_, i) => mix.reduce((a, wk, k) => a + wk * (table.view[k]?.[i] ?? 0), 0)); }
      else { const fp = framePair(p, n); cur = Array.from({ length: pts }, (_, i) => fp.weights[0] * table.view[fp.frames[0]][i] + fp.weights[1] * table.view[fp.frames[1]][i]); }
      const shown = Math.min(n, basic ? 4 : 24), ks = Array.from({ length: shown }, (_, s) => shown === 1 ? 0 : Math.round(s * (n - 1) / (shown - 1)));
      const dOf = (k: number) => n > 1 ? k / (n - 1) : 0;
      // Transparent mesh, back to front, plus front-to-back ribs (nothing occludes).
      const rows = ks.map(k => ptsOf(table.view[k], dOf(k)));
      g.lineWidth = .7;
      for (let r = rows.length - 1; r >= 0; r--) { g.globalAlpha = .2 + .25 * (1 - dOf(ks[r])); stroke(rows[r]); }
      if (rows.length > 1) { g.globalAlpha = .13; for (let i = 0; i < pts; i += 4) stroke(rows.map(row => row[i])); }
      // Active wave on top: translucent curtain to the floor + bold outlined line, readable at any depth.
      const dA = n > 1 ? p : 0, act = ptsOf(cur, dA);
      poly([...act, P(1, dA, -1), P(0, dA, -1)]); g.globalAlpha = .2; g.fill();
      g.globalAlpha = .6; g.lineWidth = .75; stroke([P(0, dA, -1), P(1, dA, -1)]);
      g.globalAlpha = 1; g.lineWidth = 2.6; g.strokeStyle = bg; stroke(act); g.strokeStyle = fg; g.lineWidth = 1.5; stroke(act);
      // Position marker on the right floor rail.
      const [mx, my] = P(1, dA, -1); g.beginPath(); g.arc(mx, my, 1.4, 0, Math.PI * 2); g.fill();
    };
    paint();
    const ro = new ResizeObserver(paint); ro.observe(el); return () => ro.disconnect();
  }, [table, wave, basic]);
  return <div aria-hidden className="pointer-events-none absolute overflow-hidden" style={pos(x, y, w, h)}><canvas ref={cv} style={{ display: "block", width: "100%", height: "100%", imageRendering: "auto" }} /></div>;
}
