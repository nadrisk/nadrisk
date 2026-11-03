# FX update: DLAY rename, clean MORPH, new HACK circuit-bending effect

## 1. TAPE becomes DLAY
- Rename the tape delay's label to `DLAY` in the ADD grid, effect list, editor header and icon caption. Sound and settings stay the same, and saved sets load exactly as they did before.

## 2. MORPH without mutate
- Remove the mutate twins (SCRM, DECO, FRAC, VOID) from the morph filter's sound, its settings and its knob pages.
- Pages become clean 4-knob screens: FILTER (TYPE, CUT, RES, DRIVE), MORPH/MOD (MRPH, AMT, OPPS, MIX), LFO (RATE, DPTH, SHPE, SYNC).
- Screen shows only the filter response curve, cutoff marker, resonance peak and LFO sweep range.
- Old sets with mutate values load and quietly ignore them.

## 3. HACK replaces NEURO
A circuit-bending effect modelled on how real bent hardware behaves: bent Casio SK-1, Speak & Spell, Data Bender.

Sound behaviours:
- **SHRT (bus short):** flips data bits in the sample word, so the sound turns gritty and harmonic instead of just bitcrushed.
- **CLK (clock bend):** a sample-rate reducer whose clock wobbles and drops like a bent crystal, giving pitch-warped aliasing.
- **SKIP (buffer glitch):** captures short buffers and repeats, stutters or reverses them, locked to tempo when SYNC is on.
- **STRV (voltage starve):** brown-out sag with gating and dropouts that follow the input level.
- **CHAOS:** a random bridge that occasionally triggers glitches, so the effect stays alive. It uses a seeded random source, so results can be repeated.

Pages (4 knobs each, header shows each value while you turn it):
- BEND: SHRT, CLK, STRV, MIX
- GLCH: SKIP, SIZE, CHAOS, SYNC

Visual: a 1-bit circuit trace with the live waveform. Shorted bits light up as pin flashes, the clock wobble shows as scanline jitter, and skips appear as repeated segments, all reacting to the effect's real state.

Compatibility: sets and patches containing NEURO load as HACK with neutral defaults. It uses the same DSP budget as the old effect slot.

## Technical details
- `src/audio/effects.ts`: delete the neurobox node and add a `hack` FxNode whose DSP runs in the shared AudioWorklet bundle. Strip the mutate chain from the morph node. Add type/default migration for neurobox→hack and for the mutate fields.
- `src/components/FxChain.tsx`, `src/pixel/fxIcons.ts`, `TapeDeck.tsx`, `Groovebox.tsx`, `useGroovebox.ts`: update the labels, ADD grid entry, knob pages and screen renderer. The HACK screen uses a capped PixelScreen redraw fed by the slot meter, never React audio-frame state.
- Tests: neurobox set loads as hack; morph hydrates without mutate; hack at MIX 0 passes the signal unchanged; bit-flip output stays bounded in [-1, 1]; a seeded chaos source repeats exactly.
