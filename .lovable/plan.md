# Compact desktop groovebox layout

## Goal
Replace the newly added left-to-right desktop rail with a tidy top-to-bottom rack that uses horizontal groups inside each row. Keep the current phone layout and every instrument/audio behavior unchanged.

## Desktop arrangement

```text
[ DRUM RACK — full width ]

[ SLOT ][ INSTRUMENT ][ INSERT ]

[ UTILITY SELECTOR — full width ]
[ DEVICE 1 ][ DEVICE 2 ][ DEVICE 3 ]

SEQ / PERF view:
[ STEP CONTROLS ][ PERFORMANCE CONTROLS ]
[ A–D PATTERNS + PAD MUTES + MUTE RESET ]
[ FULL-WIDTH 16-STEP SEQUENCER ]

MIX view:
[ FULL-WIDTH 16-CHANNEL MIXER ]
```

## Changes
- Restore the desktop groovebox to a centered vertical flow rather than a horizontally scrolling rail.
- Keep the drum rack full width at the top.
- Split the selected-pad editor into three natural-size, equal-width desktop devices: slot routing, the selected instrument, and insert effects. Remove the large enclosing dividers that currently make them look vertically stacked; retain only crisp device-edge separators.
- Place the utility selector beneath that row and keep it full width.
- Show compact utility content as groups of three natural-size devices in one horizontal row. Navigation changes which three-device group is visible without stretching the pixel screens.
- Give SEQ/PERF a dedicated wide composition: step controls beside performance controls, the shared A–D/mute performance strip immediately below, and the 16-step grid below that across the available width.
- Let MIX use the full desktop width for all 16 channels.
- Keep FX and other larger utility views within the same aligned rack width rather than enlarging their internal 128×64 screens.
- Remove the desktop-only 1600px minimum width and horizontal page scrolling introduced by the previous rail layout.

## Safeguards
- Apply the rearrangement only to fine-pointer desktop widths; preserve the current stacked phone/tablet layout.
- Reuse the existing controls and state instead of duplicating them, especially performance mutes, A–D banks, transport, and sequencer editing.
- Do not change audio, saved sets, MIDI labels, touch behavior, or pixel-screen contents.
- Verify at laptop and wide-desktop sizes that rows align cleanly, then verify an iPhone-sized view remains unchanged and the SEQ/PERF controls still operate.

## Technical details
- Refactor the current combined editor markup into desktop-addressable SLOT, INSTRUMENT, and INSERT regions while keeping the existing `SlotEditor` data flow.
- Separate the performance screen from its live strip at layout level so the strip can sit between the control row and `StepGrid` without creating a second stateful performance rack.
- Replace the desktop rail CSS grid with a centered, bounded rack and explicit three-column device rows; keep integer pixel scaling and natural device widths.