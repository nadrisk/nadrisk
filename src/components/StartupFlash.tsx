import { useEffect, useRef, useState } from "react";
import logoUrl from "@/assets/nadrisk-logo.png";

const W = 128, H = 64;

/** Quick boot: black, 1-bit logo flashes in the theme colour, fade out. Tap skips. */
export default function StartupFlash({ onDone }: { onDone: () => void }) {
  const [op, setOp] = useState(1);
  const cv = useRef<HTMLCanvasElement>(null), done = useRef(onDone); done.current = onDone;
  useEffect(() => {
    const c = cv.current, ctx = c?.getContext("2d"); if (!c || !ctx) return;
    const fg = getComputedStyle(c).color || "hsl(0 0% 100%)";
    const ts: ReturnType<typeof setTimeout>[] = [];
    const img = new Image();
    img.onload = () => {
      const o = document.createElement("canvas"); o.width = W; o.height = H; const oc = o.getContext("2d")!;
      const sc = Math.min((H - 8) / img.height, (W - 8) / img.width), w = img.width * sc, h = img.height * sc;
      oc.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      const d = oc.getImageData(0, 0, W, H).data;
      const draw = (on: boolean) => { ctx.clearRect(0, 0, W, H); if (!on) return; ctx.fillStyle = fg;
        for (let i = 0; i < W * H; i++) if (d[i * 4 + 3] > 100 && d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] > 240) ctx.fillRect(i % W, (i / W) | 0, 1, 1); };
      [[150, true], [260, false], [330, true], [440, false], [500, true]].forEach(([t, on]) => ts.push(setTimeout(() => draw(on as boolean), t as number)));
    };
    img.src = logoUrl;
    [.75, .5, .25, 0].forEach((v, k) => ts.push(setTimeout(() => setOp(v), 1150 + k * 90)));
    ts.push(setTimeout(() => done.current(), 1550));
    return () => ts.forEach(clearTimeout);
  }, []);
  return <div className="startup-flash" style={{ opacity: op }} onPointerDown={() => done.current()} aria-hidden><canvas ref={cv} width={W} height={H} /></div>;
}
