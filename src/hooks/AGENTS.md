# Hooks
- MIDI learn binds CC/notes to controls by their aria-label and drives them via synthetic DOM events (src/hooks/useMidi.ts), so every labelled control is mappable without per-control wiring.
- MIDI KBD mode (useMidi keys flag) routes every note to the selected pad via keyOn/keyOff in useGroovebox (semi = note-60, ±24), so pad mapping and keyboard play never share notes at once.
