import { memo, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Columns3, Grid2x2, Plus, X } from "lucide-react";

// Audio-reactive monitors tapped off the master bus with native stereo analysers.
const VIS = {
  scope: "scope~", spectrum: "spectrum~", meter: "meter~ dB", imager: "imager~ L/R", waterfall: "spectro~", glitch: "hexdump~", bits: "bitfield~",
} as const;
type VisType = keyof typeof VIS;
type Taps = { l: AnalyserNode; r: AnalyserNode; td: Float32Array; td2: Float32Array; fd: Uint8Array };
const KEY = "nadrisk.vis.v1";

function useTaps(master: GainNode | null) {
  const [taps, setTaps] = useState<Taps | null>(null);
  useEffect(() => {
    if (!master) return;
    const ctx = master.context, split = ctx.createChannelSplitter(2);
    const l = ctx.createAnalyser(), r = ctx.createAnalyser();
    [l, r].forEach(a => { a.fftSize = 2048; a.smoothingTimeConstant = 0.75; });
    master.connect(split); split.connect(l, 0); split.connect(r, 1);
    setTaps({ l, r, td: new Float32Array(2048), td2: new Float32Array(2048), fd: new Uint8Array(1024) });
    return () => { try { master.disconnect(split); } catch { /* gone */ } split.disconnect(); setTaps(null); };
  }, [master]);
  return taps;
}

const hex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();

function Vis({ type, taps, eco }: { type: VisType; taps: Taps | null; eco: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current, c = el?.getContext("2d");
    if (!el || !c) return;
    const css = getComputedStyle(el);
    const A = css.getPropertyValue("--scope-line").trim() || "#5ee0b0", G = css.getPropertyValue("--scope-grid").trim() || "#222";
    const P = "hsl(275 70% 65%)", Y = "hsl(48 95% 60%)", R = "hsl(350 85% 60%)";
    let raf = 0, last = 0, pkL = 0, pkR = 0;
    const draw = (now = 0) => {
      raf = requestAnimationFrame(draw);
      if (now - last < (eco ? 66 : 16)) return; last = now;
      const w = el.clientWidth, h = el.clientHeight, dpr = devicePixelRatio || 1;
      if (el.width !== w * dpr || el.height !== h * dpr) { el.width = w * dpr; el.height = h * dpr; if (type === "waterfall") c.clearRect(0, 0, el.width, el.height); }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const t = taps;
      if (t) { t.l.getFloatTimeDomainData(t.td as Float32Array<ArrayBuffer>); t.r.getFloatTimeDomainData(t.td2 as Float32Array<ArrayBuffer>); t.l.getByteFrequencyData(t.fd as Uint8Array<ArrayBuffer>); }
      else { t; }
      const L = t?.td, Rr = t?.td2, F = t?.fd;
      if (type !== "waterfall") { c.clearRect(0, 0, w, h); c.strokeStyle = G; c.lineWidth = 1; for (let x = 0; x <= w; x += w / 8) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y <= h; y += h / 4) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } }
      c.font = "9px 'JetBrains Mono', monospace";
      if (type === "scope") {
        [[L, A], [Rr, P]].forEach(([d, col]) => { c.strokeStyle = col as string; c.lineWidth = 1.4; c.beginPath();
          for (let x = 0; x < w; x++) { const v = d ? (d as Float32Array)[Math.floor((x / w) * 1024)] : 0; const y = h / 2 - v * h * 0.9; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); });
      } else if (type === "spectrum") {
        const bars = Math.max(16, Math.floor(w / 5));
        for (let b = 0; b < bars; b++) { const i = Math.floor(Math.pow(1024, b / bars)); const v = F ? F[Math.min(1023, i)] / 255 : 0;
          c.fillStyle = v > 0.85 ? R : v > 0.6 ? Y : A; c.fillRect(b * (w / bars), h - v * h, w / bars - 1, v * h); }
      } else if (type === "meter") {
        const rms = (d?: Float32Array) => { if (!d) return 0; let s = 0, p = 0; for (let i = 0; i < d.length; i++) { s += d[i] * d[i]; p = Math.max(p, Math.abs(d[i])); } return [Math.sqrt(s / d.length), p] as unknown as number; };
        const [rl, pl] = (rms(L) || [0, 0]) as unknown as number[], [rr, pr] = (rms(Rr) || [0, 0]) as unknown as number[];
        pkL = Math.max(pl, pkL * 0.97); pkR = Math.max(pr, pkR * 0.97);
        const db = (v: number) => Math.max(-60, 20 * Math.log10(v || 1e-6)), pos = (v: number) => ((db(v) + 60) / 60) * h;
        [[rl, pkL, 0], [rr, pkR, 1]].forEach(([r, pk, k]) => { const x = 14 + k * (w / 2 - 6), bw = w / 2 - 26;
          const g = c.createLinearGradient(0, h, 0, 0); g.addColorStop(0, A); g.addColorStop(0.75, Y); g.addColorStop(1, R);
          c.fillStyle = g; c.fillRect(x, h - pos(r), bw, pos(r)); c.fillStyle = pk > 0.99 ? R : Y; c.fillRect(x, h - pos(pk) - 2, bw, 2);
          c.fillStyle = A; c.fillText(`${k ? "R" : "L"} ${db(pk).toFixed(1)}`, x + 2, 11); });
        c.fillStyle = G; [0, -6, -12, -24, -48].forEach(d => { const y = h - ((d + 60) / 60) * h; c.fillText(String(d), 0, Math.max(9, y)); });
      } else if (type === "imager") {
        const cx = w / 2, cy = h / 2, s = Math.min(w, h) * 0.45; c.strokeStyle = G; c.beginPath(); c.moveTo(cx - s, cy - s); c.lineTo(cx + s, cy + s); c.moveTo(cx + s, cy - s); c.lineTo(cx - s, cy + s); c.stroke();
        let corr = 0, nl = 0, nr = 0; c.fillStyle = A;
        if (L && Rr) for (let i = 0; i < 1024; i += 2) { const l = L[i], r = Rr[i]; corr += l * r; nl += l * l; nr += r * r;
          c.fillRect(cx + ((l - r) / 1.414) * s * 1.6, cy - ((l + r) / 1.414) * s * 1.6, 1.5, 1.5); }
        const co = nl && nr ? corr / Math.sqrt(nl * nr) : 0; c.fillStyle = co < 0 ? R : A; c.fillText(`corr ${co.toFixed(2)}`, 4, h - 4); c.fillText("M", cx - 3, 10); c.fillText("L", 4, 10); c.fillText("R", w - 10, 10);
      } else if (type === "waterfall") {
        c.drawImage(el, 0, 0, el.width, el.height, 0, 1, w, h); // scroll down 1px
        for (let x = 0; x < w; x++) { const i = Math.floor(Math.pow(1024, x / w)); const v = F ? F[Math.min(1023, i)] / 255 : 0;
          c.fillStyle = `hsl(${275 - v * 160} 80% ${v * 60}%)`; c.fillRect(x, 0, 1, 1); }
      } else if (type === "glitch") {
        const cols = Math.max(4, Math.floor(w / 18)), rows = Math.floor(h / 11);
        for (let r = 0; r < rows; r++) { c.fillStyle = G; c.fillText(hex(r * cols), 0, 9 + r * 11);
          for (let k = 0; k < cols - 2; k++) { const v = F ? F[(r * cols + k) * 3 % 1024] : 0; c.fillStyle = v > 200 ? R : v > 140 ? Y : v > 60 ? A : G; c.fillText(hex(v), 18 + k * 17, 9 + r * 11); } }
      } else if (type === "bits") {
        const cols = 16, rows = 12, cw = w / cols, ch = h / rows;
        for (let r = 0; r < rows; r++) { const v = L ? Math.floor((L[r * 80] * 0.5 + 0.5) * 65535) : 0;
          for (let b = 0; b < cols; b++) { const on = (v >> (15 - b)) & 1; c.fillStyle = on ? (b < 4 ? P : A) : G; c.fillRect(b * cw + 1, r * ch + 1, cw - 2, ch - 2); } }
        if (Math.random() < 0.06) { const y = Math.random() * h; c.drawImage(el, 0, y * dpr, el.width, 6 * dpr, Math.random() * 12 - 6, y, w, 6); }
      }
    };
    draw(); return () => cancelAnimationFrame(raf);
  }, [type, taps, eco]);
  return <canvas ref={ref} className="scope-canvas" role="img" aria-label={VIS[type]} />;
}

