# Sequencer, chord and performance controls

1. **Row audition**: a single tap on a row's name plays that row's pad. Double-tap still clears the row, as you asked for before, and a double-tap won't also play the sound twice. The name stays centred and padded so it never touches the steps.
2. **Pitch modulation per step**: works exactly like turning NOTE, limited to -12 to +12 semitones and snapped to the global KEY/SCALE when a scale is on. The value shown on a step and its pop-up reads as a note name (C3, F#3). The pop-up sits inside or just above the step and never covers other rows.
3. **Chord scale sync**: chord mode always follows the global key and scale. The separate chord scale setting is hidden, and old sets switch to the global scale when they load.
4. **Mute/solo**: double-tap a Performance mute key to solo that pad (double-tap again to unsolo). A new SHIFT key in the live strip turns mute keys into solo keys while it's lit. It fits beside RST with no overlap.
5. **Computer keyboard**: a KEYS toggle on the MIDI screen. While on:
   - `1-8` and `Q-I` play pads 1-16
   - Shift + a pad key mutes that pad; Alt + a pad key solos it
   - `Z X C V` switch to patterns A-D
   - A small keymap hint shows in the MIDI panel without covering its readouts
   - Typing in name or number boxes is ignored, so text entry still works
6. **MIDI learn on Performance**: learn stays on when you open or view Performance. Mute keys, A-D, RESET, SHIFT and the macro knobs can all be mapped. The learn badge moves to a corner so it never covers keys or knobs.

Afterwards, check layouts at 1280, 768 and 390 for overlap, and test playback, mapping and keys in the browser.

## Technical details
- Files: `Groovebox.tsx` (row name click with dblclick-delay guard, learn persistence, CSS badge position), `useGroovebox.ts` (mod pitch → semitone offset through harmony snap; chord quality from global harmony), `PerformanceRack.tsx` (dblclick/shift solo through the existing toggleSolo), new `src/hooks/useQwerty.ts`, MIDI screen toggle, `src/index.css`.
- Investigate first how pitch modulation is applied today and why learn turns off on Performance, then fix those causes.
