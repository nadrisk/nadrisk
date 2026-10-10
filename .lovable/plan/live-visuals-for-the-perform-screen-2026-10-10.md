# Live visuals for the PERFORM screen

Each page of PERFORM gets one framed picture that fills the space between the header and the knob row, edge to edge like the other screens. It redraws as you turn knobs. You can also touch it: dragging on the picture moves the main setting.

## FX page: DJ filter and tension
- A framed filter curve from the left border to the right border, sitting fully above the knobs so nothing overlaps.
- Turn DJ left and the curve becomes a lowpass, sloping down on the right. Turn it right and it becomes a highpass, sloping down on the left. At the center it is a flat line with a small "OFF" label.
- RES adds a visible peak at the cutoff point.
- A small LP/HP label and the cutoff frequency (for example "LP 1.2K") sit inside the top corner of the frame.
- TENS shows as a thin bar along the bottom of the frame. TIME shows as a small +/- marker.
- Interaction: drag left and right on the frame to sweep the DJ filter, and up and down to change resonance. Double-tap resets it to OFF.

## ECO page: dub echo
- The picture shows a series of repeat taps, like an echo display. The first tap is the original hit; each repeat after it is spaced by the echo TIME (1/16 up to 1/2 of a beat, drawn to scale across the frame).
- FDBK sets how fast the repeats fade, so you can see how many repeats you get. Above 100% the repeats grow instead of fading, with a "SELF" warning.
- SEND sets the height of the first repeat compared with the original hit.
- TONE: later repeats get thinner and dotted as the tone gets darker, like a tape losing its high end.
- A beat ruler with tick marks runs along the bottom, and the time division is shown inside the frame.
- Interaction: drag left and right to change the echo time (snaps to the divisions), and up and down to change feedback.

## SEQ page: loop and offset
- The text "0 STEPS / LOOP WIN / CAPT" is replaced by a 16-step strip: the active loop window is solid, the offset is shown as a shift arrow, and steps outside the loop are dotted.
- The loop keys and repeat-length keys stay, aligned across the full width.
- Interaction: drag on the strip to change the offset.

## HLD page
- Keys stay as they are. The bottom text line becomes a small status picture of what is held: a reverse arrow, stutter blocks or a tape-stop slope. It only shows while you hold a key.

## Technical details
- Only PerformanceRack.tsx changes. All visuals go in one shared frame (x 2–125, y 11–40) above the knob row (knobs at y 48).
- Visuals are drawn from the current settings, not from the live audio, so they react the moment a knob turns.
- Drag areas are invisible, labelled touch zones, like the other screens, so MIDI learn and the arrow keys keep working. Values go through the same setters as the knobs.
- No audio, sequencing, saved sets or MIDI changes.
- Before finishing: check every page in the preview at phone and iPad sizes and confirm nothing overlaps the knobs.
