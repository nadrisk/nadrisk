/** Salamander Grand Piano (Alexander Holm, CC-BY 3.0): recorded notes every half octave (C and F#, C1..C7).
 *  Decoded once per audio context; each key plays the nearest recording, re-pitched by at most 3 semitones. */
const files = import.meta.glob("../assets/piano/*.mp3", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const NAME: Record<string, number> = { C: 0, Fs: 6 };
export const PIANO_ROOTS: { midi: number; url: string }[] = Object.entries(files).map(([p, url]) => {
  const m = /\/(C|Fs)(\d)\.mp3$/.exec(p)!; return { midi: 12 * (Number(m[2]) + 1) + NAME[m[1]], url };
}).sort((a, b) => a.midi - b.midi);

/** Nearest recorded root and playbackRate for a MIDI note. */
export function pianoPick(midi: number, roots: number[]): { root: number; rate: number } {
  let root = roots[0]; for (const r of roots) if (Math.abs(r - midi) < Math.abs(root - midi)) root = r;
  return { root, rate: 2 ** ((midi - root) / 12) };
}

const cache = new WeakMap<BaseAudioContext, Map<number, AudioBuffer>>();
const loading = new WeakMap<BaseAudioContext, Promise<void>>();
export function pianoBuffers(ctx: BaseAudioContext) { return cache.get(ctx); }
export function preloadPiano(ctx: BaseAudioContext): Promise<void> {
  let p = loading.get(ctx); if (p) return p;
  const m = new Map<number, AudioBuffer>();
  p = Promise.all(PIANO_ROOTS.map(async r => { try { const b = await (await fetch(r.url)).arrayBuffer(); m.set(r.midi, await ctx.decodeAudioData(b)); } catch { /* missing note: neighbours cover it */ } }))
    .then(() => { if (m.size) cache.set(ctx, m); else loading.delete(ctx); });
  loading.set(ctx, p); return p;
}
