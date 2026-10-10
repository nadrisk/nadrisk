import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Px } from "./draw";

export const W = 128, H = 64;

// Fixed 128x64 display scaled by a whole number (nearest neighbour), so every pixel is identical on any device.
export default function PixelScreen({ draw, deps, children, label }: { draw: (p: Px) => void; deps: unknown[]; children?: ReactNode; label: string }) {
  const wrap = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(3);
  useLayoutEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.max(2, Math.min(4, Math.floor(el.clientWidth / W)))));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const c = cv.current, ctx = c?.getContext("2d"); if (!c || !ctx) return;
    ctx.imageSmoothingEnabled = false;
    const cs = getComputedStyle(c), fg = `hsl(${cs.getPropertyValue("--foreground")})`, bg = `hsl(${cs.getPropertyValue("--background")})`;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    draw(new Px(ctx, fg, bg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return <div ref={wrap} className="px-wrap">
    <div className="px-screen" style={{ width: W * scale, height: H * scale }}>
      <canvas ref={cv} width={W} height={H} role="img" aria-label={label} style={{ width: W * scale, height: H * scale }} />
      {children}
    </div>
  </div>;
}

const pos = (x: number, y: number, w: number, h: number) => ({ left: `${x / W * 100}%`, top: `${y / H * 100}%`, width: `${w / W * 100}%`, height: `${h / H * 100}%` });

// Invisible knob/fader hit-zone. Keeps the aria-label so MIDI learn, keys and double-click reset still work.
export function Zone({ x, y, w, h, label, value, min, max, step = 1, onChange, horizontal }: { x: number; y: number; w: number; h: number; label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; horizontal?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const st = useRef({ value, onChange, def: value, p: 0, v: 0 });
  st.current.value = value; st.current.onChange = onChange;
  const set = (v: number) => { const c = Math.min(max, Math.max(min, v)); const n = +(Math.round((c - min) / step) * step + min).toFixed(6); if (n !== st.current.value) st.current.onChange(n); };
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const m = (e: Event) => set(min + (e as CustomEvent<number>).detail * (max - min));
    el.addEventListener("midivalue", m); return () => el.removeEventListener("midivalue", m);
  });
  return <div ref={ref} className="px-zone" style={pos(x, y, w, h)} role="slider" tabIndex={0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} data-midi-value=""
    onPointerDown={e => {
      if (!e.isTrusted) return; e.currentTarget.setPointerCapture(e.pointerId); st.current.v = value;
      if (horizontal) { const r = e.currentTarget.getBoundingClientRect(); set(min + (e.clientX - r.left) / r.width * (max - min)); } else st.current.p = e.clientY;
    }}
    onPointerMove={e => {
      if (!e.buttons || !e.isTrusted) return;
      if (horizontal) { const r = e.currentTarget.getBoundingClientRect(); set(min + (e.clientX - r.left) / r.width * (max - min)); }
      else set(st.current.v + (st.current.p - e.clientY) / (e.shiftKey ? 600 : 150) * (max - min));
    }}
    onDoubleClick={e => { if (e.isTrusted) set(st.current.def); }}
    onKeyDown={e => { const k = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -1 : 0; if (k) { e.preventDefault(); set(value + k * step); } }} />;
}

export function Tap({ x, y, w, h, label, pressed, onClick, disabled }: { x: number; y: number; w: number; h: number; label: string; pressed?: boolean; onClick: () => void; disabled?: boolean }) {
  return <button className="px-zone" style={pos(x, y, w, h)} aria-label={label} aria-pressed={pressed} disabled={disabled} onClick={onClick} />;
}
