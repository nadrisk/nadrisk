# Make groovebox screens compact on laptop/desktop

## Diagnosis

Every instrument screen is a fixed 128×64 pixel canvas that is scaled up by a whole number to fill whatever width its container gives it (`PixelScreen.tsx`: scale = floor(containerWidth / 128), clamped 2–8).

- On a phone (~360px column) the scale lands at 2–3 → screens are ~256–384px wide. Looks right.
- On a laptop the editor column is 700–900px wide → scale 6–8 → each screen is 768–1024px wide and 384–512px tall. That is the "overkill, clunky" look in your screenshots: one INSERT or STEPSEQ screen fills most of the monitor.

The pixels stay crisp at any whole-number scale, so the fix is purely about capping how big screens are allowed to grow on wide screens — no redraw of any screen content, no audio changes.

## Plan

1. **Cap the pixel scale on wide screens.** In `PixelScreen.tsx`, lower the maximum scale from 8 to 5 (640px wide, 320px tall) when the window is desktop-sized. Phone behavior (scale 2–3) is untouched. Screens then center inside their panel with the existing `.px-wrap` centering instead of stretching edge to edge.
2. **Constrain the overall workspace width on large monitors.** `.instrument-workspace` currently spans ~92% of the window with no max width, so on a 1920px monitor everything inflates. Add a `max-width` (around 1100–1200px) with auto margins so the groovebox sits as a centered hardware unit on big screens, like a real device on a desk.
3. **Let the sub-screens sit side by side sooner.** The secondary screens row (`.gb-ed-sub`) already uses `auto-fit minmax(240px, 1fr)`; with the scale cap they will naturally pack 2–3 per row on desktop instead of each becoming a giant.

## What does not change

- Phone and tablet layout — scales there are already 2–3, below the new cap.
- Screen contents, hit zones, MIDI learn labels, themes, audio — the cap only changes the integer scale factor and page width.
- The 1-bit pixel look — scaling stays whole-number nearest-neighbour, so pixels stay perfectly square.

## Technical details

- `src/pixel/PixelScreen.tsx`: change the scale clamp from `Math.min(8, …)` to a width-aware cap (e.g. `window.innerWidth >= 1024 ? 5 : 8`), recomputed on resize via the existing ResizeObserver.
- `src/index.css`: add `max-width` + `margin-inline: auto` to `.instrument-workspace` inside a `@media (min-width: 1280px)` block; verify `.gb-ed-sub` packing afterwards.
- Verify with Playwright at 1440×900 and 390×844 (phone) that screens render at the intended scales and nothing overflows.
