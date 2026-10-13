# Sliced breaks play through like Simpler, and NOTE resets to C4

## 1. Slices play through (Simpler "Thru" style)
Right now each phrase step only lasts as long as that step. When the step ends, the slice fades out, so the break stops before it reaches the next hit.

New behaviour on sliced pads:
- A slice starts on its hit and keeps playing through the rest of the break.
- It stops only when:
  - the next slice is hit (cut with a 3 ms fade, so no click), or
  - you let go of the pad (release uses REL), or
  - you press STOP.
- This works the same for phrase steps, the step grid, note repeat, MIDI and QWERTY keys.
- When a slice reaches the end of the region, it stops there. It doesn't loop back to slice 1.

Unsliced pads behave exactly as before.

## 2. NOTE double-tap resets to C4
Double-tapping NOTE currently jumps back to whatever value it had when the page loaded. On every pitched instrument it will now always reset to C4 (MIDI 60). In a key that has no C, it goes to the nearest note in the scale.

## Checks
- Run a sliced break through a phrase in the test browser and check two things:
  - each voice keeps sounding until the next slice starts;
  - only one voice ever sounds at a time.
- Double-tap NOTE after changing it and confirm the screen shows C4.
- Typecheck and tests.

## Technical details
- `useGroovebox.ts` trigger: when `sliced`, set the voice gate to the remaining region time, `(1 - sliceFrac) * regionDur / rate`, instead of `gk(k)`. Keep the existing previous-voice `stop()` at the next hit.
- When the pad is released, the voice still gets `release()`. The phrase step timer won't call release for sliced voices; held-pad lift still does.
- `breaks.ts`: launch Signalsmith with `loopStart = loopEnd = 0` (or no loop) when `sliceAt` is set, so the slice runs to the end and doesn't wrap. The fallback stops the source once it reaches the end of the baked buffer.
- `harmonyKnob.tsx useNoteKnob`: add `reset: 60` on the knob. Its `set` already applies scale snapping.
