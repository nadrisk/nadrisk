# Make pad taps reliably select their slot while playing

## What is likely wrong (to confirm first)
A pad tap does two things: it plays the sound, and it selects that slot so the instrument, effects and the other panels switch to it.

When the groovebox is stopped, the selection happens right away. While it's playing, the selection is marked as "low priority" so the sound is never delayed. But the playhead moving through the sequencer updates the screen every step. Those updates keep interrupting the low-priority selection, so the switch can be postponed again and again and the panels never change. Without playback there are no interruptions, which would explain why this only happens after you press play.

The first step checks this in the preview before anything is changed: press play, tap different pads, and record whether the instrument and effects panels follow.

## Fix
1. **A pad tap selects its slot immediately, whether or not the groovebox is playing.** The sound is still triggered first, so timing doesn't change.
2. **Only the selection is made immediate.** The playhead and the heavy panels keep their existing protections, so playback stays smooth.
3. **The same check applies everywhere a slot can be selected:** pads, sequencer row names and mixer strip names.
4. **MIDI-triggered pads keep their current behaviour.** They play the sound but don't steal the selection while you're editing.

## Check
- Press play. Tap pads 1, 2, 10 and 16 in turn. Each time, the slot title, the instrument screen and the effects page should show that pad within a single tap.
- Do the same with note repeat on, in both MOMENT and LATCH.
- Confirm there are no audio dropouts or late hits while tapping during playback, and no errors in the console.

## Technical details
- `src/hooks/useGroovebox.ts` `hit()`: replace `startTransition(() => setSelected(i))` with a direct `setSelected(i)` after `play(i)`. Skip the state set when `selectedRef.current === i` to avoid needless renders.
- Check that `selectedRef` updates synchronously, so `updateSelected` writes to the newly selected slot right away.
- If the diagnosis isn't confirmed (taps still fail with the direct update), trace `PadGrid` memo props and `setPointerCapture`/`onLostPointerCapture` ordering next, and fix whichever step drops the tap.
- No changes to the audio engine, scheduler, sets or MIDI mapping.
