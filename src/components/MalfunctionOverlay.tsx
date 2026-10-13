import { useEffect, useRef, useState } from "react";
import { Px } from "@/pixel/draw";
import { textWidth } from "@/pixel/font";

const W = 128, H = 64, WORD = "NADRISK";

/** Stepped fade to black (old handheld style), glitching NADRISK, then a stepped fade back. Never takes taps. */
export default function MalfunctionOverlay({ onBlack, onDone, root }: { onBlack: () => void; onDone: () => void; root: HTMLElement | null }) {
  const [op, setOp] = useState(0), [word, setWord] = useState(false);
  const cv = useRef<HTMLCanvasElement>(null), cb = useRef({ onBlack, onDone }); cb.current = { onBlack, onDone };
  useEffect(() => {
    const ts: ReturnType<typeof setTimeout>[] = [], at = (ms: number, f: () => void) => ts.push(setTimeout(f, ms));
    root?.classList.add("nad-shake");
    [.25, .5, .75, 1].forEach((v, k) => at(120 + k * 140, () => setOp(v)));
    at(720, () => { root?.classList.remove("nad-shake"); setWord(true); cb.current.onBlack(); });
    at(2800, () => setWord(false));
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
  return <div className="nad-overlay" aria-hidden style={{ opacity: op }}>{word && <canvas ref={cv} width={W} height={H} />}</div>;
}
