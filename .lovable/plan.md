# Streamlined sampler recording + piano XY

## 1. Fix recorded samples (hiss, silence)
- When a take finishes, disarm the mic and cut the monitor so no room hiss reaches the pad.
- On iPhone, hand audio back to the main speakers after recording (no quiet earpiece playback).
- New takes load as ONE-shot, neutral pitch (C4), full start/end, and play immediately on the next tap.

## 2. Simpler recording screen (IN page)
- One REC key with three states: OFF -> ARMED (waiting for sound) -> REC. ARM happens automatically when REC is pressed; a second tap cancels.
- Threshold start: recording begins only when the mic crosses the GATE level. A short pre-roll keeps the first hit intact.
- Mode key: FREE / NOTE.
  - FREE: stops on second REC tap or the length limit.
  - NOTE: stops when the sequencer note it started on ends.
- Remove BARS and SYNC (no bar-based recording). Keep GAIN, GATE, MON, MREC, TRIM.
- When the take is saved, the screen flips to SMP showing the waveform, with a brief "SAVED REC 01" message.

## 3. Note-length recording (NOTE mode)
- Draw a note on a sampler pad's sequencer row and stretch it with the right-edge drag as usual.
- Arm in NOTE mode: when that note plays and the mic passes the threshold, recording runs until the note ends, then stops by itself.
- If sound starts late inside the note, the take is still cut at the note's end. If nothing crosses the threshold, it stays armed for the next pass.
- On the next loop that note plays the new take in time.
- Sampler pads accept notes in the sequencer even before any sample is loaded.

## 4. Piano XY (MIDI GRAND, MIDI E-PNO)
- X: FELT (dark, about 400 Hz) to BRT (about 14 kHz), so the left half now has an effect too.
- Y: bottom TIGHT (short decay) to top RING (long release, like a sustain pedal). Attack stays instant everywhere.
- Corner labels FELT / BRT / TIGHT / RING; readouts TONE and DECAY / REL.
- Other PAD presets keep their current XY behavior.

## Technical details
- `src/audio/liveInput.ts`: threshold detector with a ~20 ms ring pre-roll, `stopAt(audioTime)` punch-out, disarm + monitor disconnect on finish, release the media stream tracks to free the iOS session.
- `src/hooks/useGroovebox.ts`: write the slot synchronously to `slotsRef` with mode "one", note 60, sampleKey 0, start 0, end 1; NOTE mode reads the slot's next lit step + span via `noteSpan.ts`/`stepAt()` on the scheduler and books start/stop on the audio clock.
- `src/components/WispdiskPanel.tsx`: REC tri-state, FREE/NOTE key, remove BARS/SYNC, auto page to SMP, saved toast via PixelScreen.
- `src/audio/xyMaps.ts` + `pad.ts`: piano-specific map (cutoff on X, decay/release on Y, attack fixed at 2 ms); labels in the XY screen.
- Tests: threshold start + pre-roll, note-span punch-out length, recorded slot defaults, piano XY values (left darkens, attack unchanged).
