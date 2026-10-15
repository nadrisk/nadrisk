import { useEffect, useRef } from "react";

// Visual-only acid trip: a spinning, melting mandala drawn three times (R/G/B) with small offsets,
// screen-blended over the whole device. Low-res canvas at ~30 fps keeps it cheap; sound is untouched.
export default function AcidOverlay() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const slow = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.25 : 1;
    let raf = 0, last = 0, w = 0, h = 0;
    const size = () => { const s = 0.5; w = c.width = Math.ceil(innerWidth * s); h = c.height = Math.ceil(innerHeight * s); };
    size(); addEventListener("resize", size);
    const chans: [string, number, number][] = [["#ff2050", -1, 0], ["#20ff90", 1, 0.7], ["#3070ff", 0, 1.4]];
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 33) return; last = now;
      const t = now / 1000 * slow;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(0, 0, w, h); // trails = melting smear
      ctx.globalCompositeOperation = "lighter";
      const cx = w / 2, cy = h / 2, R = Math.hypot(w, h) * 0.55, petals = 12;
      ctx.lineWidth = Math.max(1, w / 400);
      for (const [col, dir, ph] of chans) {
        const ox = Math.sin(t * 1.3 + ph) * 4 * (dir || 1), oy = Math.cos(t * 0.9 + ph) * 3;
        ctx.strokeStyle = col;
        for (let ring = 1; ring <= 7; ring++) {
          const r0 = (ring / 7) * R, spin = t * 0.15 * (ring % 2 ? 1 : -1);
          ctx.beginPath();
          for (let i = 0; i <= 240; i++) {
            const a = (i / 240) * Math.PI * 2;
            const petal = Math.abs(Math.sin((a + spin) * petals / 2));
            const r = r0 * (0.72 + 0.28 * petal) + Math.sin(a * 3 + t * 1.7 + ring) * r0 * 0.04;
            const drip = Math.max(0, Math.sin(a)) * Math.sin(t * 0.6 + ring + a * 5) * r0 * 0.06; // melting down
            const x = cx + ox + Math.cos(a) * r, y = cy + oy + Math.sin(a) * r + drip;
            if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
        ctx.beginPath(); // spokes
        for (let k = 0; k < petals * 2; k++) {
          const a = (k / (petals * 2)) * Math.PI * 2 - t * 0.1;
          ctx.moveTo(cx + ox, cy + oy); ctx.lineTo(cx + ox + Math.cos(a) * R, cy + oy + Math.sin(a) * R);
        }
        ctx.globalAlpha = 0.35; ctx.stroke(); ctx.globalAlpha = 1;
      }
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", size); };
  }, []);
  return <canvas ref={ref} className="acid-overlay" aria-hidden="true" />;
}
