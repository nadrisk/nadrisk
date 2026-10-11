# Metallic feedback: fix it, then make it Roar-style

## Why you hear nothing
A bug: one line of the effect's settings got swallowed by a code comment. So TONE and FDBK are never sent to the sound. The ring's tone filter sits at its factory default (very dark, around 350 Hz), which smothers the high metallic ring. FDBK is ignored too. What comes out is a dull, quiet smear, not a ring.

## What Ableton Roar's feedback does
- A short delay feeds back into itself. Its length is set as a **musical note** (or in ms), so the ring has a clear pitch.
- **Feedback** sets how long it rings. **Tone** filters inside the loop. Saturation in the loop makes it growl instead of just ringing.
- It can follow the notes you play, so the ring stays in key.

## Changes
1. **Fix the bug** so TONE and FDBK actually reach the sound.
2. **Tune the ring as a note**: TIME becomes **NOTE** (C1 to C6, display like `A#3`), with **FINE** for detune. The old ms values in saved sets are converted to the nearest note.
3. **TRACK switch**: when on, the ring follows the pitch of the note the pad plays (synth, 808, siren, poly root, sampler pitch). When off, it uses NOTE.
4. **Brighter, more metallic loop**:
   - a second comb slightly detuned (stereo) for shimmer
   - an allpass for inharmonic "bell/metal" partials (**METL** knob: 0 = pure string-like ring, up = clangy metal)
   - **DRIVE** saturation inside the loop for a Roar-style growl
5. **Keep it safe**: the envelope follower (DCY), the soft clip ceiling, the random square modulator and the tape-style glide all stay. Even at max FDBK it can't turn into a drone.
6. **Louder wet signal** by default, so the ring is clearly heard at MIX 40%.

## Checks
- Typecheck, tests, build.
- Test-browser measurement: a drum hit through the effect shows a clear peak at the NOTE pitch, and FDBK/TONE/METL each change it audibly in the measured spectrum. After a hit it still falls back to silence.
- Your ear test on iPhone.

## Technical details
- `effects.ts` line 241: the `//` comment swallows `set(lp.frequency, p.tone); set(fbAmt.gain, ...)`. Move them out of the comment.
- New params: `note` (MIDI), `fine`, `track`, `metal`, `drive`. Delay time = 1/f(note). Track uses a per-slot pitch hint the engine sets on each hit (`setFxPitch(slot, hz)`), glided by setTargetAtTime.
- Loop: delay → allpass chain (2 biquad allpasses, frequency scaled by METL) → lowpass (TONE) → drive waveshaper → fb gain × env → delay. Right channel uses a second delay at +7 cents.
- Hydration converts old `time` to the nearest `note`; metal stays FX_COST 4.
