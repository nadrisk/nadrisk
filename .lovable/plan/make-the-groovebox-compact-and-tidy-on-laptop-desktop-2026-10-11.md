# Make the groovebox compact and tidy on laptop/desktop

## Diagnosis

Every instrument screen is a fixed 128×64 pixel canvas scaled up by a whole number to fill its container (`PixelScreen.tsx`: scale = floor(containerWidth / 128), clamped 2–8).

- On a phone (~360px column) the scale lands at 2–3 → screens are ~256–384px wide. Looks right.
- On a laptop the editor column is 700–900px wide → scale 6–8 → each screen is 768–1024px wide and 384–512px tall. That is the "overkill, clunky" look in your screenshots: one INSERT or STEPSEQ screen fills most of the monitor, and the modules stack into an endless tall column.

Pixels stay crisp at any whole-number scale, so the fix is about capping growth and packing modules tighter on wide screens — no redraw of screen contents, no audio changes.

## Plan

1. **Cap the pixel scale on wide screens.** In `PixelScreen.tsx`, lower the max scale from 8 to 5 (640px wide, 320px tall) on desktop-sized windows. Phone behavior (scale 2–3) is untouched. Screens center inside their panels instead of stretching edge to edge.
2. **Constrain the overall workspace width.** `.instrument-workspace` currently spans ~92% of the window with no max width. Add a `max-width` (~1150px) with auto margins so the groovebox sits as a centered hardware unit on big monitors.
3. **Pack modules closer together on desktop.** With the scale cap in place:
   - The secondary screens row (`.gb-ed-sub`) already auto-fits; it will naturally pack 2–3 screens per row instead of each becoming a giant.
   - Reduce the large gaps/padding in the desktop grid (`.gb-grid` gap and padding) so modules sit shoulder-to-shoulder like a real rack.
   - Where a panel is mostly empty space at desktop width (e.g. the SLOT panel in your screenshot with a big blank area under the buttons), let it size to its content instead of stretching.
4. **Keep ordering logical.** No reordering needed for function, but if any module looks stranded after packing, minor order adjustments within the same column are allowed to keep the rack tidy.

## What does not change

- Phone and tablet layout — scales there are already 2–3, below the new cap.
- Screen contents, hit zones, MIDI learn labels, themes, audio — only the integer scale factor, page width, and desktop spacing change.
- The 1-bit pixel look — scaling stays whole-number nearest-neighbour, so pixels stay perfectly square.

## Technical details

- `src/pixel/PixelScreen.tsx`: width-aware scale cap (e.g. `window.innerWidth >= 1024 ? 5 : 8`), recomputed on resize via the existing ResizeObserver.
- `src/index.css`: `max-width` + `margin-inline: auto` on `.instrument-workspace` under `@media (min-width: 1280px)`; tighten `.gb-grid` gap/padding on desktop; let stretched panels size to content.
- Verify with Playwright at 1440×900 and 390×844 (phone) that screens render at intended scales, nothing overflows, and the rack looks tidy.
