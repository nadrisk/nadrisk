// Wavetables: a table is N single-cycle frames of FRAME samples (Serum/Vital 2048 format).
// BASIC (saw > square > triangle > sine) plays on native oscillators; imported tables play as
// browser PeriodicWaves (band-limited per note, so no aliasing) built lazily per frame.

export const FRAME = 2048;
export const MAX_FRAMES = 256;
const HARM = 512;
export const BASIC_ID = "basic";
export type WtRef = { id: string; name: string };
export type WtTable = { id: string; name: string; frames: Float32Array[]; real: Float32Array[]; imag: Float32Array[]; view: number[][] };

/** Reads PCM 8/16/24/32-bit int or 32/64-bit float WAV, first channel, plus Serum's "clm " frame size. No resampling. */
export function parseWav(buf: ArrayBuffer): { data: Float32Array; frameSize?: number } {
  const v = new DataView(buf), str = (o: number, n: number) => String.fromCharCode(...new Uint8Array(buf, o, n));
  if (buf.byteLength < 12 || str(0, 4) !== "RIFF" || str(8, 4) !== "WAVE") throw new Error("NOT A WAV FILE");
  let fmt = 0, ch = 1, bits = 16, data: [number, number] | null = null, frameSize: number | undefined;
  for (let o = 12; o + 8 <= buf.byteLength;) {
    const id = str(o, 4), size = v.getUint32(o + 4, true), b = o + 8;
    if (id === "fmt ") { fmt = v.getUint16(b, true); ch = v.getUint16(b + 2, true); bits = v.getUint16(b + 14, true); if (fmt === 0xfffe && size >= 26) fmt = v.getUint16(b + 24, true); }
    else if (id === "data") data = [b, Math.min(size, buf.byteLength - b)];
    else if (id === "clm ") { const m = /<!>(\d+)/.exec(str(b, Math.min(size, 32, buf.byteLength - b))); if (m) frameSize = +m[1]; }
    o = b + size + (size & 1);
  }
  if (!data) throw new Error("NO AUDIO DATA");
  const bps = bits / 8, n = Math.floor(data[1] / (bps * ch)), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const p = data[0] + i * bps * ch;
    out[i] = fmt === 3 ? (bits === 64 ? v.getFloat64(p, true) : v.getFloat32(p, true))
      : bits === 8 ? (v.getUint8(p) - 128) / 128 : bits === 16 ? v.getInt16(p, true) / 32768
      : bits === 24 ? (((v.getUint8(p + 2) << 24) | (v.getUint8(p + 1) << 16) | (v.getUint8(p) << 8)) >> 8) / 8388608
      : v.getInt32(p, true) / 2147483648; }
  return { data: out, frameSize };
}

const resample = (src: Float32Array, n: number) => { const o = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * src.length / n, a = Math.floor(x), f = x - a; o[i] = src[a % src.length] * (1 - f) + src[(a + 1) % src.length] * f; } return o; };

/** Splits audio into FRAME-sample cycles: Serum frame size if tagged, else 2048, else one short cycle stretched to 2048. */
export function toFrames(data: Float32Array, frameSize?: number): Float32Array[] {
  const fs = frameSize && frameSize > 16 && data.length >= frameSize ? frameSize : data.length >= FRAME ? FRAME : data.length;
  if (fs < 16) throw new Error("FILE TOO SHORT");
  const n = Math.max(1, Math.min(MAX_FRAMES, Math.floor(data.length / fs))), frames: Float32Array[] = [];
  // Long files with too many cycles are sampled evenly so the whole file is reachable.
  const total = Math.floor(data.length / fs);
  for (let k = 0; k < n; k++) { const s = Math.floor(k * total / n) * fs, f = data.subarray(s, s + fs); frames.push(fs === FRAME ? Float32Array.from(f) : resample(f, FRAME)); }
  let peak = 0; frames.forEach(f => f.forEach(x => { peak = Math.max(peak, Math.abs(x)); }));
  if (peak < 1e-6) throw new Error("FILE IS SILENT");
  frames.forEach(f => { let dc = 0; f.forEach(x => { dc += x; }); dc /= f.length; for (let i = 0; i < f.length; i++) f[i] = (f[i] - dc) / peak; });
  return frames;
}

/** In-place radix-2 FFT. */
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) { const p = i + k, q = p + len / 2, tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr;
        re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } }
}
/** Cosine/sine harmonic coefficients of one cycle, as PeriodicWave wants them (index 0 = DC = 0). */
export function harmonics(frame: Float32Array, count = HARM): { real: Float32Array; imag: Float32Array } {
  const n = frame.length, re = Float64Array.from(frame), im = new Float64Array(n); fft(re, im);
  const m = Math.min(count, n / 2 - 1), real = new Float32Array(m + 1), imag = new Float32Array(m + 1);
  for (let k = 1; k <= m; k++) { real[k] = 2 * re[k] / n; imag[k] = -2 * im[k] / n; }
  return { real, imag };
}

