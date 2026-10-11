# Make the synth oscillator display consistently additive

## Confirmed issue
The new recording matches the current synth logic: an oscillator saved with an older native SINE/TRI/SAW/SQR shape initially draws the legacy waveform trace. The first waveform change converts it to the additive version, after which it always draws the 16 harmonic bars. This is why the visual changes format only after the first tap.

## Fix
1. Show the 16-partial additive display immediately on O1 and O2, including when an older set or starter sound still contains a native waveform value.
2. For an older native value, derive the displayed bars from its matching additive recipe:
   - SINE → fundamental only
   - TRI → odd harmonics with triangle falloff
   - SAW → all harmonics
   - SQR → odd harmonics
3. Make the bars editable immediately. The first bar edit or waveform-button tap will store the matching additive shape, so the display and sound remain aligned.
4. Keep waveform order, labels, oscillator parameters, FM behavior, saved-set loading, and audio triggering unchanged.

## Verification
- Open every existing synth pad and confirm O1/O2 show harmonic bars on the first selection.
- Cycle SINE, TRI, SAW, SQR, ORG, HOLW, and BELL and confirm the display never returns to the legacy trace.
- Edit a bar before changing presets and confirm it becomes USR and affects the intended oscillator.
- Check an older saved set still loads and retains its waveform choice.
- Verify the preview build and browser console are clean.
