# REESE gun-fingers visual

Replace the RSE waveform drawing with **two mirrored gun-fingers hands**: the familiar DnB and dubstep salute, rendered in the existing crisp 1-bit pixel style.

## Visual and reaction

- Two recognisable hand silhouettes with extended fingers, raised thumbs and folded remaining fingers, angled upward toward the centre.
- **DET:** changes the separation between the extended fingers within a small, readable range.
- **DRFT:** introduces a slight difference in the hands’ angles.
- **WID:** spreads the two hands farther apart.
- **SUB:** builds thicker, denser bass-pressure marks beneath the hands.
- Keep the gesture recognisable at every setting; constrain movement so hands and marks never collide with the frame or controls.

## Preserve

Keep the screen’s header, tabs, border, dimensions, DET / DRFT / WID / SUB knobs, themes and other pages unchanged. No new labels, glow or gradients. No changes to REESE sound, swing, saved settings or performance routing.

## Technical details

Implement the hands as small pixel silhouettes in the existing RSE drawing path in `EnsemblePanel.tsx`, using a focused drawing helper if needed. Draw only when settings change through the existing screen lifecycle; do not add timers, continuous animation, audio analysis or sound processing. Use the active screen palette rather than a fixed image, so every display theme remains consistent.

## Verification

Check all four controls at minimum, default and maximum values, including combined extremes. Inspect the actual screen on phone and desktop for recognisable hands, crisp pixels, clear margins and unchanged controls. Verify MIDI-driven changes update the drawing, saved-set recall restores it, and pad playback remains functional. Test drawing bounds and confirm no new recurring visual work is introduced.