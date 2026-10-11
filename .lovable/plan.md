# Extend the groovebox hardware style across the site

## Direction
Make every public website element feel like part of the same 1-bit NAD hardware system as the groovebox: square construction, monochrome screens, pixel typography, compact labels, and no separate polished “website” styling.

## Changes
1. **Hardware-style top bar**
   - Rebuild the small NAD GROOVEBOX / About / Instagram bar as a groovebox header strip.
   - Use the same bitmap typography, square outlined keys, monochrome states, spacing, and border weight as the instrument.
   - Keep it compact so the groovebox remains the immediate focus.

2. **Full 1-bit About screen**
   - Turn the complete About area into a hardware panel attached visually to the groovebox.
   - Present the logo inside a compact monochrome display rather than the current large image tile.
   - Render the heading and biography with the same pixel font and screen hierarchy used inside the instrument.
   - Preserve the current short biography and logo; only its presentation changes.

3. **Matching footer and page edges**
   - Restyle the footer as a groovebox status strip with square dividers and pixel labels.
   - Remove remaining smooth website typography and spacious editorial styling from the public shell.
   - Keep the page monochrome and token-driven, using the current selected groovebox theme as the visual reference without changing the instrument itself.

4. **Responsive verification**
   - Ensure bitmap text remains readable without clipping at the current iPhone width.
   - Check that navigation keys, About copy, logo, and footer align with the instrument on desktop and phone.
   - Verify the groovebox controls, audio, native iOS-only view, and removed News page remain unchanged.

## Technical scope
- Presentation-only changes to the public navigation, About section, footer, and their styles.
- Reuse the existing logo and the project’s pixel fonts/tokens; no new imagery, routes, audio changes, or backend work.
- Do not apply the website shell to the Capacitor app, which remains groovebox-only.
