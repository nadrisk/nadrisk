# Cleaner screens, full-width utility, unique FX icons

## 1. Centered, aligned screen contents
- Knob row: spread the 4 knobs evenly across the full 128px width (centers at 16/48/80/112) so they no longer sit left-heavy with a gap on the right; labels centered under each knob.
- Graph boxes (drum pitch envelope, filter curves, EQ, sampler waveform) span the same left/right margins as the knob row, so every screen uses one consistent frame (2px margins).
- Text readouts (e.g. "+24ST", "HAT", "SQUAR") snap to fixed positions inside the box, never touching borders.

## 2. Drum screen fix
- Move the KIC / SNR / HAT keys out of the graph into their own row under the header, so the envelope line can no longer cross them. The graph shrinks to the space between.

## 3. Sampler screen declutter
- Remove the side LEV fader from the SMP page (volume is already on the SLOT screen), giving the waveform the full width.
- REV / LOOP / slice keys in one tidy row; smaller knobs (same size as every other screen) using the shared knob row.

## 4. Utility section fills its width
- Utility screens (FX, PHRASE, MASTER, PERF, TAPE, MEM, MIDI) stretch to the exact width of the selector buttons above. The 128x64 pixel grid keeps whole-number scaling; the display is centered inside a full-width bezel and the scale picks the largest whole number that fits, so no big empty area remains on the right.
- Same rule for instrument workspace screens so both sides line up.

## 5. Unique effect icons (MS-50G style)
- Each of the 21 effects gets its own small 1-bit icon (about 16x12 pixels), e.g. delay = repeating fading bars, reverb = decaying cloud, filter = cutoff curve, distortion = clipped wave, bitcrush = staircase, vibrato = wobble, tremolo = pulsing bars, gate = square chops, compressor/OTT = squashed arrows, chorus = doubled waves, sidechain = ducking dip, tape echo = reel.
- Icons shown in the LST page next to each effect, large on the EDT page header area, and in the ADD grid.

## Technical details
- `pixelScreens.tsx`: KX -> [16,48,80,112]; zones updated; shared frame constants.
- `DrumkitPanel.tsx`, `WispdiskPanel.tsx`: layout reflow as above.
- New `src/pixel/fxIcons.ts`: bitmap arrays per FX type; used in `FxChain.tsx`.
- `PixelScreen.tsx` + `index.css`: remove max-width caps on utility `.px-wrap`, center screen in a full-width bezel.
- No audio, sequencing, MIDI, sets or recorder changes.
- Verify with screenshots at desktop and phone widths.
