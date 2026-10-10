# Note names and a global tuning control

## What changes
1. **Note knobs show real note names.** The 808 NOTE and the Siren NOTE readouts show names like `C2`, `F#3` instead of raw numbers (e.g. 37 becomes `C#2`). Same naming as the phrase sequencer already uses.
2. **Global TUNE control.** A new transpose control next to PLAY/STOP and BPM in the top bar:
   - Range -12 to +12 semitones, double-tap resets to 0, readout like `TUNE +3`.
   - Shifts every pitched pad at once: synth, poly, sampler, 808 and siren. Drum pads (kick, snare, hat, clap) are not shifted, so the kit stays put.
   - Phrase sequencers and chords keep their scale shape and move with it, so everything stays in key relative to each other.
   - Saved with sets; older sets load with TUNE at 0.
   - MIDI-learnable like other controls.
3. Each pad's own NOTE/root stays as it is, so you can still tune single pads individually.

## Not touched
Drum engines, effects, sequencer grid, mixer, recorder, other screens.

## Technical details
- `Sub808Panel.tsx`, `SirenPanel.tsx`: `fmt` uses the existing `noteName()` helper.
- `useGroovebox.ts`: add `globalTune` state (persisted in sets, default 0); in `trigger()` add it to `pitch` for non-drum engines.
- `Groovebox.tsx`: compact pixel-styled TUNE stepper/drag with `aria-label="Global tune"`, themed via `data-lcd`.
