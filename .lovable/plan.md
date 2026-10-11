# Remove flashes when switching instruments

## Goal
Make rapid pad/instrument switching on iPhone feel stable, without changing sound, selection behavior, or the groovebox layout.

## Confirmed cause
The recording shows the selected pad briefly becoming a solid white block. The current styles invert a pad both while it is physically pressed and for a 90 ms playback flash; selecting another pad updates the instrument editor at the same time. This makes rapid device switching look like a screen flash even though selection is working.

## Changes
1. Separate **selection feedback** from **playback feedback** on the 16 pads.
   - Keep the selected pad visible with the existing inset outline.
   - Replace the full solid-white press/play inversion with a restrained border or inner marker.
   - Preserve velocity mode, muted styling, and sequencer-trigger feedback.
2. Stabilize the instrument editor during selection changes.
   - Keep the existing editor frame and dimensions in place while its controls update.
   - Prevent broad pressed-state styling from visually inverting unrelated editor controls during an iPhone tap.
3. Leave audio triggering, pad sustain/release, MIDI, the sequencer, and all instrument parameters untouched.

## Verification
- Test rapid switching across all 16 pads with an iPhone-sized touch browser.
- Confirm each tap selects and sounds the intended pad exactly once.
- Confirm no full-white pad or editor flash appears.
- Confirm the selected-pad outline, muted pads, velocity display, and sequencer playback indicators still work.
- Check the preview build and browser console before completion.
