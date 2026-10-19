# Fix: reverb makes no sound

## Cause (found in the code)
The new reverb processor stops after the first sample of every audio block. A misplaced "finish" sits inside its per-sample loop, so 127 of every 128 samples come out silent. The result is no audible reverb at any setting.

## Fix
- Move that early exit so the reverb processes the whole block.
- Make sure the reverb always outputs stereo, even when the incoming sound is mono.
- Keep SIZE, DENS, DAMP and the new smooth MIX curve as they are. Saved sets stay unchanged.

## Checks
- Add a small test that runs the reverb on a single click and checks for a real, decaying tail on both sides, with no runaway at max SIZE.
- In the browser, put reverb on a pad and confirm the wet signal reaches the meters at MIX 30%, 50% and 100%, with no errors.
- Then hand it back to you for an ear test.

## Technical details
- `src/audio/advanced.ts` NadReverb.process: `return true` is inside the `for n` loop. Move it after the loop.
- Check the worklet helper passes `outputChannelCount: [2]` for nad-reverb.
