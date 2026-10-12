# REESE gun-fingers visual

Replace the RSE waveform drawing with **two mirrored gun-fingers hands**: the familiar DnB and dubstep salute, rendered in the existing crisp 1-bit pixel style.

## Visual and reaction

- Two recognisable hand silhouettes with extended fingers, raised thumbs and folded remaining fingers, angled upward toward the centre.
- **DET:** changes the separation between the extended fingers within a small, readable range.
- **DRFT:** introduces a slight difference in the hands’ angles.
- **WID:** spreads the two hands farther apart.
- **SUB:** builds thicker, denser bass-pressure marks beneath the hands.
- **Sound reaction:** the selected REESE pad’s actual output adds a small upward kick to the hands and brightens the pressure marks as bass sounds. Smooth the return to rest, keeping movement restrained rather than jittery. Silence returns them to their parameter-defined pose.
- Keep the gesture recognisable at every setting; constrain movement so hands and marks never collide with the frame or controls.

## Preserve

Keep the screen’s header, tabs, border, dimensions, DET / DRFT / WID / SUB knobs, themes and other pages unchanged. No new labels, glow or gradients. No changes to REESE sound, swing, saved settings or performance routing. Respect reduced-motion preferences by keeping the hands stationary while the pressure marks indicate sound level.

## Technical details

Implement the hands as small pixel silhouettes in the existing RSE drawing path in `EnsemblePanel.tsx`, using a focused drawing helper if needed. Reuse the existing per-slot post-pan analyser through `getSlotWave` to calculate a smoothed output level from a reusable buffer; no new audio nodes or sound processing. Limit sound-reactive redraws to about 15–20 frames per second, only while the RSE page is visible and the document is active, using the existing visual gating conventions. Avoid whole-panel React updates for each audio reading, and settle to idle during silence. Use the active screen palette rather than a fixed image, so every display theme remains consistent.

## Verification

Check all four controls at minimum, default and maximum values, including combined extremes. Inspect the actual screen on phone and desktop for recognisable hands, crisp pixels, clear margins and unchanged controls. Verify MIDI-driven changes update the drawing, saved-set recall restores it, and pad playback remains functional. Check audible notes produce restrained movement, silence settles, and hiding the page stops sound-reactive work. Test drawing bounds and compare rapid pad taps with the visual visible and hidden on a throttled browser; report the remaining uncertainty on a real iPhone.