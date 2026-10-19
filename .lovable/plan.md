# Show knob values on GEN and sampler screens

## Problem
On GEN (BRKS/RAND/PHRS/ROLE) and on the sampler (SMP/ENV/GRN/BRK/IN), the header has so many page tabs that the value text beside the screen name has no room, so turning DENS, FILL, VAR, CHNC, ROLL, or any GRN/BRK/IN knob shows nothing.

## Fix
Use the same approach as the drum screens: while you turn a knob, the header shows its name and value (for example `DENS 64%`) where the screen name normally sits. About 1.6 s after you stop, the name comes back.
- GEN: every knob on every tab.
- Sampler: every page, including GRN, BRK and IN.
- Values are shortened to fit, so the tabs always stay visible and can be tapped.

## Checks
- Browser check: turn DENS on GEN and a knob each on GRN, BRK and IN, then confirm the value appears in the header and the tabs stay visible.

## Technical details
- `HwScreens.tsx` GenScreen `<Panel>`: add `compactReadout`.
- `WispdiskPanel.tsx` sampler `<Panel>`: add `compactReadout` (plus `parseReadout` if it fits easily, so you can type exact values like on the drums).
- No changes to the audio or the generator.
