# Groovebox upgrade: rhythm, harmony, filters, oscillators, conditions

Built in three stages. Each one is tested and checked in the preview before the next starts. Saved sets keep loading exactly as they do now.

## Stage 1 — Groove and theory
1. **True Euclidean rhythms (Bjorklund)**
   - The current EUCL arp gets swapped for the real Bjorklund method, so patterns like tresillo (3/8) and cinquillo (5/8) come out right.
   - The GEN screen gets an EUCL tab with HITS, STEPS and ROTATE knobs. It fills the selected pad's steps and can be undone like the other GEN tabs.
2. **Voice leading for chords and phrases**
   - The same 9 scales and 8 chord types stay.
   - Each new chord picks the inversion and octave closest to the last one. Shared notes stay put and the other notes move by the smallest step.
   - A VOICE switch per pad (ON/OFF, default OFF) keeps old sets sounding the same.

## Stage 2 — Sound
3. **Analog-style filter models** (based on the Faust filter libraries)
   - New filter types next to the current filter: LADDER (Moog-style, 24 dB), SEM (morphs low/notch/high), MS20 (aggressive resonance).
   - They live in the existing filter selector, are saved per pad and are kept safe from blowing up.
4. **Clean oscillators** (PolyBLEP, from DaisySP)
   - Saw, square and triangle on SYN and BAS stop sounding harsh or whistly on high notes.
   - Low notes keep the same character.

## Stage 3 — Tracker conditions (Dirtywave-style)
5. **Conditional steps**: each lit step can be set to always, 1:2, 2:2, 1:4…4:4, FILL or NOT FILL, edited on the step's options page.
6. **Micro-timing nudge**: each step can be moved ±1/2 of a 1/96 tick, for a looser feel.
   - The AV tracker shows the conditions as a small flag.
   - Ratchets and glides aren't touched (they already exist).

## Not included
MIDI export, stem export, new scales or chord types.

## Technical details
- `src/audio/arp.ts`: pure `bjorklund(k,n,rot)` with tests against known Toussaint rhythms. `euclid()` is reused for patternGen and the GEN EUCL tab.
- `src/audio/harmony.ts`: pure `voiceLead(prev, chord)` that keeps total semitone movement as small as possible. Tests cover common-tone holding and range limits.
- Filters: new AudioWorklet DSP in the existing worklet bundle. Uses zero-delay-feedback ladder/SVF math and a tanh limit on resonance. A test checks the output stays finite.
- PolyBLEP: worklet oscillator used by synth voices. Falls back to Tone oscillators if the worklet doesn't load.
- Step banks get `cond[]` and `nudge[]` arrays next to vel/chance. They are read by the scheduler through `stepAt()`, missing values default to always/0, and they are shown in trackerDoc.
- AGENTS.md: one rule per new module.
