# Fix: BRK mode makes no sound

Only VNT makes sound in BRK mode. The tempo-locked break player stays silent. The cause isn't confirmed yet, so step 1 is to find it.

## Steps
1. **Reproduce with a real break.** Load an Amen-style drum loop in the test browser, switch the pad to BRK and record what comes out: hits, held pad, sequencer steps. I'll check each link in the chain: does the stretch player load, is it reached on a hit, does it get the sample, does sound reach the pad's output?
2. **Fix what step 1 finds.** These are the suspects, from my reading of the break player:
   - the player is set up with a live input, which can put it in "listen to input" mode instead of "play the loaded sample"
   - its start command leaves out the matching timing field that this library version needs, so playback may be dropped
   - the volume shape may be wrong: if SUSTAIN is 0, the sound fades out at once
   - the hit may never reach the break player at all, because of how the mode switch sets things up
3. **Fallback.** If the stretch player can't load (for example on an older iPhone), BRK falls back to the VNT stretch so the pad still makes sound.
4. **Check.** Record the Amen break in BRK at 90, 120 and 170 BPM and at +12 semitones. It must make sound, stay in time with the tempo, keep pitch separate from speed, and handle ×2 and release. VNT, slicing and the other modes stay as they are. Then run the typecheck, tests and build.

## Technical details
- Files: `src/audio/breaks.ts`, plus the hit branch and pre-load in `src/hooks/useGroovebox.ts` if step 1 points there.
- Measure the output with a recording tap in Playwright (Chromium). The iPhone engine can't be measured here, so you'll need to confirm by ear on your phone.
- No changes to the controls or the screen.
