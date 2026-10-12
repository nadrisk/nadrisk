# Find and fix the new lag (after swing / REESE)

The preview's error logs are empty, so the cause is not confirmed yet. The first step is to measure, then fix only what the measurement shows.

## 1. Measure (same checks as the earlier lag fix)
- Phone-sized browser, LITE off. Time 32 rapid pad taps and 16 steps of the sequencer on the starting set, comparing:
  - a. the current state
  - b. with swing at 50 (straight) and at 62
  - c. with a REESE pad playing compared with POLY
- Record how long the page stays busy per tap and per step, how many screen redraws happen, and how often notes start late. Do this on the start screen, the MASTER screen and the poly screen.
- This shows whether the lag comes from the screens redrawing too often, from extra work on every hit, or from the sound itself.

## 2. Likely suspects, to confirm or rule out
- **REESE screen:** it may redraw on every sequencer step, because the step changes cause it to be rebuilt each time.
- **Every hit:** the release-time lookup now rebuilds the full REESE settings on every hit for every pad, and the mono cut of the old voice adds extra work per hit.
- **Sound:** each REESE note runs 7 oscillators. Notes that overlap during fast sequencing may not be cut cleanly, so they could pile up.
- **Swing:** the off-beat timing offset alone is tiny. It is only a suspect if the MASTER screen now redraws on every step.

## 3. Fix (only what the measurement confirms)
- Stop needless redraws, so the REESE and MASTER screens redraw only when their own values change.
- Cache the REESE settings per pad instead of rebuilding them on every hit.
- Make sure each REESE pad has at most one sounding voice, and that the old voice is fully cut and disconnected.
- No change to how swing, REESE, POLY or any other sound behaves.

## 4. Verify
- Run the same measurements again and get back to the earlier fast numbers. Also re-check 32 rapid taps, sequencer playback with swing, REESE switching and glide, saved-set recall and the phone layout.
- You confirm on your device how it feels.

## Question for you
Is the lag in pad taps, in sequencer timing, or in the screens or knobs responding slowly? Does it happen only when a REESE pad is used? Answering helps me narrow it down, but the measurements above run either way.
