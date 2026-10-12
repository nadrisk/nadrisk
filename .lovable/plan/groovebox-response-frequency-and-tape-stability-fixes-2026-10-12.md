# Groovebox response, frequency and tape stability fixes

## What happened
Nothing is broken and none of the attempted source changes were applied. The edit was rejected because the architecture notes file is 5,038 bytes and adding two new notes would exceed its 5,120-byte limit.

## Safe resolution
Before Stage 1, compact two existing architecture notes into one shorter rule. This frees enough space without deleting any requirement or changing the groovebox. Then apply the source changes separately, so an architecture-note limit can never cancel the actual fix again.

## Stage 1 — Restore playability
- Generate new reverb SIZE/DENS impulses in deferred chunks, keeping the current impulse active until the replacement is ready.
- Synchronize effects only for the slot whose FX list changed, instead of reapplying all 16 chains for unrelated control changes.
- Remove avoidable full-chain serialization from the effect-screen redraw path.
- Preserve the approved reverb sound, DENS control and all live visuals.
- Verify rapid pad taps, sequencer timing and reverb movement on the current iPhone-sized view and desktop.

## Stage 2 — Bound tape echo feedback
- Lower tape feedback from near-unity to a long but reliably decaying maximum.
- Reduce and control spring regeneration so resonances cannot hang indefinitely.
- On STOP, fade only the tape and spring feedback returns to zero. Let the final in-flight repeat finish, then reach silence without clicks.
- Restore the selected feedback automatically for the next playback.

## Stage 3 — Recalibrate frequency and pitch controls
- Apply perceptual movement to channel/effect EQ frequencies, dynamic EQ center, phaser manual frequency, drum cutoff/base, hat tuning, tone, damping and sidechain high-pass.
- Keep chorus and flanger MAN linear because those controls represent delay time.
- Use the same mapping for knob, drag area and screen marker.
- Preserve stored Hz values, saved sets and MIDI mappings.

## Checkpoints
Run checks and browser interaction tests after every stage, then pause for your playability or ear-test approval.
