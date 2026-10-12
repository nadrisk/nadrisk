# REESE mode for POLY

A POLY/REESE key on the poly screen, working like the siren's DUB/LASER switch. Each mode remembers its own sound. The first time you pick REESE, you get a ready-made deep, pulsing mono Reese bass.

## The sound
- **Mono:** one note at a time. Chords are ignored while REESE is on, and a new note cuts the old one. GLIDE slides the pitch between overlapping notes.
- **Core:** two saws detuned against each other, giving the slow phasing "beating" of a classic Reese. A third saw drifts gently so the beating never repeats exactly.
- **Sub:** a clean sine one octave down. It stays centred and unfiltered, so the low end holds on club systems.
- **Pulse:** a tempo-synced wobble on the filter, from slow 1 bar up to 1/16. It restarts on every note, so the pulse lines up with the beat.
- **Width:** the detuned saws spread left/right. The sub always stays centred.
- **Starting sound:** about 18 cents detune, a 380 Hz lowpass with light resonance, a 1/4 pulse at moderate depth, 60% sub, 40 ms glide, and an instant attack with full sustain and a short release. That gives a dark, rolling Reese that works for DnB, IDM, future garage and dubstep. You can then tune it by ear and tell me your settings, like with LASER.

## Screen (same 128x64 style)
- **REESE page:** DETUNE, DRIFT, WIDTH, SUB, with a picture of two waves pulling apart as detune rises.
- **PULSE page:** RATE (synced steps), DEPTH, SHAPE (sine to square), GLIDE, with a graph showing the wobble on the filter.
- **FLT and ENV pages:** reused as they are (CUT, RES, filter env, VOL/FLT ADSR), plus the NOTE knob.
- Controls follow the existing rules: frequency knobs use a logarithmic scale, every knob has a double-tap reset to the starting sound, MIDI learn works, and edits are heard while a note is held.

## Unchanged
- POLY mode's sound, chords, existing GLASS pad and older saved sets. Sets without a mode load as POLY.

## Checks
- Offline render: the result is mono and has the expected low end, the pulse lines up with the tempo, and glide works.
- Browser checks on desktop and phone: switching back and forth keeps each sound, the starting sound is right, resets, MIDI, set recall, rapid pad taps and sequencer playback.

## Technical details
- `PolyParams` gains optional `mode?: "poly" | "reese"` and `reese?: ReeseParams`, with `defaultReese()` in a new `src/audio/reese.ts`.
- `playPoly` branches to `playReese` (3 saws + sine sub, StereoPanner width, lowpass with an LFO set to `60/bpm * division` and phase reset at `t`, and an `update` handle for live edits).
- Mono and glide: the useGroovebox poly trigger path stops the pad's previous REESE voice. Glide uses `setTargetAtTime` on the new voice's frequency, starting from the last note.
- EnsemblePanel adds a mode key and REESE/PULSE pages. Record the rule in `src/audio/AGENTS.md`, and add tests in `reese.test.ts`.
