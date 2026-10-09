import * as Tone from "tone";
// Master tape recorder: an inline AudioWorklet copies the final master output into 16-bit chunks.
const TAPE = `class NadTape extends AudioWorkletProcessor{constructor(){super();this.on=false;this.port.onmessage=e=>{this.on=e.data};}
process(i){const x=i[0];if(this.on&&x&&x.length){const l=x[0].slice(0),r=(x[1]||x[0]).slice(0);this.port.postMessage([l,r],[l.buffer,r.buffer]);}return true;}}
registerProcessor("nad-tape",NadTape);`;
let loaded: Promise<void> | null = null;
export const MAX_TAPE_SEC = 600;

export type Take = { l: Int16Array[]; r: Int16Array[]; frames: number; rate: number };
const toI16 = (f: Float32Array) => { const o = new Int16Array(f.length); for (let i = 0; i < f.length; i++) { const s = Math.max(-1, Math.min(1, f[i])); o[i] = s < 0 ? s * 0x8000 : s * 0x7fff; } return o; };

export async function createTape(source: AudioNode, ctx: BaseAudioContext) {
  await (loaded ??= Tone.getContext().addAudioWorkletModule(URL.createObjectURL(new Blob([TAPE], { type: "application/javascript" }))));
  const node = Tone.getContext().createAudioWorkletNode("nad-tape") as unknown as AudioWorkletNode;
  const sink = ctx.createGain(); sink.gain.value = 0;
  source.connect(node); node.connect(sink).connect(ctx.destination);
  let take: Take = { l: [], r: [], frames: 0, rate: ctx.sampleRate };
  node.port.onmessage = (e: MessageEvent<[Float32Array, Float32Array]>) => {
    if (take.frames > MAX_TAPE_SEC * take.rate) return;
    take.l.push(toI16(e.data[0])); take.r.push(toI16(e.data[1])); take.frames += e.data[0].length;
  };
  return {
    start: () => { take = { l: [], r: [], frames: 0, rate: ctx.sampleRate }; node.port.postMessage(true); },
    stop: () => { node.port.postMessage(false); return take; },
    seconds: () => take.frames / take.rate,
    dispose: () => { node.port.postMessage(false); try { source.disconnect(node); } catch { /* gone */ } node.disconnect(); sink.disconnect(); },
  };
}

const flat = (chunks: Int16Array[], frames: number) => { const o = new Int16Array(frames); let p = 0; for (const c of chunks) { o.set(c.subarray(0, Math.min(c.length, frames - p)), p); p += c.length; if (p >= frames) break; } return o; };

export function encodeWav(t: Take): Blob {
  const l = flat(t.l, t.frames), r = flat(t.r, t.frames), n = t.frames, buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + n * 4, true); str(8, "WAVE"); str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, t.rate, true); v.setUint32(28, t.rate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, n * 4, true);
  for (let i = 0, o = 44; i < n; i++, o += 4) { v.setInt16(o, l[i], true); v.setInt16(o + 2, r[i], true); }
  return new Blob([buf], { type: "audio/wav" });
}

/** 320 kbps stereo MP3, encoded in slices so the page stays responsive. */
export async function encodeMp3(t: Take, onProgress?: (p: number) => void): Promise<Blob> {
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const rate = [48000, 44100, 32000].includes(t.rate) ? t.rate : 44100;
  const enc = new Mp3Encoder(2, rate, 320), l = flat(t.l, t.frames), r = flat(t.r, t.frames), out: BlobPart[] = [], block = 1152 * 40;
  for (let i = 0; i < t.frames; i += block) {
    const d = enc.encodeBuffer(l.subarray(i, i + block), r.subarray(i, i + block)); if (d.length) out.push(new Uint8Array(d));
    if ((i / block) % 20 === 0) { onProgress?.(i / t.frames); await new Promise(res => setTimeout(res, 0)); }
  }
  const end = enc.flush(); if (end.length) out.push(new Uint8Array(end));
  return new Blob(out, { type: "audio/mpeg" });
}
