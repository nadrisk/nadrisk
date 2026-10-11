# Fix device frames without cropping the screens

## Goal
Keep the neat, uniform light chassis around every desktop device without taking any space away from its controls or pixel display.

## Fix
- Remove the 5-pixel internal frame padding and the cell-level clipping that currently crops the right and bottom edges of the fixed 128×64 screens.
- Give every device one identical outer chassis frame and one identical inner screen frame, with the same measured thickness and inset across SLOT, instrument, INSERT, optional panels, and all six DEVICES panels.
- Draw the outer frame without consuming the device’s usable dimensions, then reserve one consistent inner inset around the full screen instead of placing padding inside an already fixed-size cell.
- Keep neighbouring devices flush together; shared outer edges will visually read as one line rather than creating thick seams, while the inner frame remains visibly separate and uniform.
- Size each framed cell from the complete desktop pixel screen at its fixed scale, instead of fitting that screen inside a smaller padded opening.
- Apply the same non-cropping frame rule to SLOT, instrument, INSERT, optional CHORD/LIBRARY, and the six DEVICES panels.
- Keep the mixer, SEQ / PERF layout, phone layout, audio behavior, screen drawings, and removed VIS state unchanged.

## Verification
- Check the uploaded screenshot’s problem areas: INSERT’s right labels, PHRASE’s bottom controls, TAPE’s lower row, MIDI’s right edge, and all knob labels.
- Check both sampler and non-sampler layouts on laptop and wide desktop sizes.
- Confirm every device remains equal in size, inner and outer frame measurements match across all cells, no frame creates gaps or double-width seams, and all controls remain clickable.
- Confirm phone layout is unchanged and the preview has no clipping, overflow, runtime, or build errors.

## Technical details
- Replace desktop cell `padding` and foreground `background` framing with a shared two-layer chassis treatment: a non-layout outer outline plus a consistently inset inner frame.
- Remove `overflow: hidden` from the shared outer cells; retain clipping only inside components that intentionally need it.
- Use the existing semantic foreground/background tokens and fixed desktop pixel scale.
