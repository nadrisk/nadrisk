# Cleaner synth waveform previews

## Confirmed issue
The small O1/O2 waveform preview uses the partial-bar values directly, whereas the sound squares those values. This exaggerates higher harmonics in the picture: TRI becomes square-like, and SQR becomes spiky. The preview also samples a 16-harmonic waveform at only 22 points, losing detail before it reaches the pixel screen.

## Display-only correction
1. Reconstruct the preview using squared partial values, matching the sound’s harmonic balance.
2. Compute one cycle at a higher internal resolution before reducing it to the existing small bitmap area. Use stable, band-limited resampling rather than drawing high harmonics from only 22 sample points; avoid blur, antialiasing and a decorative smoothing filter that changes the shape.
3. Use consistent cycle alignment and vertical sizing so sine stays smooth, square reads as two flatter levels, saw reads as a ramp/reset, and TRI loses the exaggerated square-like shoulders.
4. Keep the actual partial-derived shape for custom edits and named presets—do not substitute unrelated stock icons. Native waveform values in older sets can use their native shape in the small preview while keeping the current editable harmonic bars.
5. Preserve the exact screen size, framing, labels, themes, partial bars, controls and oscillator sound. No audio-engine, preset-recipe, FM or saved-set changes.

## Important limit
Smoothing cannot create harmonic phase that is absent from the sound. The current additive TRI uses positive odd harmonics rather than alternating signs, so its accurate preview will be more rounded than a textbook straight-sided triangle. The 16-partial square and saw can retain some rounded edges or ringing. This pass improves readability without falsely promising an exact textbook shape or silently changing the sound.

## Technical details
- Add a small pure preview-sampling helper and use it in `CyberspacePanel.tsx` for both O1 and O2.
- Reconstruct with the same partial amplitude conversion and silent-partial fallback as the audio engine, then normalize only the picture’s height.
- Cache the resulting tiny preview by waveform/partial recipe where useful; compute only when parameters change, never on pad hits or a new animation loop.
- Record the display-only sampling rule in the architecture notes.

## Checks and checkpoint
- Compare SINE, TRI, SAW and SQR before/after at their actual bitmap size on desktop and phone.
- Verify O1/O2 custom bar edits still update the intended preview, including silence and sparse harmonics.
- Check old native waves and saved additive patches without changing their stored values.
- Test sampling for finite values and stable bounds, run existing tests, and check preview errors.
- Pause for your visual review; if TRI still needs a textbook shape, discuss a separate phase/sound change rather than expanding this fix.