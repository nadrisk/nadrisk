import type { Wave } from "@/audio/voices";

const cache = new Map<string, readonly number[]>();

/** Display-only, band-limited cycle: bar heights are perceptual, audio amplitudes are squared. */
export function synthPreview(partials: readonly number[], native?: Wave, width = 22): readonly number[] {
  const count = Math.max(4, Math.round(width));
  const bars = Array.from({ length: 16 }, (_, i) => Number.isFinite(partials[i]) ? partials[i] : 0);
  const key = `${native ?? "additive"}:${count}:${bars.join(",")}`;
  const hit = cache.get(key); if (hit) return hit;
  const amplitudes = bars.map(v => v * v);
  if (!amplitudes.some(v => v > 0)) amplitudes[0] = 1;
  // One periodic pixel footprint per column, integrated at 32 subpixel positions.
  // Frequencies beyond the display Nyquist limit cannot be represented faithfully.
  const limit = Math.min(16, Math.floor((count - 1) / 2));
  const cycle = (phase: number) => {
    if (native === "sine") return Math.sin(phase);
    if (native === "triangle") return 2 / Math.PI * Math.asin(Math.sin(phase));
    if (native === "square") return Math.sin(phase) >= 0 ? 1 : -1;
    if (native === "sawtooth") return 1 - (((phase / (Math.PI * 2)) % 1 + 1) % 1) * 2;
    let y = 0;
    for (let h = 1; h <= limit; h++) y += amplitudes[h - 1] * Math.sin(h * phase);
    return y;
  };
  const values = Array.from({ length: count }, (_, x) => {
    let y = 0;
    for (let k = 0; k < 32; k++) y += cycle((x + (k + .5) / 32 - .5) / count * Math.PI * 2);
    return y / 32;
  });
  const peak = Math.max(1e-6, ...values.map(Math.abs));
  const result = values.map(v => v / peak);
  if (cache.size >= 128) cache.clear();
  cache.set(key, result);
  return result;
}