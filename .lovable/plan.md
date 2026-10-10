# Fill the instrument workspace — no dead space around screens

## What you see now
The slot workspace is a loose grid: each screen (SLOT, INSERT EQ, the instrument screen, CHORD, LIBRARY) is a fixed-size 128×64 display scaled by a whole number. When the column is wider than the display, black empty space piles up on the right of each screen and below the shorter column, so the panels look like floating windows instead of one faceplate.

## The fix

1. **Screens stretch to their column.** Every screen's frame (bezel) fills the full width of the grid cell it lives in. The 128×64 pixel display inside scales up to the largest whole number that fits that width and centers itself, so the picture stays crisp but the frame always reaches the cell edges — no black gaps beside a screen.

2. **Balanced two-column arrangement.** The workspace becomes a clean two-column faceplate on wide screens:
   - Left column: SLOT screen, then INSERT (EQ) below it.
   - Right column: the instrument screen (drum/synth/sampler/808/siren/poly), with CHORD and LIBRARY below it when they apply.
   Both columns are exactly the same width, and the whole block lines up with the pad rack edges above it. On phones everything stacks in one column and each display scales up to fill the phone's width.

3. **Even heights.** Columns stretch so the left and right stacks end at the same bottom edge where possible, instead of one column stopping early and leaving a void.

## Technical details
- `src/index.css`: `.gb-editor-body` grid becomes an explicit 2-column layout (1fr 1fr) on wide screens, 1 column under ~700px; `.px-wrap` gets `justify-content: center` and the bezel border moves to the cell so the frame is full-width; columns use `align-items: stretch` with the screen wrappers as flex columns that grow.
- `src/pixel/PixelScreen.tsx`: scale factor computed from the actual cell width (`Math.max(1, Math.floor(cellWidth / 128))`) via the existing resize observer, so the display always picks the largest crisp integer scale for the space it has.
- No changes to audio, sequencing, MIDI, saved sets, or any screen's internal layout.

## Check before done
- Typecheck passes.
- Browser check at desktop, tablet and phone widths: SLOT/INSERT left, instrument right, frames touch their column edges, no black gaps, displays still crisp, no page errors.