const viewOf = (f: Float32Array, pts = 48) => Array.from({ length: pts }, (_, i) => f[Math.floor(i * f.length / pts)]);
export function buildTable(id: string, name: string, frames: Float32Array[]): WtTable {
  const h = frames.map(f => harmonics(f));
  return { id, name, frames, real: h.map(x => x.real), imag: h.map(x => x.imag), view: frames.map(f => viewOf(f)) };
}
const basicShape = (k: number, t: number) => k === 0 ? 1 - 2 * t : k === 1 ? (t < .5 ? 1 : -1) : k === 2 ? 1 - Math.abs(t * 4 - 2) : Math.sin(t * Math.PI * 2);
let basic: WtTable | null = null;
export const basicTable = () => basic ??= { id: BASIC_ID, name: "BASIC WAVES", frames: [], real: [], imag: [], view: [0, 1, 2, 3].map(k => Array.from({ length: 48 }, (_, i) => basicShape(k, i / 48))) };

/** Frame pair + equal-power weights for a 0..1 position: frame k always lives on oscillator k % 2, so moving never swaps a sounding wave. */
export function framePair(pos: number, n: number) {
  const x = Math.max(0, Math.min(1, pos)) * Math.max(0, n - 1), a = Math.min(Math.max(0, n - 2), Math.floor(x)), f = n > 1 ? x - a : 0, b = Math.min(n - 1, a + 1);
  const w: [number, number] = [0, 0]; w[a % 2] = Math.cos(f * Math.PI / 2); if (b !== a) w[b % 2] = Math.sin(f * Math.PI / 2);
  const fr: [number, number] = [0, 0]; fr[a % 2] = a; fr[b % 2] = b; if (b === a) fr[(a + 1) % 2] = a;
  return { frames: fr, weights: w, x };
}

// ---- storage (IndexedDB, browser-local) ----
const DB = "nadrisk.wavetables", STORE = "tables";
const open = () => new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const tx = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => { const db = await open(); return new Promise<T>((res, rej) => { const q = fn(db.transaction(STORE, mode).objectStore(STORE)); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); };
type Stored = { name: string; n: number; data: Float32Array };

const mem = new Map<string, WtTable>(), loading = new Map<string, Promise<WtTable | null>>();
const listeners = new Set<() => void>();
export const onTablesChanged = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
const emit = () => listeners.forEach(f => f());

/** Synchronous lookup for the audio path; starts loading a missing table so the next note has it. */
export function tableNow(id?: string): WtTable | null {
  if (!id || id === BASIC_ID) return null;
  const t = mem.get(id); if (t) return t; void loadTable(id); return null;
}
export function loadTable(id: string): Promise<WtTable | null> {
  if (id === BASIC_ID) return Promise.resolve(basicTable());
  const m = mem.get(id); if (m) return Promise.resolve(m);
  let p = loading.get(id);
  if (!p) { p = tx<Stored | undefined>("readonly", s => s.get(id)).then(r => { if (!r) return null; const frames = Array.from({ length: r.n }, (_, k) => r.data.slice(k * FRAME, (k + 1) * FRAME)); const t = buildTable(id, r.name, frames); mem.set(id, t); emit(); return t; }).catch(() => null).finally(() => loading.delete(id)); loading.set(id, p); }
  return p;
}
export async function importWavetable(file: File): Promise<WtTable> { return storeWav(await file.arrayBuffer(), `wt:${file.name}-${file.size}`, file.name.replace(/\.[^.]+$/, "")); }
/** WaveEdit Online banks (CC0): 64 cycles of 256 samples, streamed from the CDN once, then kept on this device. */
export const cloudId = (file: string) => `wt:${file}-0`;
export async function loadCloudTable(file: string): Promise<WtTable> {
  const id = cloudId(file), have = await loadTable(id); if (have) return have;
  const r = await fetch(`https://cdn.jsdelivr.net/gh/smpldsnds/wavedit-online@main/samples/${encodeURIComponent(file)}.WAV`);
  if (!r.ok) throw new Error("DOWNLOAD FAILED");
  return storeWav(await r.arrayBuffer(), id, file, 256);
}
async function storeWav(buf: ArrayBuffer, id: string, name: string, forceFrame?: number): Promise<WtTable> {
  const { data, frameSize } = parseWav(buf);
  const frames = toFrames(data, forceFrame ?? frameSize);
  const flat = new Float32Array(frames.length * FRAME); frames.forEach((f, k) => flat.set(f, k * FRAME));
  await tx("readwrite", s => s.put({ name, n: frames.length, data: flat } satisfies Stored, id));
  const t = buildTable(id, name, frames); mem.set(id, t); emit(); return t;
}
export async function listTables(): Promise<WtRef[]> {
  try { const keys = (await tx("readonly", s => s.getAllKeys())) as string[]; return keys.map(id => ({ id, name: id.slice(3).replace(/-\d+$/, "").replace(/\.[^.]+$/, "") })); } catch { return []; }
}
export async function deleteTable(id: string) { await tx("readwrite", s => s.delete(id)); mem.delete(id); emit(); }

const waves = new WeakMap<BaseAudioContext, Map<string, PeriodicWave>>();
/** Lazily built, cached PeriodicWave for one frame. */
export function frameWave(ctx: BaseAudioContext, t: WtTable, k: number): PeriodicWave {
  let m = waves.get(ctx); if (!m) waves.set(ctx, m = new Map());
  const key = `${t.id}#${k}`; let w = m.get(key);
  if (!w) { w = ctx.createPeriodicWave(t.real[k], t.imag[k]); m.set(key, w); }
  return w;
}
