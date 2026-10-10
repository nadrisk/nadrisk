# Fix the sequencer's VEL / CHNC / MOD / ROLL editing

## What's broken (confirmed in the current styles)
1. **Fill is invisible.** In VEL, CHNC, MOD and ROLL views, a lit step is drawn as a solid light box, and the level fill is drawn in that same light color. Dragging changes the value, but you can't see it.
2. **Dragging on a phone scrolls the page.** On touch screens, steps allow the browser to take over sideways scrolling, so a finger drag often gets cancelled before the value changes.
3. **Cells are too short for dragging.** Steps are 24px tall in these views, so fine adjustment is hard.
4. **Roll and dot markers use an old font and colors** that don't match the 1-bit look, and can disappear on lit cells.

## Fix
- In VEL / CHNC / MOD / ROLL views, a lit step becomes an **empty framed cell with a solid fill rising from the bottom** to its value, and a small numeric readout (for example 75 or x3) in inverted pixels. Unlit steps stay dotted and can't be dragged.
- CHNC fill uses a striped pattern so it reads differently from VEL; MOD uses a centre line so you can tell values above and below the middle.
- **Unified step size:** every step is the same size in every view (NOTE, VEL, CHNC, ROLL, MOD) and on every row, so the grid never jumps when you switch views.
- **iPad first:** on tablets the sequencer gets the full width under the pads, and steps become large touch targets (about 40-44px wide, 48px tall), big enough for a fingertip. All 16 rows stay visible by scrolling the grid area.
- **Fine adjustment on iPad:** dragging uses the whole drag distance, not just the cell height. Drag up or down from a step and the value changes smoothly (roughly 1% per 2px), so you can move far for precise changes without leaving the step. A large readout appears above your finger while dragging showing the exact value (for example "VEL 82%"). Double-tap a step resets it to 100% (VEL/CHNC) or the centre (MOD).
- **Phones (compromise):** the same steps shrink to about 22-26px, the row labels get narrower, and the grid scrolls sideways if needed. Dragging and the readout work the same way.
- The page no longer scrolls while you drag a step; it still scrolls when you swipe the row labels or the space outside the grid.
- Tapping a lit step in the edit views sets the value at the tap height (no drag needed).
- A pixel readout in the STEPSEQ header shows the value being changed (for example "VEL 03-07 82%").
- Roll counts and the "has velocity/chance" dot use the pixel font, inverted, so they stay visible on lit cells.

## Check before done
Browser check at iPad size (1024 and 820 wide, touch enabled), phone width and desktop: in each view, drag a lit step and confirm the fill height and value change and the sound follows (velocity/chance read back in the grid after switching views). No page errors. A real iPad test is still needed afterwards.

## Technical details
- `src/index.css`: override `.gb-step.mod` (background transparent, keep border), `.gb-step-fill` color/patterns per view, `touch-action: none` on `.gb-step.mod` (replace the pan-x rule), remove the scattered `.gb-step` / `.is-mod` height rules and replace them with one `aspect-ratio: 1` rule, pixel-font `.gb-step-roll` / `.gb-step-dot` with inverted colors.
- `src/components/Groovebox.tsx` (StepGrid only): relative drag (value = start value - dy / 200, captured pointer), double-tap reset, floating readout, value label inside drag cells. The sequencer utility page gets a wider layout on tablet widths (the utility panel spans full width when SEQ is open, 768-1366px). No changes to useGroovebox, timing, sets or MIDI.
