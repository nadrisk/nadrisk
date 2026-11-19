# Groovebox fixes: 12 items

## What changes for you
1. **Effect groups on desktop**: the OUT / MST / G1-G4 group bar is shown above the FX screen on desktop, so you can see it and tap it.
2. **PRC FOLD starts at 0**: new PRC pads start with no folding.
3. **Sequencer MOD on pitch**: the solid white line is gone. Each step keeps its own cell. Each step shows a small bar going up or down from the middle, plus its semitone number.
4. **Clap loudness**: the clap starts as loud as the kick, snare and synths.
5. **D-DLY screen**: the screen is redrawn. Time, sync and mode go in a clean top line, so nothing overlaps in the corner. Below that you see the left and right echo taps, the HP and DAMP filter shape, and a ducking meter.
6. **PROD / LIVE button**: the button shows the mode you are in now, filled in, so you always know which mode is on.
7. **Euclidean removed**: it is taken out of the pattern generator, the phrase sequencer and the code behind them.
8. **Trance removed from the phrase sequencer.**
9. **Default note C**: every instrument starts on C (C3 for bass and drum pitches, C4 for leads, keys and samplers).
10. **EQ slot tab**: SCP is renamed SPC.
11. **Crave-style arp modes**: adds UP1, UP2, DN1, DN2, U/D1 (repeats top and bottom notes), U/D2 (doesn't repeat them), ORDR (order you played them) and RND. They work in chord arp and in the phrase direction. Saved sets that use the old modes keep working.
12. **Click-free synth envelope**: with a long attack, a short arp note now starts its release at the moment it ends, from wherever the level got to. Voices that get stolen or cut fade out over about 4 ms instead of dropping to zero at once, so fast arps don't click.

## Technical details
- Desktop GroupBar: give it a fixed row inside the FX device panel, above PixelScreen, and keep it out from under the chassis header.
- `src/audio/idm.ts`: set the vco `a` default to 0.
- `src/index.css`: remove the `.pitch-mod` row gradient. Draw the fill bipolar from the cell centre. Labels only on lit steps.
- `voices.ts`: raise the clap trim, checked against the existing loudness test or meter levels.
- `FxChain.tsx` `drawFxVisual("digi")`: new layout on the 128x64 screen.
- `HwScreens.tsx`: the label shows the current `buffer`.
- Remove EUCL from HwScreens/ArpEditor/patternGen/arp, plus its tests. Remove TRNC from ArpEditor. Old saved sets that used them fall back to RAND or UP.
- Slot default notes go to C (sampler pitch stays relative to sampleKey).
- `SlotScreens.tsx`: SCP becomes SPC.
- `arp.ts`: extend the direction list. Old direction values are mapped on load. Unit tests for each mode's note order.
- `voices.ts adsr`: release starts at `t + gate` even during attack. It holds the current value with `cancelAndHoldAtTime`, with a fallback. Steal and cut use a short ramp to 0. Tests check that the value never jumps.
- Each item gets one roadmap entry. Rules go in `src/audio/AGENTS.md` where needed.
