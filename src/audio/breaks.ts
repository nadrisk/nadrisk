import SignalsmithStretch, { type StretchNode } from "signalsmith-stretch";
// Patched copy: tolerates a node with no input bus, so Safari's silent input channel can't flip it into live mode.
import stretchModuleUrl from "./vendor/signalsmith-stretch.mjs?url";
import { stretchBuffer, type SamplerParams, type Voice } from "./voices";

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
/** Guess a break's tempo assuming it holds 1, 2, 4 or 8 bars of 4/4, preferring 85-175 BPM. */
export function guessSampleBpm(dur: number) {
  let best = 120, score = Infinity;
  for (const bars of [1, 2, 4, 8, 16]) { const b = bars * 4 * 60 / Math.max(.01, dur); const d = b < 85 ? 85 - b : b > 175 ? b - 175 : 0; if (d < score) { score = d; best = b; } }
  return best;
}
/** Which engine played the last break: stretch (STR) or backup (BAK). */
export let breakEngine: "" | "STR" | "BAK" = "";
export function breakTiming(p: SamplerParams, duration: number, bpm: number) {
  const start = Math.max(0, Math.min(.999, p.start)) * duration;
  const end = Math.min(duration, Math.max(start + .001, (p.end ?? 1) * duration));
  // Like Ableton warp: the break's own tempo (typed, or guessed from whole bars) sets how many beats it holds.
  const srcBpm = p.sampleBpm || guessSampleBpm(end - start);
  const beats = p.beats || Math.max(1, (end - start) * srcBpm / 60);
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
    entry = ready; breakEngine = "STR";
    if (cancelled || ctx.currentTime >= endAt) { ready.busy = true; cleanup(); return; }
    ready.busy = true; ready.node.connect(amp);
    const at = Math.max(t, ctx.currentTime + .005);
    amp.gain.setValueAtTime(0, at); amp.gain.linearRampToValueAtTime(vel, at + Math.max(.003, p.env.a));
    amp.gain.setTargetAtTime(vel * p.env.s, at + Math.max(.003, p.env.a), p.env.d / 3 + .001);
     void ready.node.schedule({ output: at, active: true, input: timing.start + (p.sliceAt ?? 0) * (timing.end - timing.start), rate: timing.rate, semitones: p.pitch, loopStart: timing.start, loopEnd: timing.end });
    scheduleRelease();
  };
  // Fallback when the stretch engine can't load (some iPhones): bake the region with the vintage
  // stretcher to seconds*pitchFactor, then play at pitchFactor — tempo and pitch stay independent.
  const sliceBuffer = (from: number, to: number) => {
    const sr = buf.sampleRate, a = Math.round(from * sr), b = Math.min(buf.length, Math.round(to * sr));
    const out = ctx.createBuffer(buf.numberOfChannels, Math.max(1, b - a), sr);
    for (let c = 0; c < buf.numberOfChannels; c++) out.getChannelData(c).set(buf.getChannelData(c).subarray(a, b));
    return out;
  };
  const fallback = () => {
    breakEngine = "BAK";
    if (cancelled || ctx.currentTime >= endAt) { cleanup(); return; }
    const pitchFactor = 2 ** (p.pitch / 12), regionLen = Math.max(.001, timing.end - timing.start);
    const baked = stretchBuffer(ctx, sliceBuffer(timing.start, timing.end), Math.max(.05, timing.seconds * pitchFactor / regionLen), .05);
    const src = ctx.createBufferSource(); src.buffer = baked; src.loop = true;
    src.playbackRate.value = pitchFactor;
    src.connect(amp); const at = Math.max(t, ctx.currentTime + .005);
    amp.gain.setValueAtTime(0, at); amp.gain.linearRampToValueAtTime(vel, at + Math.max(.003, p.env.a));
    amp.gain.setTargetAtTime(vel * p.env.s, at + Math.max(.003, p.env.a), p.env.d / 3 + .001);
    src.start(at, Math.min(.999, p.sliceAt ?? 0) * baked.duration);
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