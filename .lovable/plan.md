# MIDI + stem export

Take a Nadrisk beat into any DAW: one MIDI file for the arrangement, and one WAV per pad (stems), all at the set's tempo and loop length.

## What you get
- **EXPORT** key in the Memory/Tape area opens a small pixel screen with three choices:
  - **MIDI** — one `.mid` file, one track per active pad, named after the pad (e.g. `HOUSE KICK`). Drums go on channel 10 with General MIDI notes (kick 36, snare 38, hat 42...), pitched pads keep their real notes, phrase notes, chords, ties and velocity.
  - **STEMS** — one WAV per active pad, rendered with that pad's own sound, mixer and FX, plus a `MASTER.wav`, zipped into one download.
  - **BOTH** — MIDI + stems in one zip.
- Options: **BANK** (current / all A–D in a row), **LOOPS** (1, 2, 4, 8 bars), **TAIL** (adds reverb/delay ring-out so stems don't cut).
- Progress bar while rendering; CANCEL stops it. Muted pads are skipped; solo is honoured.
- Every stem starts at bar 1 and has the same length, so they line up when dropped into a DAW.
- Native app: files go through the share sheet instead of a download.

## How it behaves
- MIDI export is instant and doesn't touch audio.
- Stems render faster than real time in the background — playback, sound and saved sets are never changed. Chance steps (`?`) use one fixed seed so MIDI and stems match.
- Performance effects (stutter, tape stop, DJ filter) are not baked; XY motion and HACK are, because they're part of the pattern.

## Technical details
- New pure `src/audio/exportMidi.ts`: walks banks via existing `stepAt()`, slot.note, phrase/chord/tie helpers and harmony → note events; written with `@tonejs/midi` (MIT). Unit tests: step → tick timing at the set's BPM, GM drum mapping, ties lengthen notes, velocity scaling, muted pads excluded.
- New `src/audio/exportStems.ts`: `Tone.Offline` render per pad reusing the existing voice graphs (drum/synth/sampler/808) and FX rack hydration, then the master chain for MASTER; WAV via existing `encodeWav` in tape.ts; zip with `fflate` (MIT). Render capped (e.g. 8 bars × 16 pads) to protect memory on phones; one pad at a time, yielding between pads.
- Deterministic RNG seed passed to the scheduler path for chance/HACK so outputs repeat.
- UI: `ExportScreen` PixelScreen with labelled hit-zones, following the DevicePanel/PixelScreen rule.
- AGENTS.md rule: exports are read-only snapshots of the set rendered offline and never mutate state.

## Not included
Audio stem export of live input, video export of AV, and MIDI import (could follow later).
