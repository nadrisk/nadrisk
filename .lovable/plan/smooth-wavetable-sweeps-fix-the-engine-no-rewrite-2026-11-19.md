# Smooth wavetable sweeps (fix the engine, no rewrite)

## Honest diagnosis (from the current code)
- `alignPhases` forces every overtone in a table to one shared phase. That stops cancellation, but it rewrites the sound of every frame, which is why cloud tables sound thin and nasal.
- Frames are blended with a plain straight-line mix. With the original phases kept, that mix cancels overtones halfway between two different waves (the hollow "dip").
- The position follows the envelope very quickly, so fast LOOP sweeps step through dozens of frames per note cycle and buzz.

## What we build
1. **Neighbour phase matching instead of one shared phase.**
   Each frame keeps its own sound. Only overtones that would fight their neighbour (more than 90 degrees apart) get turned to the nearest matching direction, frame by frame. The waves keep their body; the halfway dips go away.
2. **Loudness-safe blending.**
   Measure how similar each pair of neighbouring frames is once, when the table loads. Similar frames mix normally; very different frames get a power-keeping mix, so the level never drops or jumps between them.
3. **Smoothing for fast sweeps.**
   The wave position glides with a fixed ~15 ms lag, and the speed is capped at roughly one frame per wave cycle at the played note, so even LOOP at 1/16 sounds like a glide, not a buzz. Manual WAVE turns feel unchanged.
4. **Same table cache.** Tables you already downloaded are re-prepared automatically; nothing is lost and old sets load as before.

## Checks
- Automatic tests: halfway between opposite frames keeps full level; a single-frame table is identical to before; a smooth table (e.g. a saw-to-square bank) sounds close to its original frames; the fastest LOOP sweep never moves faster than the cap.
- Render one second of a fast LOOP sweep on two cloud tables and compare roughness before and after.
- You do the final listening test on your phone.

## Technical details
- `src/audio/wtOsc.ts`: replace `alignPhases` with `matchNeighbourPhases(re, im)` (walk frames 1..n-1, per harmonic flip by pi when dot product with previous frame < 0, optionally rotate to previous phase when |delta| > pi/2 and magnitude is small); compute per-pair correlation `rho[k]` and send it with the mips; in the worklet use weights `wa, wb` solving `wa^2 + wb^2 + 2 rho wa wb = 1` along the linear path (rho = 1 gives linear mix); position lag via one-pole at 15 ms plus slew limit `|dx| <= f / sr`.
- Bump the mips cache key so stored tables rebuild.
- Update the existing `wtOsc.test.ts` energy test and add the tests above; replace the phase-alignment rule in `src/audio/AGENTS.md`.
