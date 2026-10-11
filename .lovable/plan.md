# Let velocity reach silence (note repeat + sequencer)

## What's wrong
- Pad velocity during note repeat bottoms out at 5%, and so do the sequencer VEL steps and the VEL row fader.
- Velocity changes loudness in a straight line, so 5% is still clearly audible. It never sounds like it fades out.
- On a phone your fingertip can't reach the very bottom edge of a pad, so in practice the lowest you can get is more like 10–15%.

## Fix
1. **Floor of 0%:** note repeat, sequencer VEL steps and the VEL row fader can all go down to 0%. At 0% the hit is silent but it still counts as a hit, so ties and rolls stay where they are.
2. **Bottom catch zone:** the lowest ~12% of a pad's height reads as 0%, and the top ~8% reads as 100%. That way you can hit both ends with a real finger.
3. **Natural loudness curve:** velocity is turned into loudness on a curve that works like a fader (roughly squared). Low values then sound properly quiet and fade smoothly to nothing, instead of jumping from "quiet" straight to "off". This applies the same way to every instrument: drum, synth, poly, 808, siren and sampler.
4. **Display:** the pad fill and the VEL bars show 0% as empty. Double-tap reset on the fader still goes back to 100%.

## Not changed
Patterns, chance, roll, MIDI mappings and the sound of hits at full velocity. Saved sets load as they were. Their stored velocities will sound slightly quieter in the middle of the range because of the new curve, and 100% sounds exactly the same as now.

## Technical details
- `Groovebox.tsx` PadGrid: replace the three `Math.max(.05, …)` calculations with a shared `padY→vel` helper that has the dead zones. Change the row fader `setX` floor from `.05` to `0`.
- `useGroovebox.ts`: change the step-value clamps for VEL to 0, and keep `vel===0` steps scheduled, skipping the trigger only when the scaled gain is 0.
- Apply the curve once, at `trigger()` (`vel → vel²`), so every voice in `voices.ts`/`breaks.ts` gets it without per-voice edits.
- Verify in the browser that gain at 0 is 0 and that the step and fader values read 0. You'll still need to check it by ear on your iPhone.
