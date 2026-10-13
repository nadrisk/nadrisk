import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Px } from "./draw";
import { gatedLoop } from "@/lib/frameGate";
import { ResetScope } from "@/components/ui/slider";

export const W = 128, H = 64;
export const DisplayThemeContext = createContext("oled");

// Fixed 128x64 display scaled by a whole number (nearest neighbour), so every pixel is identical on any device.
export default function PixelScreen({ draw, deps, children, label, live }: { draw: (p: Px) => void; deps: unknown[]; children?: ReactNode; label: string; live?: () => boolean }) {
  const wrap = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null);
  const latest = useRef({ draw, live }); latest.current = { draw, live };
  const theme = useContext(DisplayThemeContext);
  const [scale, setScale] = useState(3);
  useLayoutEffect(() => {
    const el = wrap.current; if (!el) return;
    // On laptop/desktop windows a screen filling its panel becomes huge and clunky;
    // cap the whole-number scale there so modules stay hardware-sized. Phones keep the full range.
    // Desktop locks to a fixed scale; phones measure only on window resize/rotation.
    // No ResizeObserver: the screen's own size feeds its parent's width, which looped WebKit reflows.
    const measure = () => {
      const next = window.innerWidth >= 1024 && window.matchMedia("(pointer: fine)").matches ? 3
        : Math.max(2, Math.min(8, Math.floor(el.clientWidth / W)));
      setScale(s => s === next ? s : next);
    };
    measure();
    let t: ReturnType<typeof setTimeout> | 0 = 0;
    const onResize = () => { if (t) clearTimeout(t); t = setTimeout(measure, 120); };
    window.addEventListener("resize", onResize);
    return () => { if (t) clearTimeout(t); window.removeEventListener("resize", onResize); };
  }, []);
  useEffect(() => {
    const c = cv.current, ctx = c?.getContext("2d"); if (!c || !ctx) return;
    ctx.imageSmoothingEnabled = false;
    const cs = getComputedStyle(c), fg = `hsl(${cs.getPropertyValue("--foreground")})`, bg = `hsl(${cs.getPropertyValue("--background")})`;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    draw(new Px(ctx, fg, bg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, ...deps]);
  const hasLive = Boolean(live);
  useEffect(() => {
    if (!hasLive) return;
    const c = cv.current, ctx = c?.getContext("2d"); if (!c || !ctx) return;
    const cs=getComputedStyle(c), fg=`hsl(${cs.getPropertyValue("--foreground")})`, bg=`hsl(${cs.getPropertyValue("--background")})`;
    let last=0;
    return gatedLoop(c, now => {
      if (now-last<60) return; last=now;
      if (!latest.current.live?.()) return;
      ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
      latest.current.draw(new Px(ctx,fg,bg));
    });
  }, [hasLive, theme]);
  return <div ref={wrap} className="px-wrap">
    <div className="px-screen" style={{ width: W * scale, height: H * scale }}>
      <canvas ref={cv} width={W} height={H} role="img" aria-label={label} style={{ width: W * scale, height: H * scale }} />
      {children}
    </div>
  </div>;
}

const pos = (x: number, y: number, w: number, h: number) => ({ left: `${x / W * 100}%`, top: `${y / H * 100}%`, width: `${w / W * 100}%`, height: `${h / H * 100}%` });

export function XYZone({ x, y, w, h, label, onDrag }: { x: number; y: number; w: number; h: number; label: string; onDrag: (dx: number, dy: number) => void }) {
  const start = useRef({ x: 0, y: 0 });
  return <div className="px-zone" style={pos(x, y, w, h)} role="slider" tabIndex={0} aria-label={label}
    onPointerDown={e => { if (!e.isTrusted) return; e.currentTarget.setPointerCapture(e.pointerId); start.current = { x: e.clientX, y: e.clientY }; }}
    onPointerMove={e => { if (!e.buttons || !e.isTrusted) return; const r = e.currentTarget.getBoundingClientRect(); onDrag((e.clientX - start.current.x) / r.width, (e.clientY - start.current.y) / r.height); start.current = { x: e.clientX, y: e.clientY }; }} />;
}

export function BarDraw({ x, y, w, h, values, onChange }: { x: number; y: number; w: number; h: number; values: number[]; onChange: (values: number[]) => void }) {
  const last = useRef<number | null>(null);
  const paint = (el: HTMLElement, clientX: number, clientY: number) => {
    const r = el.getBoundingClientRect(), raw = (clientX - r.left) / r.width;
    const index = Math.max(0, Math.min(values.length - 1, Math.floor(raw * values.length)));
    const value = Math.max(0, Math.min(1, 1 - (clientY - r.top) / r.height));
    const next = [...values], from = last.current ?? index, lo = Math.min(from, index), hi = Math.max(from, index);
    const startValue = next[from] ?? value;
    for (let i = lo; i <= hi; i++) { const t = hi === lo ? 1 : Math.abs(i - from) / Math.abs(index - from); next[i] = +(startValue + (value - startValue) * t).toFixed(3); }
    last.current = index; onChange(next);
  };
  return <div className="px-zone" style={pos(x, y, w, h)} role="slider" tabIndex={0} aria-label="Draw additive harmonics" aria-valuemin={0} aria-valuemax={1}
    onPointerDown={e => { if (!e.isTrusted) return; e.currentTarget.setPointerCapture(e.pointerId); last.current = null; paint(e.currentTarget, e.clientX, e.clientY); }}
    onPointerMove={e => { if (!e.buttons || !e.isTrusted) return; paint(e.currentTarget, e.clientX, e.clientY); }}
    onPointerUp={() => { last.current = null; }} />;
}

const zoneHome = new Map<string, number>();
// Invisible knob/fader hit-zone. Keeps the aria-label so MIDI learn, keys and double-click reset still work.
export function Zone({ x, y, w, h, label, value, min, max, step = 1, onChange, horizontal, log, reset }: { x: number; y: number; w: number; h: number; label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; horizontal?: boolean; log?: boolean; reset?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  // Without an explicit home, the first value seen per scope+label survives page switches (zones remount per page).
  const key = `${useContext(ResetScope)}|${label}`; if (!zoneHome.has(key)) zoneHome.set(key, value);
  const st = useRef({ value, onChange, def: reset ?? zoneHome.get(key)!, p: 0, u: 0, fine: 1, hold: 0 as ReturnType<typeof setTimeout> | 0 });
  st.current.value = value; st.current.onChange = onChange; st.current.def = reset ?? zoneHome.get(key)!;
  // Log zones (filter cutoff) work in the same musical scale the curve is drawn in.
  const toU = (v: number) => log ? Math.log(Math.max(min, v) / min) / Math.log(max / min) : (v - min) / (max - min || 1);
  const fromU = (u: number) => { const c = Math.min(1, Math.max(0, u)); return log ? min * (max / min) ** c : min + c * (max - min); };
  const set = (v: number) => { const c = Math.min(max, Math.max(min, v)); const n = +(Math.round((c - min) / step) * step + min).toFixed(6); if (n !== st.current.value) st.current.onChange(n); };
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const m = (e: Event) => set(fromU((e as CustomEvent<number>).detail));
    el.addEventListener("midivalue", m); return () => el.removeEventListener("midivalue", m);
  });
  const end = () => { if (st.current.hold) clearTimeout(st.current.hold); st.current.hold = 0; };
  return <div ref={ref} className="px-zone" style={pos(x, y, w, h)} role="slider" tabIndex={0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} data-midi-value=""
    onPointerDown={e => {
      if (!e.isTrusted) return; e.currentTarget.setPointerCapture(e.pointerId); st.current.u = toU(value); st.current.fine = 1;
      // Relative drag: horizontal strips move at 1/3 of the finger; holding still for 0.5 s drops to 1/4 of that.
      st.current.p = horizontal ? e.clientX : e.clientY; end();
      if (horizontal && !log) { const r = e.currentTarget.getBoundingClientRect(); set(fromU((e.clientX - r.left) / r.width)); }
      if (horizontal && log) st.current.hold = setTimeout(() => { st.current.fine = .25; }, 500);
    }}
    onPointerMove={e => {
      if (!e.buttons || !e.isTrusted) return;
      if (horizontal && !log) { const r = e.currentTarget.getBoundingClientRect(); set(fromU((e.clientX - r.left) / r.width)); }
      else if (horizontal) { const r = e.currentTarget.getBoundingClientRect(), dx = e.clientX - st.current.p; if (Math.abs(dx) > 2) end(); st.current.p = e.clientX; st.current.u += dx / r.width / 3 * st.current.fine; set(fromU(st.current.u)); }
      else { st.current.u += (st.current.p - e.clientY) / (e.shiftKey ? 600 : 150); st.current.p = e.clientY; set(fromU(st.current.u)); }
    }}
    onPointerUp={end} onPointerCancel={end}
    onDoubleClick={e => { if (e.isTrusted) set(st.current.def); }}
    onKeyDown={e => { const k = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -1 : 0; if (k) { e.preventDefault(); set(value + k * step); } }} />;
}

export function Tap({ x, y, w, h, label, pressed, onClick, disabled }: { x: number; y: number; w: number; h: number; label: string; pressed?: boolean; onClick: () => void; disabled?: boolean }) {
  return <button className="px-zone" style={pos(x, y, w, h)} aria-label={label} aria-pressed={pressed} disabled={disabled} onClick={onClick} />;
}
