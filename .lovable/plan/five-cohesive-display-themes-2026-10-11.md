# Five cohesive display themes

## What will change
- Keep only five display choices: `1-BIT`, `BLUE`, `NEON`, `GREEN`, and `AMBER`.
- Remove the other legacy display choices from the selector while safely mapping previously saved themes to the closest retained option.
- Make the selected display theme color the complete public site: navigation, groovebox, About screen, footer, page background, borders, status marks, and logo treatment.
- Preserve the current square 1-bit hardware styling, bitmap typography, layout, controls, audio behavior, and native groovebox-only experience.

## Visual direction
- **1-BIT:** near-black screen with clean white pixels.
- **BLUE:** blue-grey 1980s LCD with dark navy pixels.
- **NEON:** black screen with vivid hot-pink pixels and restrained magenta surfaces.
- **GREEN:** very dark phosphor screen with classic terminal-green pixels.
- **AMBER:** deep warm-black screen with soft amber pixels for lower visual strain.

## Technical details
- Lift theme state to the page shell so one saved selection controls every public-site section and the instrument.
- Keep theme colors in semantic CSS variables and continue passing the selected palette into all fixed-resolution canvas displays.
- Validate selector cycling, persistence, canvas recoloring, and desktop/mobile page coverage without changing sound or sequencing code.