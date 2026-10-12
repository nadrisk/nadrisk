import type { Wave } from "@/audio/voices";

type PreviewColumn = Readonly<{ value: number; min: number; max: number }>;
const cache = new Map<string, { values: readonly number[]; columns: readonly PreviewColumn[] }>();

/** Squared bars match audio; fast detail uses column coverage, never discarded harmonics. */
function sample(partials: readonly number[], native?: Wave, width = 22) {
  const count = Math.max(4, Math.round(width));
  const bars = Array.from({ length: 16 }, (_, i) => Number.isFinite(partials[i]) ? partials[i] : 0);
  const key = `${native ?? "additive"}:${count}:${bars.join(",")}`;
  const hit = cache.get(key); if (hit) return hit;
  const amplitudes = bars.map(v => v * v);
  const coverage = !native && amplitudes.some((v, i) => i + 1 > Math.floor((count - 1) / 2) && v > 0);
  const cycle = (phase: number) => {
    if (native === "sine") return Math.sin(phase);
    if (native === "triangle") return 2 / Math.PI * Math.asin(Math.sin(phase));
    if (native === "square") return Math.sin(phase) >= 0 ? 1 : -1;
    if (native === "sawtooth") return 1 - (((phase / (Math.PI * 2)) % 1 + 1) % 1) * 2;
    let y = 0;
    for (let h = 1; h <= 16; h++) y += amplitudes[h - 1] * Math.sin(h * phase);
    return y;
  };
  const raw = Array.from({ length: count }, (_, x) => {
    let sum = 0, min = Infinity, max = -Infinity;
    for (let k = 0; k < 32; k++) {
      const v = cycle((x + (k + .5) / 32 - .5) / count * Math.PI * 2);
      sum += v; min = Math.min(min, v); max = Math.max(max, v);
    }
    const value = sum / 32;
    return { value, min: coverage ? min : value, max: coverage ? max : value };
  });
  const peak = Math.max(1e-6, ...raw.flatMap(c => [Math.abs(c.min), Math.abs(c.max)]));
  const columns = raw.map(c => ({ value: c.value / peak, min: c.min / peak, max: c.max / peak }));
  const result = { columns, values: columns.map(c => c.value) };
  if (cache.size >= 128) cache.clear();
  cache.set(key, result);
  return result;
}

export function synthPreview(partials: readonly number[], native?: Wave, width = 22): readonly number[] {
  return sample(partials, native, width).values;
}
export function synthPreviewColumns(partials: readonly number[], native?: Wave, width = 22): readonly PreviewColumn[] {
  return sample(partials, native, width).columns;
}
