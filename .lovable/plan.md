# Phrase step mode, chord progressions, sampler reverse/stretch, breakbeat slicing, lighter granular

This is a big batch. I suggest building it in two rounds so each one can be tested properly:
**Round 1:** items 1, 2 and 6 (phrase and chords, plus lighter granular).
**Round 2:** items 3, 4 and 5 (sampler reverse view, stretch, breakbeats and slices).

## 1. Phrase STEP mode (advance on each pad hit)
- New play mode on the SEQ page: **RUN** (today: the phrase plays while you hold the pad) or **STEP** (each hit plays the next note, then wraps back to the start).
- Works from pad taps, the step grid, note repeat and MIDI, so a grid pattern can walk through a melody.
- The position resets when you press play, and when you switch modes.

## 2. Phrase loops (repeat part of the phrase)
- New LOOP settings on the SEQ page: **WHERE** (FIRST or LAST), **LEN** (1-8 notes) and **TIMES** (OFF, x2, x3, x4).
- Example: FIRST, 2 notes, x3 plays notes 1-2 three times, then carries on with the rest. LAST repeats the final notes before wrapping around.
- Works in both RUN and STEP modes. The step strip marks the looped notes.

## 3. Chords follow the phrase (progressions)
- When chords are on, each phrase step plays a whole chord built on that step's note.
- **CHORD FIT** switch:
  - **SCALE:** chords are stacked from the scale, so they always stay in key (e.g. i, iv, v in minor).
  - **FIXED:** the chosen chord shape (min7, etc.) moves unchanged to each step, so you can go outside the key.
- Block, strum and arpeggio still apply to each chord.

## 4. Sampler reverse waveform
- When REV is on, the sampler screen draws the waveform mirrored, and the start marker shows the reversed play position.

## 5. AKAI-style stretch
- New **STRETCH** mode on the sampler: the sample's length changes without changing its pitch (or pitch without length). It uses a deliberately grainy, gritty algorithm in the style of the S950/S1000 "cyclic" time stretch.
- Controls: **STR** (50-200% length), **CYC** (grain cycle length, short sounds metallic, long sounds stuttery) and **XF** (crossfade between cycles).

## 6. Breakbeat loops, warped and sliced
- New **BREAK** mode on the sampler. You set how many beats the loop is (1, 2, 4, 8 or 16 bars' worth, or auto-guessed from the length), and it plays in time with the BPM using the stretch engine.
- **SLICE** page: the loop is cut into 4/8/16 equal slices, or at detected hits (**AUTO**). The slice lines show on the waveform.
- Phrase sequencer degrees then pick **slices** instead of notes (step value shows `SL 05`). This works with STEP mode, so each pad hit plays the next slice. Rearranged breaks are easy that way.
- Normal sampler use is unchanged when BREAK is off.

## 7. Lighter granular
- Fewer, longer-overlapping grains (max about 12 at once, no more than about 25 a second per voice), and grains reuse a single shared window instead of making new ones. This should stop crackles and CPU spikes on tablets, and should sound smoother.

## Not touched
Other instruments, effects, mixer, master, recorder and MIDI mapping. Older saved sets load with all new options off.

## Technical details
- `arp.ts`: `ArpParams` gains `mode?: "run"|"step"`, `loop?: { where: "first"|"last"; len: number; times: number }`. Add a pure `phraseOrder(a)` helper that expands the loop into a step order list, shared by the scheduler and the step-strip highlight. Unit tests cover it.
- `useGroovebox.ts`: per-slot `stepCursor` ref. In STEP mode, `trigger()` uses `phraseOrder[cursor++]` instead of starting the held-pad scheduler. Chords: build the chord from the degree (`scale` fit = stack thirds via `degreeToSemi(deg+0/2/4/6)`, `fixed` = `chordNotes` added to the step's pitch).
- `musical.ts`: `ChordParams.fit?: "scale"|"fixed"`.
- `voices.ts`: `SamplerParams` gains `stretch?`, `cycle?`, `xfade?`, `breakBeats?`, `slices?: number[]`, `sliceMode?`. The stretch is an overlap-add of buffer segments scheduled with `AudioBufferSourceNode`s (no new worklet). Rate = (sample beats × 60/bpm) / duration. Slice playback = start/duration offsets. Onset detection is a simple energy-flux pass run once at load.
- Granular: a voice-level cap, a cached Hann `Float32Array` curve, and `setValueCurveAtTime` reuse.
- `WispdiskPanel.tsx`: reversed draw, STR/SLC pages and slice markers. `ArpEditor.tsx`: MODE/LOOP controls and slice readout.
