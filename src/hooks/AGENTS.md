# Hooks
- MIDI learn binds CC/notes to controls by their aria-label and drives them via synthetic DOM events (src/hooks/useMidi.ts), so every labelled control is mappable without per-control wiring.
- MIDI KBD mode (useMidi keys flag) routes every note to the selected pad via keyOn/keyOff in useGroovebox (semi = note-60, ±24), so pad mapping and keyboard play never share notes at once.
- Keyboard step recording: REC with transport stopped writes one step per key (60 ms chord collapse keeps the first note) into a range-24 exact-pitch lane (ModLane.range), so recorded notes play back at the played pitch.
- Step arrays are always STEPS (32) wide; each bank's steps (16|32) caps row lengths and bank-switch timing, and the grid shows one 16-column half at a time, so 16-step sets load unchanged.
