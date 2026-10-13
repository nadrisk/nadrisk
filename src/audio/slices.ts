// Transient slicing: an onset-strength curve (high-passed energy flux, ~5.8 ms hops) is computed once per
// buffer; sensitivity only changes the peak-picking threshold, so turning SLCE is cheap.
const HOP = 256, WIN = 512;
const curves = new WeakMap<AudioBuffer, { c: Float32Array; lv: Float32Array; max: number }>();
const picks = new WeakMap<AudioBuffer, Map<string, number[]>>();

function onsetCurve(buf: AudioBuffer) {
  const hit = curves.get(buf); if (hit) return hit;
  const n = Math.max(1, Math.floor((buf.length - WIN) / HOP)), out = new Float32Array(n), lv = new Float32Array(n);
  const chs = Array.from({ length: Math.min(2, buf.numberOfChannels) }, (_, c) => buf.getChannelData(c));
  let prev = 0;
  for (let f = 0; f < n; f++) {
    // First difference emphasises highs (hats, snare cracks) without an FFT; log energy flux keeps quiet hits visible.
    let e = 0; const o = f * HOP;
    for (const d of chs) for (let i = 1; i < WIN; i++) { const v = d[o + i] - d[o + i - 1]; e += v * v; }
    const le = Math.log10(1e-9 + e / WIN);
    out[f] = Math.max(0, le - prev); lv[f] = le; prev = le;
  }
  let max = -9; for (let f = 0; f < n; f++) max = Math.max(max, lv[f]);
  const r = { c: out, lv, max }; curves.set(buf, r); return r;
}

/** Slice start positions as fractions of the region [start, end] of the buffer (first is always 0). sens 0..1: low = main hits only. */
export function detectSlices(buf: AudioBuffer | null | undefined, sens: number, start = 0, end = 1): number[] {
  if (!buf || sens <= 0) return [];
  const key = `${sens.toFixed(2)}|${start.toFixed(3)}|${end.toFixed(3)}`;
  let m = picks.get(buf); if (!m) { m = new Map(); picks.set(buf, m); }
  const cached = m.get(key); if (cached) return cached;
  const { c, lv, max } = onsetCurve(buf), floor = max - (1.2 + sens * 4.8) /* log10 energy: 12 dB (main hits) .. 60 dB (everything) */, fps = buf.sampleRate / HOP, a = Math.floor(start * buf.length / HOP), b = Math.min(c.length, Math.ceil(end * buf.length / HOP));
  const k = 3.2 - sens * 2.6, gap = Math.round(fps * (.11 - sens * .075)), wing = 8;
  const res: number[] = [0]; let last = a - gap;
  for (let f = a + 1; f < b - 1; f++) {
    if (c[f] < c[f - 1] || c[f] < c[f + 1] || f - last < gap) continue;
    // Adaptive threshold: mean of a ~90 ms neighbourhood scaled by sensitivity, plus an absolute floor.
    let s = 0, cnt = 0; for (let j = Math.max(a, f - wing); j < Math.min(b, f + wing); j++) { s += c[j]; cnt++; }
    if (Math.max(lv[f], lv[f + 1]) < floor) continue;
    if (c[f] < Math.max(.12 * (1.4 - sens), (s / cnt) * k)) continue;
    // Back up to the frame where energy starts rising so the slice lands on the attack, not after it.
    let on = f; while (on > a && on > f - 3 && c[on - 1] > c[f] * .25) on--;
    const frac = ((on * HOP) / buf.length - start) / Math.max(1e-6, end - start);
    if (frac > .01 && frac < .995) { res.push(frac); last = f; }
    if (res.length >= 64) break;
  }
  m.set(key, res); return res;
}
