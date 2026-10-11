# BRK: Ableton-style warp with a typed sample BPM

## What's wrong now
BRK never knows the break's real tempo. It guesses how many beats the loop holds by rounding to 2, 4, 8, 16... beats using the **project** tempo. For a 174 BPM break in a 128 project, that guess can land on the wrong length, so the stretch looks like it isn't following the tempo (or stretches by the wrong amount).

## What changes
1. **Sample BPM (S-BPM)** on the BRK page.
   - Tap it to type the break's tempo (pixel number dialog, same style as rename), or turn the knob (60–200, 0.1 steps).
   - **AUTO** (default) guesses it from the sample length, assuming a whole number of bars, picking the tempo closest to 85–175 BPM. The readout shows the guess, e.g. `A174`.
2. **Warp math like Ableton:** playback speed = project BPM ÷ sample BPM. A 174 break in a 128 project plays at 0.74× speed, pitch unchanged. Changing project BPM re-stretches on the next hit.
3. **BEAT** becomes optional: AUTO now derives the beat count from S-BPM (exact, no rounding to powers of two). Setting BEAT by hand still overrides the loop length. X2 still doubles it.
4. **Engine indicator:** small `STR` / `BAK` tag on the BRK screen showing whether the tempo-stretch engine or the backup is running on your phone, so we know which path you're hearing.
5. Old sets load with S-BPM on AUTO.

## Technical details
- `SamplerParams.sampleBpm?: number` (0 = auto). `breakTiming`: `srcBpm = sampleBpm || guessSampleBpm(end-start)`; `beats = p.beats || (end-start)*srcBpm/60`; `seconds = beats*(x2?2:1)*60/bpm`; rate unchanged formula.
- `guessSampleBpm(dur)`: try 1/2/4/8 bars of 4 beats, choose BPM within 85–175.
- Fallback path uses the same timing, so both engines agree.
- Engine state exposed from `breaks.ts` per buffer; WispdiskPanel reads it for the tag.
- Number entry reuses the existing pixel dialog; knob is MIDI-learnable via aria-label "Sample BPM".
