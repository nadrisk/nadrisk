# Sequencer refurbish: piano-roll look, 1-bit hardware style

Goal: keep the 16-pad step sequencer and its behaviour, but make it read like a piano roll. Flat 1-bit look stays: square corners, no glow, no gradients, no animation beyond the playhead.

## What changes on screen
1. **Solid notes** - a held note becomes one unbroken bar from start to end. Today it is separate boxes joined by small bridges. The start is a solid head, the held part is a solid body, and the right edge has a two-line grip `||` (the drag handle that already exists).
2. **Pitch in the note head** - on SYN, BAS and pitched SMP rows, the head shows the note name (C2, F#3) when there's room. Drums show nothing.
3. **Quieter empty steps** - empty steps get a faint hairline outline so lit notes stand out.
4. **Time ruler** - a thin row above the grid marks beats `1.1 1.2 1.3 1.4`, then `2.1`... on the 17-32 page, with small 16th ticks.
5. **Beat shading** - every other beat's columns get a slightly different fill, and each beat has a stronger divider line.
6. **Full-height playhead** - one 1px vertical line runs through all rows. Notes it passes over invert. This replaces the current-step outline.
7. **Velocity/chance/mod stems** - in those views each lit step shows a thin stem with a square cap at its level, not a full-box fill. Held steps show a faint line back to their stem.
8. **Row badges and flashes** - drum rows show a short badge (KCK, SNR, HAT, PRC). Pitched rows show the root note. The row label inverts for one frame when that row triggers.

Works in all five themes and on phones. On phones, note names and badges hide when steps are too narrow, and the right-side grab area stays as it is.

## Not changing
How notes play, what is saved in sets, drag lengths, COND/NUDG editing, the AV tracker.

## Technical details
- Groovebox.tsx: add head/body/tail classes from the existing tie encoding through noteSpan.ts. Remove the `.tie-next::after` bridges, and close the gap between steps that belong to one note.
- The ruler and the beat shading are pure CSS/markup on the existing grid columns (`beat`/`group` classes).
- The playhead is one absolutely positioned element inside the grid with `mix-blend-mode: difference`. It moves by column from the existing `cur`, with no per-frame React updates beyond the current step changes.
- Stems: replace the fill in vel/chance/mod views with a pseudo-element stem.
- Row flash: write a data attribute to the DOM from the existing trigger path, cleared on the next frame, without re-rendering the mixer or grid.
- index.css: theme-token-only colours, with overrides for the non-studio LCD themes like the existing `.tie` rules.
- Check with Playwright at 1280 and 393 widths in every theme. Note lengths, playhead and stems must stay correct during playback.
