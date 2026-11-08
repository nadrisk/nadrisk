# Piano-roll note lengths on the step sequencer

Keep the 16-pad step grid, but let notes be stretched and shortened like a piano roll.

## What changes for you
1. **Right-edge handle** on every lit note (NOTE view only). Drag right to make it longer, left to shorten it back to one step.
   - Mouse: small pixel grip on the note's right edge, resize cursor.
   - Phone: the right 40% of the note is the grab zone, so a fingertip can catch it. A short tap still turns the note off.
2. **Length badge** floats above your finger while dragging: `2 STP 1/8`, `4 STP 1/4`, `8 STP 1/2`.
3. **Light buzz** on phones each time the note crosses a step (where the phone supports it).
4. **Stops at the next note**: a stretched note can't run into a note ahead of it in the same row, and stops at the row's length/loop end.
5. **Old double-tap tie removed**; drag replaces it. Saved sets keep their existing long notes and play the same.
6. Notes over a page edge (32-step mode) can be stretched across into the next page.

## Not in this build
Swipe-to-paint, one-tap legato, moving notes by their middle, duplicating blocks — can be added afterwards.

## Technical details
- Lengths stay as today's tie values (row cells >= 2 after a hit), so the scheduler, AV tracker, undo and sets are untouched.
- New pure helper `src/audio/noteSpan.ts`: `spanOf(row, start, len)` and `setSpan(row, start, steps, len)` (writes/clears ties, clamps before next hit and row end). Tests: stretch, shrink, clamp at next note, clamp at row length, shrink to 1.
- `StepGrid` in Groovebox.tsx: pointer events with 6px deadzone; edge zone = 6px (mouse) / 40% (touch, `pointerType`); one undo entry per drag; badge rendered above the touch point; `navigator.vibrate?.(4)` per boundary.
- Remove the 250/300 ms tie-tap timers and `onTie` path; taps toggle instantly.
- Tie cells get a visible joined bar so length reads clearly; grip pixel on the last cell.
- AGENTS.md rule: note length is edited only through noteSpan helpers on the existing tie encoding.
