# Transient slicing for breaks + Morph Filter effect

Slices are currently equal-width cuts with no hit detection. This plan replaces them with slices that follow the hits in the sample, and adds a new effect. I'll build it in two rounds so each can be tested by ear.

## Round 1: Sampler slicing

1. **SLCE knob replaces BEAT (BRK and VNT)**
   - Sits in BEAT's exact spot, so the knob row stays aligned.
   - Low = only the strongest hits (kicks, snares); high = every small hit, including hats.
   - Readout shows how many slices were found, e.g. `SLCE 12`. At 0, slicing is off.
   - The beat count is now always worked out automatically from the sample tempo. Old sets with a typed BEAT keep that length, but the knob is hidden.
2. **Slices follow the hits**
   - Each sample is analysed once when it loads.
   - A slice starts exactly on a hit and plays on through the rest of the sample, jungle style, until release or the next slice.
3. **One slice at a time**
   - In BRK, a new slice always cuts the previous one with a 3 ms fade, so slices never overlap.
4. **Phrase sequencer and notes**
   - Each semitone above the pad's root note picks the next slice: root = slice 1, +1 = slice 2, and so on, wrapping past the last slice.
   - The step readout shows `SL 05`.
5. **Chords and arpeggios on a sliced BRK pad**
   - Chord notes never play at once.
   - BLOCK plays only the first slice.
   - STRUM and ARP play the chord's slices one after another at the chosen rate, cutting each time, so you can roll through chops in rhythm.
6. **Waveform display**
   - BRK always fills the full width, like SMP.
   - VNT draws 1x at normal width and grows up to 4x, clipped to the frame.
   - Slice markers are 1 px lines. Numbers show only when there's room (at least 9 px apart); otherwise only every 2nd or 4th is labelled.

## Round 2: Morph Filter (`morph.flt~`)

New effect in the empty slot of the ADD list, saved in sets and patches like every other effect. Four pages:
- **FLT:** filter A type, filter B type (each LP/HP/BP/NOTCH), CUT, RES
- **MRPH:** MRPH (blend from A to B), MIX
- **LFO:** WAVE (SIN/TRI/SAW/SQR/S&H), RATE (Hz, or tempo divisions when SYNC is on), DPTH, SMTH
- **TRIG:** RTRG (free-running, or restart on every note)

Volume stays steady:
- Automatic makeup gain keeps the level even across filter types.
- Resonance is softly limited, so high RES never gets piercing.

The display shows the blended filter curve, with the LFO sweep as a dotted range.

Every changed screen gets checked at 1280, 768 and 390.

## Technical details
- `src/audio/slices.ts`:
  - Spectral-flux onset detection (512 FFT, hop 256, adaptive median threshold scaled by sensitivity).
  - Cached per sample buffer.
  - Returns slice start fractions.
- `SamplerParams.sliceSens?: number` (new field; old `slices` read as legacy).
- Pad choke reuses the voice `stop()` / ring list.
- `useGroovebox` trigger maps a note offset to a slice index.
- When a pad is sliced, chord notes are routed through the existing strum/arp scheduler with a mono choke.
- Morph Filter is built from two biquad pairs with an equal-power crossfade.
- The LFO is one free-running oscillator per slot (matching the existing LFO rule), plus a TRIG-mode per-note restart through `FxNode.trigger`.
- S&H is a stepped curve smoothed by SMTH.
- Makeup gain is a per-type table times 1/(1+res·k).
- Added to `FX_DEFS`, `FX_COST`, FxChain pages and icon, `MOD_PARAMS` (cut, morph).
