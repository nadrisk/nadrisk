# Reverb: smooth, huge, Romb-style space

## What Fors Romb is aiming for
Fors calls Romb (the free device you mean) a "particularly smooth-sounding reverb" that sends sounds into "big or gigantic spaces", inspired by late-90s leftfield electronic music. It is lush and "free of transients and definition". Fors doesn't publish its code. We copy the character, not the design.

## Why ours sounds like a metal plate and cuts off
These causes come from reading our reverb's code:
- **Metallic:** only 4 short echo lines per side (30–45 ms), with nothing moving them. Short, fixed lines ring at audible pitches, which gives the "plate" tone.
- **Tail cut off:** an extra loss is applied every loop pass, roughly 30 times a second. The tail therefore dies much sooner than SIZE says, and then just stops.
- **Too defined:** only 2 smearing stages before the echo network, so every hit stays sharp and audible inside the tail.

## New reverb character
- **8 echo lines per side, much longer** (about 60–250 ms) at non-repeating lengths. The tail sounds like a huge room, not a resonant sheet.
- **Slow, gentle wobble on each line,** each at its own rate. This blurs pitched ringing into a lush, evolving cloud, which is key to the Romb sound.
- **4–6 smearing stages before the network,** so transients melt away. DENS sets how much they blur.
- **Correct decay:** SIZE becomes the true time for the tail to fade to silence (up to about 20 s for "gigantic"). The tail fades smoothly to nothing, with no sudden end.
- **Darkening over time:** DAMP rolls off highs more on each pass, so the tail gets warmer as it fades, like a real big space.
- **Soft fade-in on the wet sound,** so attacks bloom instead of slapping.
- Same knobs: SIZE, DENS, DAMP, MIX (smooth MIX curve stays). Saved sets still load. Effect cost stays close to today's.

## Checks
- A test for the decay: one click gives a smooth tail on both sides that actually reaches about −60 dB at the SIZE time, with no early cutoff and no runaway at max.
- A test for the ringing: the tail's spectrum has no single dominant peak.
- A browser check for errors and real audio on a pad.
- Then your ear test.

## Technical details
- Rewrite NadReverb in `src/audio/advanced.ts`: 8×8 Householder FDN per side (decorrelated lengths), 4–6 series allpasses with apc from density, fractional-delay reads with per-line sine LFOs (~0.1–0.9 Hz, a few samples deep), per-line gain `10^(-3·len/(sr·T60))` with no extra 0.97 factor, one-pole damp in loop, short wet onset smoothing. Delay buffer cap raised to fit max length plus modulation.
- SIZE range is widened to about 20 s in the effect definition. Eco mode keeps its shorter-tail cap.
- Update the existing reverb test and the reverb rule in `src/audio/AGENTS.md`.
