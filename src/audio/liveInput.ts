// Sampler INPUT mode: one shared mic/instrument stream routed into a pad's insert chain, with audio-clock capture.
export const REC_WORKLET = `class NadRec extends AudioWorkletProcessor {
  constructor(){super();this.t0=-1;this.t1=-1;this.on=false;this.buf=[[],[]];this.n=0;this.pk=0;this.k=0;
    this.port.onmessage=e=>{const d=e.data;if(d.start!==undefined){this.t0=d.start;this.t1=d.stop??-1;this.buf=[[],[]];this.n=0;}if(d.stop!==undefined&&d.start===undefined)this.t1=d.stop;if(d.cancel){this.t0=-1;this.t1=-1;this.on=false;}};}
  process(inp){const i=inp[0];if(!i||!i[0])return true;const L=i[0],R=i[1]||i[0],now=currentTime,end=now+L.length/sampleRate;
    for(let j=0;j<L.length;j++){const a=Math.abs(L[j]);if(a>this.pk)this.pk=a;}
    if(++this.k>=6){this.port.postMessage({peak:this.pk,rec:this.on});this.pk=0;this.k=0;}
    if(this.t0>=0&&!this.on&&end>this.t0){this.on=true;this.port.postMessage({started:true});}
    if(this.on){let a=0,b=L.length;if(now<this.t0)a=Math.floor((this.t0-now)*sampleRate);if(this.t1>=0&&end>this.t1)b=Math.max(a,Math.floor((this.t1-now)*sampleRate));
      this.buf[0].push(L.slice(a,b));this.buf[1].push(R.slice(a,b));this.n+=b-a;
      const cap=this.n>=sampleRate*30;if((this.t1>=0&&end>=this.t1)||cap){this.on=false;this.t0=-1;this.t1=-1;this.port.postMessage({done:true,l:this.buf[0],r:this.buf[1],n:this.n});this.buf=[[],[]];this.n=0;}}
    return true;}
}
registerProcessor('nad-rec',NadRec);
`;

export const concat = (parts: Float32Array[], n: number) => { const o = new Float32Array(n); let k = 0; for (const p of parts) { o.set(p.subarray(0, Math.min(p.length, n - k)), k); k += p.length; if (k >= n) break; } return o; };
/** Drop the first `sec` seconds (input delay) so synced takes land on the beat. */
export const trimStart = (d: Float32Array, sec: number, sr: number) => d.subarray(Math.min(d.length, Math.max(0, Math.round(sec * sr))));
/** Seconds for `bars` bars of 4/4 at bpm. */
export const barsSec = (bars: number, bpm: number) => bars * 4 * 60 / bpm;

export function encodeWav(chs: Float32Array[], sr: number): Blob {
  const n = chs[0]?.length ?? 0, c = chs.length, buf = new ArrayBuffer(44 + n * c * 2), v = new DataView(buf);
  const s = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, "RIFF"); v.setUint32(4, 36 + n * c * 2, true); s(8, "WAVE"); s(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, c, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * c * 2, true); v.setUint16(32, c * 2, true); v.setUint16(34, 16, true); s(36, "data"); v.setUint32(40, n * c * 2, true);
  let o = 44; for (let i = 0; i < n; i++) for (let k = 0; k < c; k++) { const x = Math.max(-1, Math.min(1, chs[k][i])); v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true); o += 2; }
  return new Blob([buf], { type: "audio/wav" });
}

export type LiveStatus = { armed: number; rec: "off" | "wait" | "on"; peak: number; error: string };

export class LiveInput {
  stream: MediaStream | null = null; src: MediaStreamAudioSourceNode | null = null;
  gain: GainNode; gate: DynamicsCompressorNode; mon: GainNode; rec: AudioWorkletNode; sink: GainNode;
  dest: AudioNode | null = null; peak = 0; recording: LiveStatus["rec"] = "off";
  onTake: (l: Float32Array, r: Float32Array, sr: number) => void = () => {};
  onState: () => void = () => {};
  constructor(public ctx: AudioContext, make: (name: string) => AudioWorkletNode) {
    this.gain = ctx.createGain(); this.gate = ctx.createDynamicsCompressor(); this.mon = ctx.createGain(); this.mon.gain.value = 0;
    // Downward-expander-ish gate: a hard 1:1 pass with the threshold handled by gain riding in setGate.
    this.gate.ratio.value = 1; this.gate.threshold.value = 0;
    this.rec = make("nad-rec"); this.sink = ctx.createGain(); this.sink.gain.value = 0;
    this.gain.connect(this.mon); this.gain.connect(this.rec); this.rec.connect(this.sink); this.sink.connect(ctx.destination);
    this.rec.port.onmessage = (e: MessageEvent<{ peak?: number; started?: boolean; done?: boolean; l?: Float32Array[]; r?: Float32Array[]; n?: number }>) => {
      const d = e.data;
      if (d.peak !== undefined) { this.peak = d.peak; this.onState(); }
      if (d.started) { this.recording = "on"; this.onState(); }
      if (d.done && d.l && d.r && d.n) { this.recording = "off"; this.onState(); this.onTake(concat(d.l, d.n), concat(d.r, d.n), this.ctx.sampleRate); }
    };
  }
  async open() {
    if (this.stream) return;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    this.src = this.ctx.createMediaStreamSource(this.stream); this.src.connect(this.gain);
  }
  /** Seconds of input+output delay to trim from takes. */
  latency() { const c = this.ctx as AudioContext & { outputLatency?: number }; const tr = this.stream?.getAudioTracks()[0]?.getSettings() as { latency?: number } | undefined; return (c.baseLatency || 0) + (c.outputLatency || 0) + (tr?.latency ?? 0.01); }
  route(dest: AudioNode | null) { try { this.mon.disconnect(); } catch { /* none */ } this.dest = dest; if (dest) this.mon.connect(dest); }
  setGain(v: number) { this.gain.gain.setTargetAtTime(v, this.ctx.currentTime, .02); }
  setMon(v: number) { this.mon.gain.setTargetAtTime(v, this.ctx.currentTime, .03); }
  start(at: number, stop?: number) { this.recording = "wait"; this.rec.port.postMessage({ start: at, stop: stop ?? -1 }); this.onState(); }
  stop(at = this.ctx.currentTime) { this.rec.port.postMessage({ stop: at }); }
  cancel() { this.recording = "off"; this.rec.port.postMessage({ cancel: true }); this.onState(); }
  close() { this.cancel(); this.route(null); this.setMon(0); this.stream?.getTracks().forEach(t => t.stop()); try { this.src?.disconnect(); } catch { /* none */ } this.stream = null; this.src = null; }
}
