# Poly: fix chord retriggers and attack, add a filter envelope

## 1. Find and fix the chord retrigger problem (measure first)
What you hear: with CHORD on, fast repeat hits drop out. Also, the first hit has a sharp attack and every hit after it fades in slowly.
- In a test browser, play a poly pad with CHORD on (block and strum) and measure the output level of every hit. That shows whether a hit is missing, quieter, or slow to rise.
- Likely causes to check:
  - old chords being faded in a way that also masks the new one
  - the amount of sound per chord (5 notes × 4 oscillators each) overloading the audio engine
  - the volume envelope not starting from silence on each new hit
- Fix the confirmed cause. Every hit should then start with the same attack as the first one, set only by ATK. Old chords fade with the current release.
- I'll also check whether my last quick fix (old chords fading within a quarter second) is part of the problem, and undo it if it is.

## 2. Poly ADSR revisited
- Every new hit starts the volume envelope from silence with the same ATK, DEC, SUS and REL, whether or not CHORD is on.
- With CHORD on, all notes of the chord share one envelope, so the chord opens and closes together.

## 3. New poly filter envelope
- **FLT page:** CUT, RES and a new **ENV** amount knob, which can go up or down. The filter curve on screen shows how far the envelope will move the cutoff.
- **ENV page:** a **VOL / FLT** switch, like the synth's AMP/FLT choice. The graph, the draggable handles and the ATK/DEC/SUS/REL knobs all edit whichever envelope is selected.
- The filter envelope retriggers on every hit, chords included.
- Older sets load with the filter envelope amount at 0, so they sound exactly as before.

## Not changed
Synth, sampler, drums, effects, sequencing, layout style and themes.

## Checks
- Typecheck, tests and build.
- Test-browser level measurements: 20 fast chord hits all reach the same peak with the same attack time, and none are missing.
- The filter envelope opens the cutoff on each hit.
- An old set loads unchanged.

## Technical details
- Measure with an analyser on the poly slot's output. Compare the peak and the time to 90 % of the peak on each hit.
- Check that `playPoly` uses one shared `amp` with `adsr()`. Check the ring-list `release()`/`stop()` calls on previous voices, and the ring cap and quick-fade change from the last session.
- Add `fenv: ADSR` and `fenvAmt` (in octaves, ±4) to `PolyParams`. Run the `filterEnvAdsr` already used in `voices.ts` on `f1.frequency`. Fill in defaults during hydration in `useGroovebox.ts`.
- `EnsemblePanel.tsx`: add the ENV amount knob to the FLT page, and a VOL/FLT tap on the ENV page that switches what `drawEnvGraph`, `EnvZones` and `envKnobs` edit.
