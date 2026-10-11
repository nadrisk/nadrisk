import SignalsmithStretch, { type StretchNode } from "signalsmith-stretch";
// Patched copy: tolerates a node with no input bus, so Safari's silent input channel can't flip it into live mode.
import stretchModuleUrl from "./vendor/signalsmith-stretch.mjs?url";
import type { SamplerParams, Voice } from "./voices";

// Use the unmodified self-contained WASM module, not a bundler-rewritten function.toString().
SignalsmithStretch.moduleUrl = stretchModuleUrl;
type Entry = { node: StretchNode; busy: boolean };
type Pool = { entries: Entry[]; pending?: Promise<void> };
const pools = new WeakMap<BaseAudioContext, WeakMap<AudioBuffer, Pool>>();
function poolOf(ctx: BaseAudioContext, buf: AudioBuffer) {
  let buffers = pools.get(ctx); if (!buffers) { buffers = new WeakMap(); pools.set(ctx, buffers); }
  let pool = buffers.get(buf); if (!pool) { pool = { entries: [] }; buffers.set(buf, pool); }
  return pool;
}
async function createEntry(ctx: BaseAudioContext, buf: AudioBuffer): Promise<Entry> {
  // No input bus: buffer playback mode is chosen when the processor sees no input channels.
  const node = await SignalsmithStretch(ctx, { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [buf.numberOfChannels] });
  await node.configure({ blockMs: 40, intervalMs: 10, splitComputation: true });
  await node.addBuffers(Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c)));
  return { node, busy: false };
}
/** Warm two voices before a pad hit; retain at most two idle copies of the source. */
export async function prepareBreak(ctx: BaseAudioContext, buf: AudioBuffer) {
  const pool = poolOf(ctx, buf);
  if (pool.pending) return pool.pending;
  if (pool.entries.filter(e => !e.busy).length >= 2) return;
  pool.pending = (async () => {
    const entry = await createEntry(ctx, buf); pool.entries.push(entry);
    if (pool.entries.length < 2) pool.entries.push(await createEntry(ctx, buf));
  })().finally(() => { pool.pending = undefined; });
  return pool.pending;
}
export function breakTiming(p: SamplerParams, duration: number, bpm: number) {
  const start = Math.max(0, Math.min(.999, p.start)) * duration;
  const end = Math.min(duration, Math.max(start + .001, (p.end ?? 1) * duration));
  const beats = p.beats || 2 ** Math.max(1, Math.min(6, Math.round(Math.log2(Math.max(1, (end - start) * bpm / 60)))));
  const seconds = beats * (p.breakDouble ? 2 : 1) * 60 / Math.max(20, bpm);
  return { start, end, beats, seconds, rate: (end - start) / seconds };
}
/** Synchronous Voice handle, even during cold loading, so release/STOP can cancel pending playback. */
export function playBreak(ctx: BaseAudioContext, dest: AudioNode, p: SamplerParams, buf: AudioBuffer, t: number, gate: number, bpm: number, vel = 1): Voice {
  const pool = poolOf(ctx, buf), timing = breakTiming(p, buf.duration, bpm);
  const amp = ctx.createGain(), fade = ctx.createGain(); amp.gain.value = 0; fade.gain.value = 1; amp.connect(fade).connect(dest);
  let entry: Entry | undefined, cancelled = false, releaseAt = t + gate, releaseR = p.env.r;
  let endAt = releaseAt + Math.max(.001, releaseR) * 1.5 + .06;
  let timer: number | undefined;
  const cleanup = () => {
    amp.disconnect(); fade.disconnect();
    if (!entry) return;
    entry.node.disconnect(); entry.busy = false;
    if (pool.entries.filter(e => !e.busy).length > 2) {
      pool.entries = pool.entries.filter(e => e !== entry); void entry.node.dropBuffers(); entry.node.port.close();
    }
  };
  const scheduleRelease = () => {
    if (!entry) return;
    const at = Math.max(ctx.currentTime, releaseAt);
    // Keep the currently playing loop alive during its fade; no new voice is triggered on lift.
    fade.gain.cancelScheduledValues(at);
    fade.gain.setTargetAtTime(0, at, Math.max(.001, releaseR) / 3 + .001);
     // schedule() advances its internal map to outputTime immediately. Booking a
     // future stop here would discard the active segment before it ever sounds.
    if (timer !== undefined) clearTimeout(timer);
     timer = window.setTimeout(() => {
       if (entry) void entry.node.schedule({ output: ctx.currentTime, active: false });
       cleanup();
     }, Math.max(0, (endAt - ctx.currentTime) * 1000) + 80);
  };
  const launch = (ready: Entry) => {
    entry = ready;
    if (cancelled || ctx.currentTime >= endAt) { ready.busy = true; cleanup(); return; }
    ready.busy = true; ready.node.connect(amp);
    const at = Math.max(t, ctx.currentTime + .005);
    amp.gain.setValueAtTime(0, at); amp.gain.linearRampToValueAtTime(vel, at + Math.max(.003, p.env.a));
    amp.gain.setTargetAtTime(vel * p.env.s, at + Math.max(.003, p.env.a), p.env.d / 3 + .001);
     void ready.node.schedule({ output: at, active: true, input: timing.start, rate: timing.rate, semitones: p.pitch, loopStart: timing.start, loopEnd: timing.end });
    scheduleRelease();
  };
  // Fallback when the stretch engine can't load: plain looped playback at the tempo rate (pitch follows speed).
  const fallback = () => {
    if (cancelled || ctx.currentTime >= endAt) { cleanup(); return; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    src.loopStart = timing.start; src.loopEnd = timing.end; src.playbackRate.value = timing.rate;
    src.connect(amp); const at = Math.max(t, ctx.currentTime + .005);
    amp.gain.setValueAtTime(0, at); amp.gain.linearRampToValueAtTime(vel, at + Math.max(.003, p.env.a));
    amp.gain.setTargetAtTime(vel * p.env.s, at + Math.max(.003, p.env.a), p.env.d / 3 + .001);
    src.start(at, timing.start);
    const poll = () => {
      if (ctx.currentTime < endAt) { window.setTimeout(poll, 50); return; }
      try { src.stop(); } catch { /* already stopped */ } src.disconnect(); cleanup();
    };
    fade.gain.setTargetAtTime(0, Math.max(ctx.currentTime, releaseAt), Math.max(.001, releaseR) / 3 + .001);
    poll();
  };
  const available = pool.entries.find(e => !e.busy);
  if (available) launch(available);
  else void createEntry(ctx, buf).then(e => { pool.entries.push(e); launch(e); }).catch(error => { console.error("Break playback unavailable", error); fallback(); });
  return {
    stop: at => { cancelled = true; releaseAt = at; releaseR = .005; endAt = at + .04; scheduleRelease(); },
    release: (at, r) => { const end = at + Math.max(.001, r) * 1.5 + .06; if (end >= endAt) return; releaseAt = at; releaseR = r; endAt = end; scheduleRelease(); },
     glide: (delta, at) => { if (entry) { void entry.node.schedule({ output: at, semitones: p.pitch + delta }); scheduleRelease(); } },
  };
}