# Root notes, global key/scale, sampler key, gentler filter, held synth, 808 retrigger

## 1. NOTE knob on synth, poly, sampler (808 keeps its own)
- The synth, poly and sampler get a **NOTE** knob like the one on the 808, showing names such as `C3` and `F#2`. Drum and siren pads don't get one.
- On synth, NOTE takes the place of the pad's PTCH knob. The per-oscillator PTCH knobs on the synth are part of the sound design, so they stay.
- Each pad's NOTE is also the **root of its phrase sequencer**. The ROOT and OCT knobs on the phrase KEY page now show and edit that same note, so there's only one place to set it.

## 2. Global KEY + SCALE (beside TUNE)
- **KEY** (C–B) and **SCALE** (major, minor, dorian and so on, plus OFF) for the whole groovebox.
- **Snap:** when a scale is on, NOTE knobs only land on notes that are in the scale. The phrase sequencer and chords use the same key.
- **Degree mode:** NOTE readouts also show the degree, for example `IV F3` or `vi A3`. Changing KEY moves every pad's note by the same amount, so a progression like I–vi–IV–V on four pads stays a progression in the new key.
- **Auto chord quality:** with CHORD on and a scale set, each chord automatically becomes major, minor or diminished to fit its degree. The chord type you picked sets how big it is (triad, 7th, 9th). This builds on the existing in-scale chord fitting.
- With SCALE set to OFF, everything works the way it does now. Old sets open with SCALE OFF.

## 3. Sampler: sample key and fine tune
- **S-KEY:** tell the sampler which note the sample is in, for example A. It shifts the sample so the pad's NOTE plays the true pitch: S-KEY A with NOTE C3 plays a real C3.
- **FINE:** ±100 cents, for samples that are slightly off.
- These replace the sampler's PTCH knob in every mode. In BRK mode, NOTE takes the place of PTCH, so the tempo-locked warp still works the same.
- Old sets keep the pitch they had: their PTCH value is turned into the matching NOTE.

## 4. Filter control that's finer and follows your finger
- **Why it jumps now:** the screen draws the filter curve on a musical (log) scale, but your finger moves it in plain Hz. So the curve and your finger drift apart, and the low end flies by.
- **Fix:** the cutoff knob and the drag area on the curve use the same log scale, so the cutoff stays under your finger.
- **Finer control:** the drag area moves 1/3 as fast as your finger, so a full swipe covers about a third of the range. A 0.5 s press-and-hold enables an even finer ×0.25 mode. Double-tap still resets.
- This applies to both synth and poly.

## 5. Synth holds while pressed
- The synth now plays while your finger is down and releases when you lift, like poly does. The sequencer and phrase notes still use their own lengths.

## 6. 808 retrigger resets the envelope
- Every new 808 hit starts a fresh envelope at full level. The old tail is cut in a few ms, so it can't pull the new hit down even when the release is long.

## Not changed
Drum and siren pitch, effects, the sequencer grid, MIDI learn (new knobs are learnable) and saved sets (they load with the defaults above).

## Technical details
- `slot.note` already exists and is used when phrase is off (`trigger` line ~208). The phrase uses `midiOf(arp, 0)`, so it will use `slot.note` as root and the ArpEditor ROOT/OCT will read and write `slot.note`.
- Add global `key`, `scale` to state and sets. Snap uses `degreeOf`/`degreeToSemi`. Auto quality extends `scaleChordOffsets` (already stacked thirds).
- Sampler pitch = `note - (60 + sampleKey) + fine/100`. Migrate `sm.pitch` to `note = 60 + pitch`.
- Zone/knob: add a `log` option (normalise as `log(v/min)/log(max/min)`). Horizontal zones switch to relative drag ×1/3, and hold for ×0.25.
- Add `synth` to `heldEngine`. For 808, call `stop()` (a short fade) on the pad's ringing voices before the new hit, instead of `release()`.
- Verify in the browser: knob and curve line up, the held synth sustains, and repeated 808 hits reach the same peak. Then check by ear on your iPhone.
