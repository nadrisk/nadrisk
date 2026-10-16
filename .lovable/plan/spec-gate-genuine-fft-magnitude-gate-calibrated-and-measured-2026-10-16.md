# SPEC GATE: genuine FFT magnitude gate, calibrated and measured

## Step 1 — find why GATE still fails (diagnose before changing)
Run the real app in the browser, play a SPEC pad with bars lowered and GATE swept 0 to 100%, and record the output. Check, in order:
- the gate processor is actually created for each note (no silent fallback to ungated);
- the GATE value really reaches the processor while notes play;
- the output spectrum changes (weak partials drop) rather than only the level.
Report the confirmed cause before fixing. Current suspects: the processor never gets created live, GATE values not reaching it, and the level boost that rises with GATE (a volume change you said must not be part of GATE).

## Step 2 — rebuild the gate exactly to your spec
- STFT with Hann window, 1024-point frames, 75% overlap, correctly normalised overlap-add.
- Per bin: magnitude from real and imaginary parts; the same gain applied to both (phase kept).
- Threshold relative to the strongest bin of each frame, using your calibration, interpolated smoothly:
  0% bypass, 25% at -40 dB, 50% at -25 dB, 75% at -12 dB, 100% at -3 dB.
- Soft transition around the threshold (smooth knee about 6 dB wide) instead of the current hard open/close chatter.
- Threshold and per-bin gains smoothed over time so nothing clicks.
- Remove the GATE-linked level boost, so GATE changes harmonic content, not loudness.
- Nothing else in the synth changes (bars, TIGHT, BLUR, SHIFT, BITE, envelopes, LFO, chords).

## Step 3 — screen shows the real bins
The SPC page draws the processor's actual retained vs suppressed bins (sent from the gate a few times per second, drawn with the existing capped screen redraw), replacing the current estimate from bar heights.

## Step 4 — verification
- Test: a signal with several tones at different levels; FFT measurements at GATE 0/25/50/75/100% show weak tones disappearing in order of level while the strongest stays, and GATE 0 equals the input.
- Test the calibration points numerically.
- Browser check that the live SPEC pad produces the same spectrum changes.

## Technical details
- `src/audio/specSynthWorklet.ts`: hop 256, window-sum normalisation, `thrDb(gate)` piecewise-linear over the calibration table, soft knee gain `g = smoothstep((dB - thr + 3)/6)`, attack/release smoothing on per-bin gain, threshold smoothed per frame; posts a downsampled 64-bin retained/suppressed mask via `port` at ~15 Hz when requested.
- `src/audio/spectral.ts`: remove makeup `mk` gain tied to gate; keep pooling; expose latest mask per slot for the screen.
- `src/components/CyberspacePanel.tsx` SPC drawing: read mask instead of bar-height estimate.
- Update `src/audio/specSynth.test.ts`, `src/audio/AGENTS.md` SPEC GATE rule, roadmap.md.
