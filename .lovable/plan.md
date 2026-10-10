# Make every pad tap play, like a real drum pad

## What the recording shows
I measured the sound in your recording. While you tap steadily, some hits are missing. The gaps last about 0.2 to 0.3 seconds and come back regularly. The hits that do play come out at full level, so the sound doesn't fade or get quieter. Some taps simply never become a sound.

## Possible causes (to confirm first)
1. **The phone treats fast taps as a gesture.** The pads are set to block scrolling and zooming, but a later style rule turns some of that back on. On iPhone, a quick second tap can then be held back as a possible "double-tap" and never reach the pad.
2. **A tap is cut short.** Each tap grabs the finger so a release is always noticed. If a new tap arrives while the previous one is still being released, the new sound can be stopped right after it starts.
3. **Ring limit or choke stopping the new sound.** When an old sound is stopped to stay within the 4-sounds-per-pad limit, the stop could land on the sound that's just starting.

## Step 1: find out which it is
- Add a hidden tap counter that records, for each pad: taps received, sounds started, and sounds stopped early (and by what).
- Tap fast in the test browser using simulated touch, including two fingers on one pad. Compare taps against sounds.
- If the test browser doesn't drop any taps, I'll ask you to tap 40 times on your phone and read me the counter. That tells us whether the tap or the sound is being lost.

## Step 2: fix only the confirmed cause
- **Tap lost:** make the pads fully block phone gestures (remove the rule that turns them back on), and trigger the sound on the earliest touch event.
- **Sound cut short:** a release only stops the sound from its own tap, never a newer one.
- **Ring limit or choke:** when an old sound is stopped, it fades out from the current moment, and the newest sound is never chosen.

## Check
- 40 fast taps on one pad, then on two pads alternating, then two fingers together. The counter should show every tap turned into a sound.
- Playback, phrase holds, note repeat (MOMENT and LATCH), choke groups and the vel mode still work.
- The hidden counter is removed after the fix.

## Technical details
- `src/index.css`: the `.gb-pad { touch-action: manipulation }` rules (around lines 305 and 309) override `touch-action: none` (line 218). This is the main suspect for iOS.
- `src/components/Groovebox.tsx` pads: `setPointerCapture` plus `onLostPointerCapture`/`onBlur` call `release(i)`. A release tied to an earlier pointer may stop the voice started by the next tap. Fix by tracking `pointerId` per pad.
- `src/hooks/useGroovebox.ts` `trigger()`: check the ring-cap splice and the choke loop so they never stop the voice just created at time `t`.
