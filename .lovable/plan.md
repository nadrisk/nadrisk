# Groovebox-only site with built-in ABOUT button

## What changes
- The site shows only the groovebox: the top navigation bar, the About section below it and the footer are removed from the page.
- A new **ABOUT** key sits in the groovebox's top strip, next to DISP, styled like the other keys.
- Tapping ABOUT opens a pixel-style hardware screen on top of the groovebox. It shows your logo, a heading and your bio, in the current DISP theme. A CLOSE key (or the Escape key) closes it. Sound keeps playing while it is open.
- The iPhone app gets the ABOUT key too. Tell me if you'd rather keep it out of the app.

## Unchanged
- How the instrument sounds and behaves, its themes, and the boot-on-`-1` behavior.

## Technical details
- `src/pages/Index.tsx`: render only `<Groovebox>` inside the themed shell.
- `src/components/Groovebox.tsx`: add an `about` open state, the ABOUT `gb-cycle` button and an overlay dialog that reuses the `AboutSection` content.
- `AboutSection.tsx`: change it to work as dialog content. `Navbar` and `Footer` become unused and get deleted.
- Update the site-layout rule in AGENTS.md.
