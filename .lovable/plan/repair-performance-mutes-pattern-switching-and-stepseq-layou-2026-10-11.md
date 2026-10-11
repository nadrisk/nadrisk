# Repair performance mutes, pattern switching, and STEPSEQ layout

## Goal
Make the performance screen’s 16 mute keys and A–D pattern keys dependable and unambiguous, then reorganize the STEPSEQ controls to use the full 128×64 display without changing sequencer or audio behavior.

## Plan

1. **Reproduce the recorded control failures**
   - Test every mute key repeatedly while sound is playing and confirm the matching mixer mute follows it.
   - Test A–D both stopped and playing, including queued changes at the next bar and changing/cancelling a queued choice.
   - Compare the visible selected/queued/muted states with the uploaded phone recording before naming the exact cause.

2. **Repair the performance control strip**
   - Give each phone tap exactly one action and prevent accidental duplicate or cancelled taps.
   - Keep performance mutes and mixer mutes on the same pad state.
   - Make mute state direct and unmistakable: a lit key means muted, matching the mixer’s M key, rather than the current inverted “lit means playing” display.
   - Make A–D clearly distinguish the active pattern from the pattern waiting for the next bar; switching remains immediate while stopped and bar-queued while playing.

3. **Stretch the STEPSEQ menu across the full display**
   - Keep the fixed 128×64 bitmap screen and existing controls.
   - Reflow A–D, NOTE/VEL/CHNC/ROLL/MOD, COPY/RAND/CLR, PLAY/PAUSE, and UNDO/REDO into evenly sized rows that use the blank lower half of the display.
   - Enlarge tap areas together with the drawn keys so the visual and touch targets remain aligned.
   - Preserve all current labels and behavior; no sequencer data or audio changes.

4. **Verify the complete section**
   - On a phone-sized test: toggle all 16 mutes, cross-check the mixer, switch and cancel queued patterns, stop/start playback, and exercise every STEPSEQ key.
   - Confirm the redesigned screen has no overlaps, clipped labels, double actions, console errors, or build errors.

## Technical scope
- Expected files: performance controls, STEPSEQ screen layout, and only the minimal shared tap handling/state code required by the confirmed failure.
- The groovebox audio engines, instruments, effects, patterns, saved-set format, and step grid remain untouched.
