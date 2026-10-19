# Sequencer GEN: a musical generator next to RAND

## What you get
On the sequencer screen, a new **GEN** key opens a small pixel panel with three tabs. RAND stays as it is (quick random, page-aware, respects the ·/X/S row keys).

### 1. BREAKS
- Writes real drum grooves, not scattered hits.
- Styles: **AMEN** (jungle), **2STP** (2-step/UKG), **DNB** (roller), **BOOM** (boom bap), **IDM** (glitchy, off-grid feel: displaced kicks, stuttering rolls, odd-length row loops), **4/4** (four-on-the-floor).
- **DENS**: how busy (ghost notes, extra hats).
- **FILL**: end-of-bar rolls and turnarounds (uses the ROLL values).
- **VAR**: how different bar two is from bar one (in 32-step view).
- Also writes velocities (accents, soft ghosts) and a little chance on ghost notes.

### 2. RANDOM
- A controlled version of RAND: **DENS**, **VEL range**, **CHNC amount**, **ROLL amount**, and a **SEED** key to re-roll the same settings.
- Only touches rows marked · or S, same as RAND.

### 3. PHRASE (bake)
- Takes the selected pad's phrase (the PHRASE sequencer) and writes it into that row as steps, with its notes recorded on the pitch mod lane (like MIDI step recording).
- After baking, the phrase is switched off so the notes don't play twice.

### Pad roles (BREAKS)
- Auto-detects KICK / SNARE / HAT / OPEN HAT / PERC from each pad's drum type and name.
- A ROLE page lets you override each pad (or set it to NONE so it's left alone).

### Behaviour
- Acts on the current bank (A or B) and current length (16 or 32).
- **GEN** applies; one Undo reverts everything it wrote.
- Saved with the set like any pattern; nothing about sounds changes.

## Checks
- Tests: each break style puts kick/snare on the expected beats; DENS 0 vs 1 changes hit count; excluded rows untouched; phrase bake writes the same notes the phrase plays and turns the phrase off; one undo restores the old pattern.
- Browser check: open GEN, generate each tab, confirm grid updates and undo works.
- Your ear test: try each style at a few tempos.

## Technical details
- New `src/audio/patternGen.ts`: pure functions `genBreak(style, opts, roles, steps)`, `genRandom(opts, seed)`, `bakePhrase(arp, harmony, steps)` returning per-row note/vel/chance/ratchet/mod arrays (seeded PRNG for testability).
- `src/audio/padRoles.ts`: `detectRole(slot)` + optional `slot.role` override (backward-compatible set hydration).
- `useGroovebox.ts`: `applyGenerated(result)` writes into `banks[bank]` via existing editBank/editLane in one undo step; respects `rnd` flags.
- `Groovebox.tsx` SeqScreen: GEN key opens a `GenScreen` (PixelScreen + Panel tabs BRKS/RAND/PHRS/ROLE, knobs via existing Knob type).
- Tests in `src/audio/patternGen.test.ts`.
