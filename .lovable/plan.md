# Restore drum knob feedback

## Confirmed cause
The added PRST tab leaves only 39 pixels before the drum screen's tabs. The shared header reserves 40 pixels for the pad name, leaving zero characters for the parameter readout. Knob changes still update the screen, but their label and value are clipped away.

## Fix
- Keep all six drum pages, presets, screen size and existing pixel styling.
- During a drum knob adjustment, use the left header space for the parameter label and complete formatted value instead of the pad name. Keep page tabs visible and usable.
- Restore the pad name after a short pause. Show feedback on drag, double-tap reset and MIDI changes.
- Leave the existing parameter-linked drawings and knob indicators intact; verify they redraw with edits.
- Do not change drum sounds, presets, reset values, saved sets, ACID, REESE or sequencing.

## Technical details
Add an opt-in compact readout behaviour to the shared panel/header, enabled only by the drum panel. Measure available text width rather than relying on the fixed name reservation. Use a single resettable timeout for returning to the pad name, not an animation loop or audio polling.

## Verification
- Check every drum page's knob labels and values at minimum, default and maximum, including signed pitch values, frequency units and envelope times.
- Confirm drag, reset and MIDI feedback, page navigation and preset selection still work.
- Inspect phone and desktop screen framing for readout/tab overlap.
- Add a regression test for six-tab header layout and run relevant tests plus preview compilation checks.