import { memo, useEffect, useRef, useState } from "react";
import { gatedLoop } from "@/lib/frameGate";
import { Panel } from "@/components/pixelScreens";

/** Fills `out` with the pad's dB spectrum (2048-point FFT) and returns the sample rate, or 0 when audio isn't running. */
export type GetSpectrum = (slot: number, out: Float32Array<ArrayBuffer>) => number;

const BARS = 24, LO = 30, HI = 16000, MIN = -90, MAX = -10;
const edge = (b: number) => LO * Math.pow(HI / LO, b / BARS);

/** Real-time log-spaced spectrum of one pad's output (post-FX, post-pan), with falling peak dots. */
function SpectrumScreen({ slot, name, getSpectrum }: { slot: number; name: string; getSpectrum?: GetSpectrum }) {
  const bins = useRef(new Float32Array(1024)), bars = useRef(new Float32Array(BARS)), peaks = useRef(new Float32Array(BARS));
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!getSpectrum) return;
    let last = 0;
    return gatedLoop(null, (now: number) => {
      if (now - last < 33) return; last = now;
      const sr = getSpectrum(slot, bins.current); if (!sr) return;
      const hz = sr / 2048, b = bins.current;
      for (let i = 0; i < BARS; i++) {
        const a = Math.floor(edge(i) / hz), e = Math.max(a + 1, Math.ceil(edge(i + 1) / hz));
        let m = MIN; for (let k = a; k < e && k < b.length; k++) if (b[k] > m) m = b[k];
        const v = Math.max(0, Math.min(1, (m - MIN) / (MAX - MIN)));
        bars.current[i] = v > bars.current[i] ? v : bars.current[i] * .8 + v * .2;
        peaks.current[i] = Math.max(v, peaks.current[i] - .02);
      }
      setTick(t => (t + 1) % 1e6);
    });
  }, [slot, getSpectrum]);
  return <Panel name="SPECTRUM" label={`Spectrum analyzer ${name}`} pages={["FFT"]} deps={[tick, name]}
    body={p => {
      const x0 = 4, y0 = 12, h = 34, w = 5;
      p.box(2, y0 - 2, 124, h + 4, true);
      for (let i = 0; i < BARS; i++) {
        const x = x0 + i * w, bh = Math.round(bars.current[i] * h), py = y0 + h - Math.round(peaks.current[i] * h);
        if (bh > 0) p.rect(x, y0 + h - bh, w - 1, bh);
        if (peaks.current[i] > .02) p.rect(x, Math.min(y0 + h - 1, py), w - 1, 1);
      }
      // BASS < 250 Hz < MID < 4 kHz < HIGH
      const at = (f: number) => x0 + Math.round(Math.log(f / LO) / Math.log(HI / LO) * BARS * w);
      p.line(at(250), y0 + h + 1, at(250), y0 + h + 3); p.line(at(4000), y0 + h + 1, at(4000), y0 + h + 3);
      p.text("BASS", x0, 52); p.textC("MID", (at(250) + at(4000)) / 2, 52); p.text("HIGH", 106, 52);
    }} />;
}
export default memo(SpectrumScreen);
