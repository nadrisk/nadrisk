# PRC tuning readout + phrase slides respect polyphony

## 1. PRC tune knob shows notes like the kick
- While you turn the first knob on the PRC MODL page (the tune), it shows a note plus cents (e.g. `F#2+12c`) instead of Hz — the same readout the kick and snare use.
- The knob gets the kick's fine, even travel, so landing on an exact note is easy.
- Applies to every PRC model; the sound is unchanged (old sets load with the same pitch).

## 2. Phrase slides only glide on mono instruments
- Slide steps in the phrase sequencer glide pitch only when the pad is actually monophonic:
  - SYN with VOICES = 1, all BAS modes (808 / ACID / REESE), SMP in one-shot mode.
- On polyphonic pads (SYN with 2–8 voices, chords, SMP in ADSR mode) a slide step plays as a normal new note with its own gate, and the note before it is no longer stretched.
- DRM / PRC ignore slides.

## Technical details
- Move `noteCents` from `DrumkitPanel.tsx` into a small shared helper and use it in `IdmPanel.tsx` for the `tune` knob with `log: true, bare: true` and a fine step.
- Add `isSlotMono(slot)` in the groovebox hook (synth: `clean.voices === 1` and no chord; `808` engine: true; sampler: `mode === "one"`; others false).
- In `phraseStep`, gate the slide branch and the slide-length hold (`n` loop) on `isSlotMono`; poly falls through to a normal `trigger` with `sd * c.gate`.
- Add a test for `isSlotMono` and the noteCents conversion (e.g. 440 Hz → `A4`, 445 Hz → `A4+20c`).
