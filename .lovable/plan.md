# Fix list — staged (bugs first, then features)

We work one step at a time and stop after each step so you can test it on your iPhone.

## Step 1 — Bugs
1. **RESET · DROP and echo feedback:** reset also brings the performance echo feedback back to its starting value, and clears the echo trail that's still ringing, so a drone stops right away.
2. **Sequencer PLAY after STOP:** first find out why playback doesn't start again from step 1, then fix it so that after STOP, pressing PLAY always starts at step 1. PAUS/CONT still picks up where it stopped.
3. **Spectral gate AMT:** change how the knob responds so the effect starts to be heard at about 5% and builds up evenly across the whole turn, not only above 80%.

## Step 2 — Synth readouts and fine control
1. **O2 PITCH / FINE, O1 FINE:** show the real value with its sign, e.g. `+7 ST`, `-0.25`, `0.00`, so going left looks the same as going right. A double-tap reset shows `0`.
2. **FINE on synth, poly and sampler:** range ±0.50 semitones, moving in 0.01 steps. Old sets get clamped into this range.
3. **Envelope graph dragging:** your finger moves the handles at about a third of its speed, and holding still for half a second makes it finer still, the same way the filter graph works now. Times use a curved scale so short times are easier to set.
4. **Filter env:** remove FDEC, because the filter ADSR now does that job. FENV becomes an amount from 0 to 100% and shows as a number. Old sets: a negative FENV becomes 0, and the old FDEC value goes into the filter envelope's decay.

## Step 3 — Additive partials and effect loudness
1. **Additive oscillator:** rebuild it the way standard additive synths work. Partials 1 to N sit on whole-number multiples of the root note. Each one gets its own level bar, and the screen draws them as a harmonic spectrum (one bar per harmonic, labelled 1, 2, 3...). Add two simple controls: a BRIGHT tilt (how loud the higher partials are) and EVEN/ODD (odd partials only gives a square-like sound, all partials gives a saw-like sound).
2. **Gain compensation:** Acid distortion and Saturation lower their output automatically as DRIVE goes up, so turning DRIVE changes the character of the sound but keeps the loudness about the same.

## Step 4 — Sequencer features
1. **Lines every 4 steps:** a thin separator line after steps 4, 8 and 12 on every page of the sequencer.
2. **UNDO / REDO keys** on the SEQ screen, 32 levels. They cover every change to the grid: steps, ties, velocity, chance, roll, mod, RAND, CLR and the row faders.
3. **Pattern banks A, B, C, D:** the A/B switch becomes four keys. Old sets load, with C and D empty.

## Step 5 — Performance view
1. **Pattern keys A, B, C, D** on the PERFORM screen. The switch happens on the next bar, so the groove doesn't break.
2. **Mute row:** a strip of 16 small square keys below the performance effects, one for each pad, in grid order. A lit key means the pad plays; a dark key means it's muted. These are the same mutes as in the mixer, so the two stay in sync. On a phone the strip is two rows of 8.

## Step 6 — Visualizer limit
At most 4 visualizers in the rack, of any kind. When the rack is full the ADD option shows FULL. Sets that already have more than 4 still open, but you can't add any more.

## Technical notes
- Reset: extend the reset routine in PerformanceRack / useGroovebox to include echo feedback (and the TIME home value already stored).
- Pattern banks: widen the bank type from 2 to 4 and pad `slot.mods`, `vel`, `chance` arrays on hydration (no migration).
- Undo: snapshot stack of the active bank's grid state in the groovebox hook.
- Gain compensation: an output gain worked out from the shape of the drive curve, so loudness stays even (equal-RMS).
- All new keys are aria-labelled so MIDI learn works with them.
