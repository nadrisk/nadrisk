import { useEffect, useRef, useState } from "react";
import { Px } from "@/pixel/draw";
import { textWidth } from "@/pixel/font";
import logoUrl from "@/assets/nadrisk-logo.png";

const W = 128, H = 64, WORD = "NADRISK";

/** Stepped fade to black (old handheld style), glitching NADRISK, then a stepped fade back. Never takes taps. */
export default function MalfunctionOverlay({ onBlack, onDone, root }: { onBlack: () => void; onDone: () => void; root: HTMLElement | null }) {
  const [op, setOp] = useState(0), [word, setWord] = useState(false), [logo, setLogo] = useState(false);
  const cv = useRef<HTMLCanvasElement>(null), cb = useRef({ onBlack, onDone }); cb.current = { onBlack, onDone };
  useEffect(() => {
    const ts: ReturnType<typeof setTimeout>[] = [], at = (ms: number, f: () => void) => ts.push(setTimeout(f, ms));
    root?.classList.add("nad-shake");
    [.25, .5, .75, 1].forEach((v, k) => at(120 + k * 140, () => setOp(v)));
    at(720, () => { root?.classList.remove("nad-shake"); setWord(true); cb.current.onBlack(); });
    at(2200, () => { setWord(false); setLogo(true); });
    at(2850, () => setLogo(false));
    [.75, .5, .25, 0].forEach((v, k) => at(2900 + k * 140, () => setOp(v)));
    at(3500, () => cb.current.onDone());
    return () => { ts.forEach(clearTimeout); root?.classList.remove("nad-shake"); };
  }, [root]);
  useEffect(() => {
    if (!word) return;
    const c = cv.current, ctx = c?.getContext("2d"); if (!c || !ctx) return;
    const fg = "hsl(92 100% 55%)", bg = "hsl(0 0% 0%)", s = 2, x0 = Math.round((W - textWidth(WORD) * s) / 2), y0 = 25;
    const id = setInterval(() => {
      const p = new Px(ctx, fg, bg); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      [...WORD].forEach((ch, i) => { if (Math.random() < .08) return; p.text(Math.random() < .1 ? "#" : ch, x0 + i * 8 + (Math.random() < .15 ? 2 : 0), y0 + (Math.random() < .1 ? 1 : 0), true, s); });
      // Torn rows: copy a band sideways.
      for (let k = 0; k < 3; k++) if (Math.random() < .6) { const y = y0 + Math.floor(Math.random() * 10), h = 1 + Math.floor(Math.random() * 3); const d = ctx.getImageData(0, y, W, h); ctx.putImageData(d, Math.round((Math.random() - .5) * 14), y); }
      if (Math.random() < .3) p.rect(0, Math.floor(Math.random() * H), W, 1);
    }, 70);
    return () => clearInterval(id);
  }, [word]);
  // Logo flash: the artist mark thresholded to 1-bit acid green, with flicker and torn rows.
  useEffect(() => {
    if (!logo) return;
    const c = cv.current, ctx = c?.getContext("2d"); if (!c || !ctx) return;
    let mask: Uint8Array | null = null, id = 0; const img = new Image();
    img.onload = () => { const o = document.createElement("canvas"); o.width = W; o.height = H; const oc = o.getContext("2d")!; const sc = Math.min((H - 8) / img.height, (W - 8) / img.width), w = img.width * sc, h = img.height * sc;
      oc.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); const d = oc.getImageData(0, 0, W, H).data; mask = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) mask[i] = d[i * 4 + 3] > 100 && d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] > 240 ? 1 : 0; };
    img.src = logoUrl;
    id = window.setInterval(() => { ctx.fillStyle = "hsl(0 0% 0%)"; ctx.fillRect(0, 0, W, H); if (!mask || Math.random() < .15) return; ctx.fillStyle = "hsl(92 100% 55%)";
      for (let y = 0; y < H; y++) { const sh = Math.random() < .06 ? Math.round((Math.random() - .5) * 12) : 0; for (let x = 0; x < W; x++) if (mask[y * W + x]) ctx.fillRect(x + sh, y, 1, 1); } }, 60);
    return () => clearInterval(id);
  }, [logo]);
  return <div className="nad-overlay" aria-hidden style={{ opacity: op }}>{(word || logo) && <canvas ref={cv} width={W} height={H} />}</div>;
}
