# Wavetable: live sweep sound + Serum/Vital-style picture

## 1. Hear the wave change while holding a pad
- First confirm on a held note why WAVE / screen drag does not reach the sounding voice (BASIC waves and imported tables).
- Fix the live update so a held voice crossfades between neighbouring frames in real time (both oscillators prepared at note start, only their levels move).
- Same path for knob, screen drag and the WT POS step lane, so all three are audible on held notes and chords.
- No clicks: short level ramps, no oscillator restarts.

## 2. New wavetable picture (OSC page)
- Smooth, high-resolution lines instead of 1-bit pixels, only on this wavetable view; rest of the groovebox stays 1-bit.
- Colours follow the active theme (OLED, blue, pink neon, green, amber) with soft transparency for depth.
- Contained 3D cage: floor rails and back edges, inset well inside the frame so nothing touches the header, name or borders.
- Proper perspective: rear waves smaller and fainter, front waves hide the ones behind, about 12-24 evenly picked waves shown.
- Playing wave drawn bold and bright with a faint fill down to the floor, like Serum's highlighted slice; it slides smoothly as you sweep.
- Dragging across the picture still moves the position.

## 3. Check
- Phone (393 wide) and desktop screenshots with BASIC and an imported table: nothing outside the frame.
- Hold a pad, sweep WAVE, confirm the voice's levels change live; run existing tests.

## Technical notes
- Audio: src/audio/clean.ts voice update path; wavetable.ts framePair reused.
- Visual: CyberspacePanel.tsx drawStack replaced by an anti-aliased canvas layer at device pixel ratio, theme colours read via the PixelScreen colour helper.
