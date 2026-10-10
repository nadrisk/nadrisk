# Fix the sequencer's VEL / CHNC / MOD / ROLL editing

## What's broken (confirmed in the current styles)
1. **Fill is invisible.** In VEL, CHNC, MOD and ROLL views, a lit step is drawn as a solid light box, and the level fill is drawn in that same light color. Dragging changes the value, but you can't see it.
2. **Dragging on a phone scrolls the page.** On touch screens, steps allow the browser to take over sideways scrolling, so a finger drag often gets cancelled before the value changes.
3. **Cells are too short for dragging.** Steps are 24px tall in these views, so fine adjustment is hard.
4. **Roll and dot markers use an old font and colors** that don't match the 1-bit look, and can disappear on lit cells.

## Fix
- In VEL / CHNC / MOD / ROLL views, a lit step becomes an **empty framed cell with a solid fill rising from the bottom** to its value, and a small numeric readout (for example 75 or x3) in inverted pixels. Unlit steps stay dotted and can't be dragged.
- CHNC fill uses a striped pattern so it reads differently from VEL; MOD uses a centre line so you can tell values above and below the middle.
- Edit cells get taller (about 40px desktop, 44px phone) only in these views; the NOTE view keeps its compact grid with all 16 rows.
- The page no longer scrolls while you drag a step; it still scrolls when you swipe the row labels or the space outside the grid.
- Tapping a lit step in the edit views sets the value at the tap height (no drag needed).
- A pixel readout in the STEPSEQ header shows the value being changed (for example "VEL 03-07 82%").
- Roll counts and the "has velocity/chance" dot use the pixel font, inverted, so they stay visible on lit cells.

## Check before done
Playwright at desktop and phone width: in each view, drag a lit step and confirm the fill height and value change and the sound follows (velocity/chance read back in the grid after switching views). No page errors.

## Technical details
- `src/index.css`: override `.gb-step.mod` (background transparent, keep border), `.gb-step-fill` color/patterns per view, `touch-action: none` on `.gb-step.mod` (replace the pan-x rule), taller `.is-mod` rows, pixel-font `.gb-step-roll` / `.gb-step-dot` with inverted colors.
- `src/components/Groovebox.tsx` (StepGrid only): show value label inside drag cells, report the edited value to SeqScreen's readout. No changes to useGroovebox, timing, sets or MIDI.
