# PATCH: a presets manager in the empty tab slot

A new **PATCH** tab fills the empty cell after MIDI. On desktop it also gets its own device panel. It uses the same 1-bit screen style as MEM.

## What a preset holds
- The selected pad's whole sound:
  - which instrument it is (DRM / SYN / SMP / PLY / 808 / SRN) and its mode (REESE, LASER, ACID…);
  - every sound setting, NOTE, chord settings and the channel EQ;
  - the full effects rack with its order and settings.
- **Not included:** rhythm, phrases, mute/solo, the pad's name and its choke group, so loading a preset never changes your patterns.
- **Sampler presets:** they remember which built-in sample they use. Imported audio is embedded only in exports (like MEM's EXP+); otherwise it's referenced while the file is still loaded.

## Screen and keys
- A scrolling list shows each preset's name and an instrument tag (e.g. `ACID BASS  808`). Tap a row to select it; a DRAG / arrows zone scrolls the list.
- **SAVE:** stores the current pad as a new preset.
- **OVR:** overwrites the selected preset (asks for confirmation).
- **LOAD:** applies the selected preset to the current pad.
- **REN:** renames the selected preset, using the same pixel entry box as BPM/TUNE.
- **DUP:** copies the selected preset.
- **DEL:** deletes it (asks for confirmation).
- **EXP:** exports one preset file. **BANK:** exports the whole preset bank as one file.
- **IMP:** imports a single preset or a whole bank file. Names that already exist get a number added; nothing is overwritten.
- The filter key cycles ALL / current instrument, so a long list stays usable.
- Double-tapping a preset loads it.
- The list is saved in this browser and survives reloads, like MEM.

## Technical details
- New `src/audio/patchStore.ts`:
  - `Patch = { v, name, engine, sound: Pick<Slot, drum|synth|sampler|poly|bass|siren|chord|note|eq|fx>, samples? }`;
  - `capturePatch(slot)` and `applyPatch(slot, patch)` deep-copy values, and `applyPatch` passes them through the same hydration as set load (`drumDefaults`, siren/poly/808 mode defaults, the ACID-to-808 migration), so old or partial files load safely;
  - storage under `nadrisk.patches.v1`, with a bank file format `{ kind: "nad-patch-bank", v, patches[] }` and single-patch files `{ kind: "nad-patch" }`, both validated on import.
- New `src/components/PatchBank.tsx`: a 128x64 PixelScreen with labelled taps (MIDI-learnable). It reuses the rename entry box and `packSamples`/`unpackSamples` for imported sample audio.
- `useGroovebox` exposes `getPatch()` and `applyPatch(p)`, which rebuild that slot's effects chain and reload the sample buffer through the existing set-load paths.
- `Groovebox.tsx`: add a `patch` utility (label PATCH) to the tab list, the compact stack and the desktop device surface.
- Tests: patch round-trip, hydration of partial or old patches, import validation, and duplicate-name handling. A browser check covers save, rename, load across instruments, a bank export/import round-trip and the phone tab grid.
