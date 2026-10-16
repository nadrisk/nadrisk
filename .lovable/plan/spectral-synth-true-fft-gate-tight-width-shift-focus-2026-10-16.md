# Spectral synth: true FFT GATE, TIGHT width, SHIFT focus

The synth becomes a modern, controlled FFT spectral synth. GATE is a real frequency-domain spectral gate, like the spectral~ effect. Each band's bar height decides how far its partials sit above the gate, so lowered bars are the first to turn thin, unstable and then into spectral fragments.

## GATE: real FFT spectral gate
- Every note runs through an FFT (frequency analysis) gate. Each frequency bin opens or closes on its own, depending on its magnitude.
- The gate threshold is relative to the note's own loudest partial, so GATE behaves the same at any volume or pitch.
  - GATE 0: nothing is gated (clean).
  - Mid GATE: quiet partials and noise flicker at the edge of the threshold, sounding thin and unstable with that glassy FFT shimmer.
  - High GATE: only the strongest partials survive, leaving spectral fragments with crystalline decay.
- Bars set band loudness before the gate, so a full bar stays stable and clear while a lowered bar fragments first. You "play" the spectrum by drawing bars.
- No rhythm and no random choppers: every effect comes from the FFT gate reacting to magnitude.

## TIGHT: band width
- High TIGHT: each band is a thin, focused strip, so only frequencies right at the band pass (glassy, whistling).
- Low TIGHT: bands are wide, so more frequencies are caught (thick and full).
- TIGHT no longer shapes per-band plucks or swells; note shape comes only from the ENV page.

## SHIFT: move the focus
- SHIFT moves every band together (±2 octaves) and glides live while a note is held.

## Screen
- The BND bars show where each band sits against the gate threshold: solid above it, dotted near it, gone below it.

## Technical details
- Add `nad-specsynth` to the shared worklet bundle: 1024-point FFT, hop 256. Per frame it finds the peak bin magnitude and sets threshold = peak · 10^(-(1 - gate) · 60 / 20) (GATE 0 bypasses). Per-bin gain uses a fast open and a release of 0.25 − 0.2·gate s, with ±3 dB hysteresis so bins near the threshold chatter. That chatter is the "unstable" sound. Same pooling as now (max 12 per context, reused after the voice ends).
- `spectral.ts`: TIGHT → bandpass Q 2–40 (log), BLUR keeps its detune/noise role. Remove the tight-based attack/decay/sustain. Use a makeup gain that follows the energy removed. `update()` glides SHIFT, Q and the gate parameter.
- Older sets load unchanged (same keys).
- Tests: GATE 0 output ≈ ungated; at GATE 1 a quiet band is gated out while a full band remains (offline FFT check).
- Record the worklet in `src/audio/AGENTS.md`, replacing the old SPEC GATE rule. Add this task to roadmap.md.
