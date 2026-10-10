# Release, ring-out, sampler loop, IDM starting kit, performance reset

## 1. Sampler follows the finger
- A sampler pad plays while your finger is down. In the sequencer it plays for the step's length, ties included. Then it fades out over RELEASE.
- With RELEASE at 0 the sound stops as soon as you lift your finger. ATTACK, DECAY and SUSTAIN shape the sound while it's held.
- A sample that ends before you let go just ends there. Slices still stop at the edge of their slice.
- Cause: the sampler currently ignores how long the pad is held and always plays the sample to its end.

## 2. Release changes reach notes that are still ringing (all instruments)
- Turning RELEASE down shortens any tails from that pad that are still ringing. They fade out over the new time instead of the old one.
- A new hit on a pad makes its earlier tails fade out using the current RELEASE. With a short release the old tail no longer sits under the new sound. With a long release, tails still overlap the way they do now.
- Choke groups, STOP and the 6-voice cap still cut sound instantly, like today.
- Covers synth, 808, drums, siren, sampler and poly.

## 3. Poly rings out
- Lifting your finger on a poly pad now fades the chord out over its RELEASE time.
- Cause: lifting a finger used the instant cut meant for chokes, so the release never got a chance to play.

## 4. Sampler loop
- First I'll recreate the silence in the test browser with LOOP on while moving START, END and XFD, and measure the output to find exactly where the sound drops. I haven't confirmed the cause yet, so I'll fix whatever that test shows.
- While held, the loop sustains between START and END and blends across the seam by XFD. Changing START, END or XFD affects the next hit.
- Pitch follows the note. At the pad's root note the loop plays the exact START–END stretch you set. Higher notes loop faster and lower notes slower, by semitone, for phrases, chords and MIDI. I'll check this with a measurement.

## 5. New IDM starting kit (replaces the default)
- The groovebox opens with a new 16-pad kit and starting pattern in the style of modern IDM. Planned sounds:
  - Drums: tight clicky kick, granular/bitcrushed snare, metallic FM hats, glitch percussion.
  - Melodic: a detuned additive pad, a rubbery FM bass, a deep 808, a glassy poly chord, a looped vox texture and a sliced glitch chop.
- The pattern is broken and off-grid, with ratchets, chance and velocity variation. Effects are already set up on the pads (delay, reverb, bitcrush, spectral, saturation).
- RESET loads this kit. Your saved sets stay as they are.

## 6. Big reset in the PERFORM panel
- A wide RESET bar sits under the PERFORM screen and shows on every page (FX, ECO, SEQ, HLD). One tap snaps tension, time, the DJ filter, echo send, loop, offset and held modes back to neutral, ready for the drop.
- It lives only in the PERFORM panel. It can be assigned through MIDI learn.

## 7. WAV and MP3 import, 30-second limit
- The sample picker clearly accepts WAV and MP3 files, both single files and folder loads. On iPhone the picker opens Files with audio files selectable.
- A sample longer than 30 seconds keeps only its first 30 seconds, and the screen briefly shows "CUT TO 30S". A file that isn't WAV or MP3, or that won't open, shows a short message, and the pad keeps its current sample.
- Folder loads skip anything that isn't WAV or MP3.

## Not changed
Sequencing, timing, touch handling, layout outside the PERFORM panel, themes, saved-set format (older sets still load).

## Checks
- Typecheck, tests and production build.
- Test-browser measurements: sampler silence after release at RELEASE 0; old tails shortening when RELEASE is turned down; the poly tail length matching RELEASE; loop sound with START, END and XFD moved; loop speed at different notes; reset clearing every performance setting.
- Fast-tap check on the phone simulation, so nothing breaks the pad fix.
- Hearing the new kit can only be judged by you.

## Technical details
- `Voice` gains `release(at, r?)`, separate from `stop(at)`. `release` holds the current gain (`cancelAndHoldAtTime`, with a `setValueAtTime` fallback where that isn't available), sets a target of 0 with time constant r/3, and reschedules the source stop. `stop` stays the hard 4 ms cut for chokes, the ring cap and transport.
- `finish()` takes the env release, so every voice built on it, poly included, exposes `release`. The sampler and grain voices implement it directly.
- `useGroovebox.trigger`: the sampler joins the "held" engines (60 s gate until lift, like poly), and `playSampler` uses the gate instead of the sample length. On retrigger, earlier ring entries for the pad get `release(t, currentR)`. `updateSlot`/`updateSelected` call `release(now, newR)` on live ring entries when an env R value changes.
- `release()` (pad lift) calls `mono.release`, not `stop`.
- Loop: inspect `loopBufferOf` and the offset/loopStart handling together with stretch, warp and reverse in `playSampler`, and fix whatever the repro shows. playbackRate already tracks semitones, so check the loop rate with an analyser.
- `defaultSlots()` / `defaultPattern()` rewritten with the IDM kit, using existing engines and the bundled samples.
- `PerformanceRack`: an aria-labelled "Reset performance" bar under the `Panel` on every page, sharing the existing reset patch (extended to include `djRes` and `mode`).
