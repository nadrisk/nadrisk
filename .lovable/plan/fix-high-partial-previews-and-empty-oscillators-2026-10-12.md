# Fix high-partial previews and empty oscillators

## Confirmed issues
- The 22-pixel preview currently includes only harmonics 1–10. Drawings containing only harmonics 11–16 therefore appear flat, although those harmonics are present in the audio.
- Both the preview and additive audio deliberately substitute a sine when all partials are zero.

## Changes
1. **Represent every partial.** Reconstruct all 16 harmonics and draw their sampled excursions within the existing tiny preview. Use per-column min/max coverage for detail too fast for a single pixel-height sample, rather than dropping it or showing a misleading aliased wave. Keep the cleaner low-harmonic shapes and crisp 1-bit style.
2. **Empty means silent.** Remove the sine fallback from additive O1 and O2. Clearing all bars produces a flat preview and silences that oscillator. The other oscillator and noise remain independent; an empty FM oscillator contributes no modulation.
3. **Preserve everything else.** Keep screen dimensions, controls, partial recipes, themes, MIDI, sequencing and nonempty patch sounds unchanged. Saved patches with explicitly empty additive partials will now be silent for that oscillator—this is the intended behavior change.

## Technical details
- Update the cached preview helper and its drawing integration to support all 16 harmonics, using oversampled column coverage where necessary; no continuous rendering loop or additional audio processing.
- Remove the all-zero sine substitution in `partialWaveInfo`, ensuring zero coefficients render silence safely and FM scaling remains finite.
- Apply the same behavior independently to O1 and O2, including older O2 patches that inherit O1 partials.
- Update tests and the architecture note during implementation.

## Verification
- Test each isolated harmonic 1–16, especially 11–16, and the high-only combinations in the screenshots: every nonempty recipe must produce a visible, bounded preview.
- Verify empty O1/O2 previews are flat; render audio to confirm silence when both oscillators are empty and noise is off, and no FM contribution from an empty O2.
- Compare SINE/TRI/SAW/SQR and custom drawings on desktop and iPhone-sized screens; verify saved-set recall and rapid pad taps without new lag or errors.
- Run existing tests and check preview diagnostics, then pause for visual review and listening confirmation.

**Out of scope:** textbook triangle phase changes, other instruments, effects, layout redesigns, and unrelated audio changes.