# Groovebox response, frequency and tape stability fixes

## Goal
Restore immediate pad response, make frequency and pitch controls move perceptually with their screens, and ensure the tape echo cannot become a persistent drone after STOP.

## Stage 1 — Restore playability
- Remove synchronous reverb impulse creation from knob and pad interaction. Keep the current impulse playing while a new SIZE/DENS variation is prepared, then swap it in safely.
- Restrict effect synchronization to the slot that changed instead of updating all 16 slots on every control movement.
- Remove avoidable full-chain serialization from the effect screen redraw path.
- Preserve the approved reverb sound, DENS control and all live visuals.
- Verify rapid pad taps, sequencer timing and reverb SIZE/DENS movement at low, neutral and maximum settings on desktop and phone-sized layouts.

## Stage 2 — Bound tape echo feedback
- Lower tape feedback’s maximum from near-unity to a still-long but reliably decaying range.
- Reduce and control the spring tank’s internal regeneration so resonant frequencies cannot hang indefinitely.
- Add a STOP hook that fades only the tape and spring feedback returns to zero; the final in-flight echo may finish once, but no loop can keep regenerating.
- Restore the selected feedback values automatically when playback starts or the effect is updated.
- Verify one head, all heads, maximum feedback and maximum spring; confirm STOP reaches silence without clicks or a sustained tone.

## Stage 3 — Recalibrate frequency and pitch controls
- Use perceptual/logarithmic movement for the channel EQ frequencies, effect EQ, dynamic EQ center frequency, phaser manual frequency, drum filter cutoff/base, hat tuning, and other true frequency controls such as tone, damping and sidechain high-pass.
- Keep delay-time MAN controls for chorus and flanger linear; they are time values, not frequency values.
- Make each knob, drag area and screen marker use the same mapping so their center and endpoints agree.
- Preserve every stored Hz value, saved set and MIDI mapping; only control travel and visual position change.
- Check minimum, center and maximum positions against the audible sweep and on-screen marker for each affected control.

## Checkpoints
Each stage ends with type/tests, a clean preview build, and browser interaction checks. Stop after each stage for your playability or ear-test approval before continuing.

## Technical details
- Reverb cache buckets remain based on SIZE and DENS, but cache misses are prepared outside the interaction frame.
- Tape STOP handling is added through an optional effect-tail hook rather than disposing or rebuilding effect chains.
- Log mapping uses the existing `log` control support, so audio values and saved data do not need migration.
