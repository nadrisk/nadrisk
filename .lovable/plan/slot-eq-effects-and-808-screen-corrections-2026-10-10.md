# Slot, EQ, effects and 808 screen corrections

## What is wrong now

- **Slot naming:** tapping a name character only moves an inverted cursor. The actual letter control is an invisible horizontal touch area, with no drawn control or instruction, so the square appears but renaming is not discoverable.
- **Insert EQ:** the displayed mid-frequency number changes, but the curve uses three fixed horizontal centers. The mid curve therefore stays visually fixed while the real audio filter moves. The slot EQ has no stored mid-Q value yet, and its audio filter is fixed at Q 1.
- **Effect editor:** a large generic icon and its frame consume the left side of the 128×64 display. The effect name, status, gate steps and controls are squeezed into the remaining area. Non-gate effects only show text status, so parameter changes have no useful visual response.
- **808:** the graph runs beneath a right-aligned value label inside the same small frame, causing the endpoint and label to collide at longer values.

## Changes

1. **Make slot renaming explicit**
   - Keep the existing ten-character hardware-style name.
   - Draw a compact rename row beneath it with visible previous-character, character value and next-character controls.
   - Keep character selection by tapping the name, but replace the unexplained invisible sweep area with clearly bounded touch targets.
   - Preserve the current slot name storage and set recall behavior.

2. **Make the insert EQ graph truthful**
   - Plot low shelf, parametric mid band and high shelf across a logarithmic frequency axis.
   - Move the mid peak/notch horizontally with `FREQ`, vertically with `MID`, and change its width with a new `Q` control.
   - Add mid-Q to each slot’s saved EQ state, defaulting safely for old saved sets.
   - Apply the same Q value to the real slot mid filter so the display and sound remain matched.
   - Split the five controls across two compact EQ pages so knob spacing stays centered and readable.

3. **Rebuild the effect edit display without icons**
   - Remove the large icon/frame from the edit page; retain a small, neatly positioned effect name at the upper-left and page indicator at the upper-right.
   - Center each page’s available knobs using the shared hardware spacing.
   - Give the full middle display area to parameter-driven 1-bit feedback: transfer curves for drive/dynamics, taps for delays, tails for reverb, moving phase/LFO traces for modulation, filter curves for EQ/DJ filter, and level/band views where appropriate.
   - Give trance gate a larger full-width 16-step strip with touch targets exactly aligned to its drawn cells.
   - Keep effect order, parameters, MIDI labels and audio processing unchanged.

4. **Clear the 808 overlap**
   - Reserve a dedicated value area outside the graph path and clamp the graph endpoint before it.
   - Keep the current pitch and release touch behavior unchanged.

5. **Verify on the intended layouts**
   - Check slot rename, EQ frequency/Q response, several representative effect screens, trance-gate step editing and all 808 pages in the live preview.
   - Verify both iPad/tablet and phone widths, with priority on tablet touch accuracy and no overlapping labels or controls.
   - Confirm existing audio, effect ordering, MIDI mapping and saved-set recall still work.

## Files involved

- `src/components/SlotScreens.tsx` — slot rename UI and corrected EQ graph/pages.
- `src/hooks/useGroovebox.ts` — saved slot mid-Q default, compatibility and real filter update.
- `src/components/FxChain.tsx` — icon-free effect layout, expanded gate strip and visual feedback.
- `src/components/Sub808Panel.tsx` — graph/value separation.
- A small focused pixel-visual helper may be added under `src/pixel/` only if keeping all effect drawings inside `FxChain.tsx` becomes unwieldy.

## Scope guard

No changes to instrument engines, sequencer behavior, rack routing, effect algorithms, pad behavior, transport, recorder or overall page layout. The only sound-affecting addition is the requested slot mid-Q control.
