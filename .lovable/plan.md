# Rename IDM to PRC + Chord-locked phrases

## 1. Rename IDM to PRC
- Engine bar, panel header, screen title, knob readouts and patch names show **PRC** instead of IDM.
- Saved sets and patches keep loading exactly as before (only the shown name changes).

## 2. CHRD lock for the phrase sequencer
- New **CHRD** key in the phrase header (on/off, saved with the pad).
- When on, every phrase note snaps to the pad's chord tones (root, 3rd, 5th, 7th per the current chord and Harmony key), repeated across octaves.
- Applies to all phrase sources: TRNC patterns, EUCL, RAND/ROLL phrases, walks and directions. Rhythm, gate and density stay untouched; only pitch is locked.
- If the pad has no chord, CHRD falls back to the Harmony scale; if neither, notes pass through unchanged.
- BAKE writes the locked notes into the grid.

## Technical details
- `src/audio/arp.ts`: add `chordTones(slot, harmony)` and a `lockToChord(semi, tones)` nearest-tone snap, applied in the phrase step pitch path after direction/interval math.
- Slot gets `phrase.chordSync: boolean` (default false), hydrated with a default for old sets.
- `ArpEditor.tsx`: CHRD header key.
- Rename strings in `SlotScreens.tsx`, `IdmPanel.tsx`, `PatchBank.tsx`, `patternGen.ts`; internal kind id stays `idm` for compatibility.
- Tests: chord lock only emits chord tones for TRNC, EUCL and random phrases; off = unchanged output; label shows PRC.
