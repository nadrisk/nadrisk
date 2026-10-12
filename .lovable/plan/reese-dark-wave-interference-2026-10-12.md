# REESE: dark wave interference

Replace the gun-fingers drawing with a deep, moody bass visual: two heavy overlapping pixel waves, with a low sub line beneath. No hands, symbols, or extra text.

## Visual behaviour
- **DET:** separates the waves' phase, revealing interference and beating.
- **DRFT:** offsets their contours slightly for an unsettled, organic feel.
- **WID:** spreads the two traces vertically, from tightly merged to clearly separated.
- **SUB:** strengthens the low, broad sub line beneath them.
- **Sound reaction:** actual pad output adds restrained expansion to the waves; silence settles back to the control-defined drawing. Reduced-motion mode keeps the contours stationary while indicating level.

Keep the existing screen border, dimensions, header, tabs, knobs and theme colours. The drawing stays crisp, monochrome and recognisable across all control extremes—no glow, gradients or decorative animation.

## Technical scope
Replace the current hand renderer in the RSE drawing path. Reuse the existing slot analyser, smoothed level and capped, visibility-gated redraw mechanism; do not add audio processing, audio nodes or per-frame React updates. These are stylised interference contours, not a claim to show the exact output waveform.

Keep REESE audio, POLY, swing, MIDI controls and saved settings unchanged. Update the visual tests and project guidance to replace the rejected hand direction.

## Verification
Check default, minimum, maximum and combined control settings; audible reaction and silence settling; drawing bounds; phone and desktop appearance; hidden-page gating; and rapid pad taps with the drawing visible versus hidden. Report any remaining uncertainty on a real iPhone.