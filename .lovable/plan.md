# Reverb and OTT visual revision

## Goal
Replace the two remaining generic effect displays with clearer 1-bit visual instruments while preserving every other effect, screen, and groovebox behavior.

## Reverb
- Add a **DENS** control to the existing SIZE, DAMP, and MIX controls.
- Make DENS audibly change the reverb texture rather than acting as display-only decoration, while keeping the current reverb stable at minimum, neutral, and maximum settings.
- Replace the floating particle cloud with a fixed dot field contained inside the display frame.
- **SIZE** progressively fills the available frame area with illuminated dots.
- **DENS** changes the spacing and number of dots inside that area.
- **DAMP** shapes the high-frequency portion of the field, and **MIX** reflects the wet contribution without inventing unrelated motion.
- Keep all dots aligned to the pixel grid with clear margins and no overlap with labels.

## OTT
- Replace the current transfer-curve display with a large outlined **OTT** word in the same hard-pixel language as the METAL screen.
- Keep the complete letter outlines visible at all times.
- Fill the letter interiors progressively according to the **DEPTH** control, from empty at zero to fully illuminated at maximum.
- Preserve OTT audio behavior and its current controls; this is a display change only.

## Compatibility and verification
- Preserve older saved sets by supplying a neutral default for the new reverb DENS value when it is absent.
- Check reverb audio and visuals at minimum, neutral, and maximum SIZE/DENS combinations.
- Check OTT fill at 0%, 50%, and 100% DEPTH.
- Run the existing checks, confirm the project builds, then inspect both screens in the live groovebox at the current phone-sized view and on desktop.
- Stop after these two changes for visual approval and a reverb ear test.

## Technical details
- Extend the existing reverb parameter definition and processing path rather than adding a separate effect.
- Derive both displays only from real effect parameters and live effect state.
- Keep rendering within the existing fixed 128×64 pixel canvas and its current frame/update system.
