# Make ties clearly visible on the selected sequencer row

## What's happening

Ties are being written correctly — the problem is purely how they look in the pixel (1-bit) theme:

- A hit step is solid white (`.gb-step.on` → `background: foreground !important`).
- A tie step is meant to show as thin vertical stripes, but the stripe pattern is 2px lines on a tiny cell, so at small sizes it reads as solid white — identical to a hit.
- The tie's "open left edge" (`border-left-color: transparent`) is overridden by the pixel theme's `border: 1px solid foreground !important`, and the little bridge bar that connects a hit into its tie (`tie-next::after`) is white-on-white, so it disappears.
- Result: on the selected row everything looks uniformly white and the tie lines are invisible, giving the impression ties aren't added.

## Changes (CSS only, `src/index.css`)

1. **Stronger tie pattern in pixel theme:** make the tie stripes bolder (e.g. 3px on / 3px off) so they read clearly even on the smallest cells, in all pixel themes (OLED, LCD, acid).
2. **Restore the open left edge:** add a pixel-theme rule so a tie step's left border is transparent (matching specificity with `!important`), visually merging it with the hit before it.
3. **Visible tie bridge:** keep the `tie-next::after` connector but ensure it renders in the pixel theme (it currently inherits accent color which maps to white-on-white next to a solid hit — give it the same foreground fill so the connection reads).
4. Verify in the non-pixel "studio" theme too, so ties stay distinguishable there.

## Out of scope

- No changes to tie logic, tap handling, scheduling, or any audio code.
- No layout changes to the sequencer grid.

## Verification

- Typecheck + build.
- Simulated phone browser: write a hit followed by a tie on the selected row, screenshot the grid, confirm the tie is visually distinct from a hit in each theme.
