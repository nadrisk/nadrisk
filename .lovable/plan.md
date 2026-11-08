# Groovebox upgrades: more scales + cleaner, richer sounds

MIDI and stem export are out. Two parts, built in this order so each can be checked on its own.

## Part 1 — More scales (no sound risk)
Today the KEY screen offers 9 scales (major, minor, dorian, phrygian, lydian, mixolydian, harm min, pent maj, pent min).
- Add electronic/exotic scales: melodic minor, phrygian dominant, hungarian minor, hirajoshi, in-sen, blues, whole tone, locrian, double harmonic, egyptian, and a few more (about 20 total).
- NOTE knobs, phrases and in-key chords keep working the same way with every new scale.
- Chord quality labels (I, ii, vii°) stay correct; scales with fewer than 7 notes keep plain numbers like today.
- Saved sets keep their exact notes and scale.

## Part 2 — Sound upgrades from hardware DSP (DaisySP-style)
Only additions — 808, ACID, REESE, drums and sampler presets sound the same unless you pick something new.
1. **Cleaner high synth notes**: anti-aliased saw/square in SYN so high notes stop sounding harsh or buzzy. Will be A/B checked against the current sound; if it changes the character too much, it becomes an option instead of the default.
2. **New IDM/percussion model — RESO**: struck metal/wood/glass hits (modal resonator) with tune, decay and material knobs.
3. **New SYN model — STRING**: plucked string (Karplus-Strong) with damping and brightness.
4. Kept within the existing pad CPU limits and the current 1-bit screens and knob layouts.

## Not included
MIDI export, stem export, replacing Tone.js, changing how sets are saved.

## Technical details
- Scales: add `tonal` (MIT) only to generate interval tables at build time into `SCALES` in `src/audio/arp.ts`; runtime code keeps using our own degree math, so no new runtime behaviour. Extend `HARMONY_SCALES`; add tests in `scaleChord.test.ts` for snap/degree/chord on new scales and that old set scales still load.
- PolyBLEP: port the formula (not the library) into the synth oscillator path in `src/audio/voices.ts`/worklet bundle; test for finite output and reduced energy above Nyquist-folded bands.
- RESO and STRING: small pure-TS/worklet voices on the shared Tone context, registered as new model choices; old sets hydrate unchanged (lineup/hydration test). Tests: finite output, silence after release, no stuck voices on stop.
- Update `src/audio/AGENTS.md` with a rule: ported DSP lives as our own code, additive models only.