function VisualizerRack({ master, eco }: { master: GainNode | null; eco: boolean }) {
  const taps = useTaps(master);
  const [st, setSt] = useState<{ list: VisType[]; grid: boolean }>(() => {
    try { const s = JSON.parse(localStorage.getItem(KEY) || ""); if (Array.isArray(s.list)) return s; } catch { /* default */ }
    return { list: ["scope", "spectrum", "meter", "imager"], grid: true };
  });
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(st)); }, [st]);
  const setList = (list: VisType[]) => setSt(s => ({ ...s, list }));
  const move = (i: number, d: number) => { const n = [...st.list], j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; setList(n); };
  return <div className="node-body">
    <div className="gb-fx-add" style={{ marginBottom: 8 }}>
      <button aria-pressed={!st.grid} className={!st.grid ? "is-on" : ""} onClick={() => setSt(s => ({ ...s, grid: false }))}><Columns3 size={11} /> row</button>
      <button aria-pressed={st.grid} className={st.grid ? "is-on" : ""} onClick={() => setSt(s => ({ ...s, grid: true }))}><Grid2x2 size={11} /> grid</button>
      <span style={{ marginLeft: 6 }}><Plus size={12} /> add</span>
      {(Object.keys(VIS) as VisType[]).map(t => <button key={t} onClick={() => setList([...st.list, t])}>{VIS[t]}</button>)}
    </div>
    {!master && <span className="patch-small">tap a pad or press play to feed the monitors</span>}
    <div className={st.grid ? "gb-vis grid" : "gb-vis row"}>
      {st.list.map((t, i) => <section key={`${t}-${i}`} className="gb-fx-unit gb-vis-unit" aria-label={VIS[t]}>
        <header><span>{VIS[t]}</span><span className="gb-fx-actions">
          <button aria-label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)}><ChevronLeft size={12} /></button>
          <button aria-label="Move later" disabled={i === st.list.length - 1} onClick={() => move(i, 1)}><ChevronRight size={12} /></button>
          <button aria-label="Remove visualizer" onClick={() => setList(st.list.filter((_, j) => j !== i))}><X size={12} /></button>
        </span></header>
        <div className="gb-vis-screen"><Vis type={t} taps={taps} eco={eco} /></div>
      </section>)}
    </div>
  </div>;
}

export default memo(VisualizerRack);
