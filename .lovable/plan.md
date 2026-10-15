# Mode-switch labels, 303 pops, and sequencer restoration

## 1. Investigate and fix the intermittent 303 pop
- Focus first on **sequencer playback with acid drive**, where you hear it most.
- Repeat a controlled pattern with acid drive bypassed and enabled, then compare ordinary hits, accents, slides, short gates and rapid retriggers. Include several pattern loops to catch intermittent faults.
- Diagnose before changing the sound. The cause is **not confirmed**: the current 303 code includes pooled filter resets sent by message, abrupt filter-envelope starts and short note fades; the distortion path also needs checking for discontinuities and DC offsets.
- Fix the confirmed source with audio-clock-safe transitions, smoothing or reset timing as appropriate—not by hiding the problem with a slower, duller attack.
- Preserve the 303's squelch, accents, slides, mono release behaviour and the existing acid-drive tone. No new distortion redesign.
- Verify using captured audio, targeted regression tests and a listening check. If listening cannot be completed, report that explicitly rather than calling the sound ear-tested.

## 2. Make instrument switches name the destination
- **808 mode → button says ACID; ACID mode → button says 808.**
- **Additive synth → button says SPEC; spectral synth → button says ADD.**
- Keep the already-correct **Siren → LASER; Laser → SIREN** convention.
- Audit other instrument-mode toggles and apply the same destination convention to direct switches, including FM/MIX where appropriate. Leave waveform selectors and page tabs as current-value indicators.
- Keep existing switch positions, settings retention and sounds unchanged. Accessible names must describe the destination too.

## 3. Restore the previous sequencer interaction, with properly spaced row keys
- Remove the new RND mode that changes what tapping a row name does, and restore the **LEN** header.
- Restore a dedicated **· / X / S** key on every row: normal, excluded from RAND, or solo for RAND.
- Give these keys their **own aligned column**, with consistent width, clear gaps and a usable touch area—not a tiny button squeezed into the name or length cell.
- Keep row-name audition/selection and double-tap clearing independent from the randomizer keys. Length controls keep their own column.
- Align header and row columns on every page; account for the extra modulation-target column on MOD. Sideways scrolling must not make buttons overlap or taps hit the wrong control.
- Preserve existing RAND rules: any solo means only soloed rows change; without solos, excluded rows stay untouched. This applies to NOTE, VEL, CHNC, ROLL and the active MOD lane.
- Verify at **393px phone width** and desktop: normal and sideways-scrolled grid, length edits, row audition, step edits, and single/multiple-row RAND selection.

## Technical details
- Audio investigation: `src/audio/acid.ts`, the ACID scheduling/retrigger path, and the acid effect in `src/audio/effects.ts`. Treat reset timing, envelope transitions and curve updates as hypotheses until tests identify the cause.
- Destination labels: instrument panels, primarily `Sub808Panel.tsx` and `CyberspacePanel.tsx`; preserve Siren's correct behaviour.
- Sequencer: `Groovebox.tsx` and shared sequencer styles in `src/index.css`. Reuse existing per-slot `rnd` state and randomizer filtering; do not change pattern storage or saved sound data.
- Add focused regression coverage, check preview errors, and record any changed structural rules in the relevant `AGENTS.md`. Update the roadmap without adding factory patches, REST recording or other pending features to this task.

## Completion criteria
- Instrument-switch text names what the next tap opens.
- The 303 pop is reproduced and its confirmed source addressed, with test and listening status reported honestly.
- Sequencer row keys are clearly separated from names and lengths, and the central edit/RAND flow works on phone and desktop.