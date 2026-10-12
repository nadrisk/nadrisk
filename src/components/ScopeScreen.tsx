import { memo, useEffect, useRef, useState } from "react";
import { gatedLoop } from "@/lib/frameGate";
import type { Px } from "@/pixel/draw";
import { Panel } from "@/components/pixelScreens";

export type GetWave = (slot: number, out: Float32Array<ArrayBuffer>) => boolean;

/** Polls one pad's waveform at ~30 fps while mounted; returns a tick that changes on every new frame. */
export function useScope(slot: number, getWave: GetWave | undefined, active = true) {
  const buf = useRef(new Float32Array(512));
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!getWave || !active) return;
    let last = 0;
    return gatedLoop(null, (now: number) => { if (now - last < 33) return; last = now; if (getWave(slot, buf.current)) setTick(t => (t + 1) % 1e6); });
  }, [slot, getWave, active]);
  return { buf: buf.current, tick };
}

/** 1-bit scope: trigger on a rising zero crossing so periodic sounds stand still, then draw 120 samples as a connected trace. */
export function drawScope(p: Px, b: Float32Array, x0 = 2, y0 = 11, w = 124, h = 42, zoom = 1) {
  p.box(x0, y0, w, h, true);
  const mid = y0 + Math.floor(h / 2); p.line(x0 + 1, mid, x0 + w - 2, mid, true);
  let start = 0, peak = 0;
  for (let i = 1; i < b.length - 260; i++) if (b[i - 1] <= 0 && b[i] > 0) { start = i; break; }
  for (let i = 0; i < b.length; i++) peak = Math.max(peak, Math.abs(b[i]));
  if (peak < 1e-4) { p.textC("NO SIGNAL", x0 + w / 2, mid - 6); return; }
  const span = Math.round(240 / zoom), gain = Math.min(8, .9 / peak) * (h / 2 - 2);
  let py = mid;
  for (let x = 0; x < w - 2; x++) {
    const v = b[Math.min(b.length - 1, start + Math.floor(x / (w - 2) * span))];
    const y = Math.max(y0 + 1, Math.min(y0 + h - 2, Math.round(mid - v * gain)));
    if (x) p.line(x0 + x, py, x0 + 1 + x, y); py = y;
  }
}

/** Standalone SCOPE tile (fills the empty editor tile next to sampler/poly). */
function ScopeScreen({ slot, name, getWave }: { slot: number; name: string; getWave?: GetWave }) {
  const [zoom, setZoom] = useState(1);
  const { buf, tick } = useScope(slot, getWave);
  return <Panel name="SCOPE" label={`Oscilloscope ${name}`} pages={["WAV"]} deps={[tick, zoom, name]}
    knobs={() => [{ label: "Scope zoom", short: "ZOOM", value: zoom, min: .5, max: 4, step: .25, reset: 1, fmt: v => `${v}X`, set: setZoom }]}
    body={p => { drawScope(p, buf, 2, 11, 124, 34, zoom); p.text(name.toUpperCase().slice(0, 12), 4, 13); }} />;
}
export default memo(ScopeScreen);
