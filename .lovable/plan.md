# Sampler revision: five playback modes, built in stages

## How it works for you
The sampler gets one **MODE** selector: **ONE**, **ADSR**, **LOOP**, **GRAN**, **BRK**. Each mode shows only its own controls. Start, End, Pitch, Volume and the waveform are shared and never duplicated. Old sets open in the mode that matches how they played before.

I'll build it in five stages, one at a time. After each stage you test it, and I only continue when you approve.

## Research: what we reuse and what we build
| Need | Choice | Why |
|---|---|---|
| Playing, looping and crossfading samples | Browser's built-in audio player plus our own crossfaded loop copy | Free, no delay, already partly in place |
| Time-stretch and pitch shift (BRK) | **Signalsmith Stretch** (MIT licence, runs in the browser) | High quality, pitch and timing adjust separately, commercial use is fine |
| Fallback stretch | **SoundTouch** (LGPL licence, runs in the browser) | A light, proven option if Signalsmith is too heavy on iPhone |
| Granular freeze | Our own grain engine on the shared audio worker | Libraries like Tone's GrainPlayer can't freeze, scan or run an LFO; ours already has the grain cap |
| Finding hits and slicing (BRK) | Spectral-flux onset detection, the method used in **Meyda** (MIT) and **aubio** | Runs once when a sample loads; I'll write it small rather than add a big library |
| Tempo guess | Our existing beat-length guess, optionally **web-audio-beat-detector** (MIT) | Good enough to fit a break to the tempo |

Ruled out: Rubber Band (GPL licence, needs a paid licence for commercial use) and Essentia.js (AGPL licence).

Limitations:
- Stretching on an older iPhone may cost noticeable processing power. I'll measure it and keep SoundTouch ready as the lighter option.
- Automatic slicing is a starting point. You can move every marker by hand.

## Stage 1: ONE and ADSR (first, this round)
- **START / END** knobs, with the playing region shown on the waveform and everything outside it dimmed.
- **ONE:** a tap plays from START to END at the pitch's speed and ignores how long you hold. The envelope can't cut the sample short or make it longer.
- **ADSR:** the same region, with the envelope shaping only the volume. Sustain holds while the finger is down, and lifting the finger starts the release. The envelope restarts on every hit, glides and overlapping notes included.

## Stage 2: LOOP
- **L-ST / L-END / XFD:** loop start, loop end and crossfade, set separately from START/END.
- Playback runs from START into the loop and repeats it while held, then the release fades it out after you let go.
- Equal-power crossfade, so the seam doesn't change level. Loop speed follows the note, as now.

## Stage 3: GRAN (replaces today's Grain mode)
- **FRZ** captures a section of the sample and holds it until you freeze again.
- Controls: **POS**, **SIZE**, **DENS**, **SPRY**, **RND**, plus an LFO with **RATE**, **AMT** and **SHP** (sine, triangle, square, random) that sweeps POS through the captured audio.
- Overlapping grains, each with a smooth fade, so the result is a continuous cloud. The existing grain cap keeps it stable.

## Stage 4: BRK (WARP renamed to Break)
- Loops the break in time with the BPM while held. On release it fades by REL instead of cutting.
- **PTCH** changes pitch without changing length (Signalsmith).
- **x2** doubles the break's length in bars, and tapping it again goes back to the original. The source sample itself is never changed.

## Stage 5: Slices
- Automatic slice markers that you can move by hand. Tap a slice to hear it.
- Like Ableton Simpler: a slice starts at its marker and keeps playing through the following audio until release or the next slice.
- In the mini phrase sequencer, each step picks a slice (shown as `SL 05`), and repeated slices are easy to set. It stays in time with the BPM.

## Checks for each stage
- Measurements in the test browser: no clicks at the region and loop edges, the envelope restarts on every hit, release behaves correctly, the break stays in time, and slices start in the right place.
- Typecheck, tests, build, and loading old sets.
- Checking by ear on your iPhone.

## Technical details
- `SamplerParams.mode: "one"|"adsr"|"loop"|"gran"|"break"`. Hydration maps old flags: `loop` becomes loop, `grain` becomes gran, `warp` becomes break, otherwise adsr. `end` is added beside `start`.
- ONE: `src.start(t, off, (end-start)*dur/rate)`, with the envelope only applied as a 3 ms declick. ADSR: the existing `finish`-style env on a separate amp, plus the new release stage.
- LOOP: a baked loop buffer with an equal-power crossfade, and `loopStart`/`loopEnd` on the source.
- GRAN: a worklet holding the frozen Float32 copy, with Hann grains, density in Hz, and the LFO inside the worklet.
- BRK: a Signalsmith Stretch worklet loaded from npm. It would be the only processor kept outside the single worklet bundle, if its build requires that. In that case it gets recorded in `AGENTS.md`.
- Slices: spectral flux (512 FFT, adaptive threshold) at load, `slicePoints: number[]` stored in the set, and the phrase degree mapped to a slice index.
