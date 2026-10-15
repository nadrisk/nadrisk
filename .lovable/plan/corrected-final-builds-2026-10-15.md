# Corrected final builds

Built in this order. Every sound change gets a listening test. Each item is also checked on a phone and on desktop.

## 1. NADRISK master: replace the "CD failure" with a Failure-style sound (~3–4 credits)
- Remove the random dropouts, stutters and volume sags. Nothing cuts the sound out.
- Build the sound we agreed on, modelled on the Rainbow Machines Failure. It has no knobs and reacts only to how loud you play:
  - **Infrasonic sub-harmonics:** a sub tone one and two octaves below the music, following its pitch. It grows as the music gets louder.
  - **Asymmetric diode saturation:** a raw, uneven diode clip that gets harder as the input gets louder. It replaces the current hard-clip curve.
  - **Sluggish pumping:** a slow compressor (slow attack, long release) that ducks on loud peaks, then surges back late with a "breathing" swell.
- Quiet passages stay almost clean; loud passages fall apart in a musical way.
- The safety limiter stays last in the chain. Everything is built once and stays fully dry until NADRISK mode turns on, with short fades in and out so nothing clicks.
- The existing heavy squash stays, unless it masks the pumping. In that case I'll lower it and tell you.

## 2. Sequencer row solo for RAND (~1–2 credits)
- I'll check how RAND currently works with the exclude and solo toggles, then fix it so this works:
  - Solo one row (one pad): RAND changes only that row; every other row stays untouched.
  - Solo several rows: RAND changes only those rows.
  - With no solo, RAND changes every row that isn't excluded.
- Solo is shown on the row name with a clear marker. It applies to the current page (NOTE, VEL, CHNC, ROLL, MOD), so RAND on ROLL with one row soloed re-rolls only that row.

## 3. MIDI step recording, Crave-style (~3–4 credits)
- Turn on step REC with the keyboard in KBD mode. Each key you press writes one step on the selected pad's row, then the cursor moves to the next step.
- The note's pitch goes into the pitch lane (two octaves up or down from the pad's note), and its velocity goes into VEL.
- **Chords:** keys pressed almost together (within about 60 ms) count as one press. Only the first-pressed note is recorded, and the step moves on once.
- **Arps:** each note fills its own step, one after another.
- The cursor wraps at the end of the row. A REST key (or the sustain pedal) skips a step, and STOP or leaving REC ends recording.
- On playback, each step plays its recorded pitch.

## 4. Factory patches: 10 staples (~2–3 credits)
- A read-only FACTORY list in PATCH that loads like a normal patch: sound and effects only, never the rhythm.
- The 10 sounds:
  1. Hoover (detuned, pitch-bending rave lead)
  2. Rave chord stab (minor 7th organ stab)
  3. Reese bass
  4. 808 sub
  5. Acid 303
  6. Wobble bass
  7. Supersaw lead
  8. Pluck
  9. Warm pad
  10. Dub siren
- Each one gets an ear test and a level match.

## 5. SPEC: a real spectral synth mode (~8–12 credits, largest)
- A new mode on the Cyberspace synth beside its normal additive mode, switched with the top-right mode key. Each mode keeps its own settings, so switching never overwrites a sound.
- In SPEC, the 16 bars are 16 **spectral bands**, not 16 partials. You draw how loud each band is, like the spectral gate effect, except the synth makes the sound itself.
- Each band is a filtered slice of a rich source (saw plus noise blend). Bands follow the note's pitch, so chords keep their harmony.
- Controls:
  - **GATE:** chops the bands rhythmically in time, for colour-bass chords.
  - **TIGHT:** short, punchy envelopes per band (modern colour-bass pluck) versus a slow watery haze.
  - **BLUR:** smears and freezes the spectrum for the lush, blurry sound.
  - **SHIFT:** slides the bands up or down.
  - **BITE:** adds a transient on each hit.
- Chords snap to the global key. One chord press sounds like a colour-bass chord with TIGHT up and GATE on, or like an ambient spectral wash with BLUR up.
- The screen shows live band bars, and you draw directly on them.

## Technical details
- Failure stage in `performance.ts`:
  - The `failG` dropout scheduler is removed.
  - An envelope-follower worklet (already in the bundle) drives three things: the sub-octave mix (a divide-down octave worklet processor added to the single loadWorklets bundle), the diode curve pre-gain (cached curve set), and the slow compressor (attack ~80 ms, release ~600 ms) with surge makeup.
  - Every stage is pre-built and dry until `setNad(true)`.
- RAND solo:
  - First audit the existing exclude/solo state in useGroovebox and the sequencer UI.
  - Store solo per slot, session-only, and make the randomizer filter `solo.size ? solo : !excluded`.
- Step recording:
  - useMidi KBD noteOn feeds a 60 ms chord-collapse window, then `writeStep(slot, cursor, {on, vel, pitchMod: semi})`.
  - Pitch is written into the existing ±24 pitch mod lane on the current bank. The scheduler already applies mods on lit steps.
- Factory patches are a constant array in `src/audio/factoryPatches.ts` in `Patch` format, loaded through the existing hydration, so they never touch localStorage.
- SPEC:
  - New `synth.mode = "spec"` with its own saved params, so old sets load as additive.
  - Voice code goes in `src/audio/spectral.ts`. Per voice, the source feeds 16 band-pass filters, each into a band gain; GATE uses an audio-clock gain schedule.
  - BLUR uses the existing spectral worklet freeze/smear on the voice sum. Band count is capped and voices pooled to stay within the voice budget.
- Record the structural rules in AGENTS.md (Failure stage, SPEC mode, step recording) and update roadmap.md.
