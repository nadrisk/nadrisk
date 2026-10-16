# Sampler INPUT mode: monitor a mic or instrument through the pad, then record into it

## What you get
- A new **IN** page on every sampler pad (beside SMP, ENV, GRN, BRK).
- Tap **ARM** to listen: your mic, guitar or interface plays live through that pad's effects, EQ, level and pan, exactly like the pad's own sound.
- Tap **REC** to capture. Two ways to record:
  - **FREE**: starts now, stops when you tap again (max 30 s).
  - **SYNC**: waits for the next bar, records 1/2/4/8 bars (BARS knob), stops by itself and lands on the beat.
- When recording stops, the take becomes the pad's sample right away, named like `REC 01`, and is saved with your sets like any imported sample.
- Screen shows a live input meter, a clipping marker, a scrolling waveform while recording, and a bar countdown in SYNC.

## Controls on the IN page
- Keys: ARM (monitor on/off), REC, FREE/SYNC switch (shows the mode you would switch to), MON (hear input while recording, or record silently to avoid feedback).
- Knobs: GAIN (input level), GATE (cuts background hiss below a threshold), BARS (SYNC length), TRIM (shifts the take earlier to remove delay; AUTO by default).

## Safety and feel
- Only one pad can be armed at a time; arming another disarms the first.
- The browser asks for microphone permission the first time you tap ARM; if refused, the screen shows NO INPUT.
- Browser voice processing (echo cancel, noise suppression, auto gain) is turned off so guitars sound natural.
- Feedback warning: monitoring starts at low level until you raise it; a short tip appears when using built-in speakers is likely.
- Recorded takes are corrected for input delay so SYNC loops start on the downbeat.
- Stopping the transport, loading a set or leaving the page disarms input and stops any recording cleanly (no stuck sound).
- Input mode is never restored from a saved set: sets reload the recorded sample, not an armed microphone.

## Out of scope
- Picking a specific input device (uses the system default; can be added later).
- Live input on non-sampler engines, overdubbing onto an existing take, stereo input pairs beyond the device default.

## Technical details
- New `src/audio/liveInput.ts`: one shared `getUserMedia` stream (audio constraints off, mono/stereo as provided) → MediaStreamSource on the shared Tone raw context → gain → gate → monitor gain → `outs[i].input` of the armed slot, so it runs through the existing insert FX/EQ/pan chain.
- Capture via a recorder processor added to the single loadWorklets bundle (Tone allows one module per context), writing Float32 chunks; start/stop scheduled on the audio clock (SYNC uses Transport next-bar time). Latency trim = `ctx.baseLatency + outputLatency + input track latency` estimate, applied by slicing the buffer start.
- On stop: encode WAV, `putSample("db:rec-<timestamp>", name, blob)`, then reuse the existing sampler load path (decode, peaks, MAX_SAMPLE_SEC truncate), so pack/unpack for sets works unchanged.
- State: `armedSlot` + record status in the groovebox hook (session-only, never saved); disarm on transport stop, set load, unmount, audio interruption.
- UI: IN page in `WispdiskPanel.tsx` using existing Tap/Zone conventions and the top-right mode-key slot; meter reads a silent analyser tap like mixer meters, redrawn via capped PixelScreen updates in frameGate.
- Native (iOS): add microphone usage description to the native shell config.
- Tests: WAV encoder round-trip, latency-trim slicing, SYNC length math; verify in browser at 393px and desktop with a fake media stream; update AGENTS.md and roadmap.md.
