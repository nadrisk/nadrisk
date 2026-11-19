# Make the 20 built-in wavetables sound like their names

## Goal
Rebuild each built-in table from real reference waves, so its 4 shapes sound like the named machine. Sweeps must stay as smooth as BASIC WAVES.

## Where the reference waves come from (honest per source)
1. **Real single-cycle recordings (free to use, CC0):** the Adventure Kid AKWF collection. It has captured waves from electric pianos, clavinet, organ, analog synths, FM chips, chiptune and voices. These will be used for JUNO, ACID 303, MINI, RHODES, WURLY, CLAVINET, B3, LO-FI 8BIT, CHOIR, VOWEL and the FM tables wherever a matching capture exists.
2. **Published circuit and chip formulas:** for machines whose sound comes from a known algorithm rather than a recording:
   - CZ RESO SAW / CZ RESO TRAP: Casio phase-distortion equations
   - FM LATELY BASS: the TX81Z's 8 operator waveforms with its algorithm
   - FM BELL: DX7 ratio/index values
   - BUCHLA FOLD: the 259 folding curve
3. **Factory ROMs (PPG, Prophet VS, Microwave):** these are copyrighted, so I won't copy them. Each will get a close rebuild from documented descriptions. If a rebuild isn't convincing, the table will be renamed to describe its sound (for example "RESO DIGI") rather than claiming a model.

## How each table is built
- A one-time offline script reads the reference waves and keeps the strength of the first 64 overtones of each one.
- Only those numbers are stored in the app. No audio files get added, and nothing downloads at play time.
- Each table still has 4 keyframes ordered for a sensible sweep (e.g. Rhodes soft to hard strike). All 4 are balanced to the same loudness and use the same smooth engine as BASIC WAVES.
- The source of each table goes in a short comment next to it, so you can check where it came from.

## What stays the same
IMPRT for your own .wav tables, deleting tables, the library layout, the WT envelope, LOOP/sync, and saved sets (each set keeps its chosen table id).

## Checks
- The automatic tests stay: 20 tables, 4 shapes each, equal loudness, no dip halfway between shapes.
- A new test compares each table against its stored reference overtones, so they can't drift by accident.
- I can't verify by ear. You'll get a list of which tables are real captures, which come from formulas, and which were renamed.

## Technical details
- New `scripts/wt-extract` (Node script, not shipped): decodes AKWF WAVs, runs a DFT, writes harmonic magnitudes into `src/audio/wtFactoryData.ts`.
- `src/audio/wtFactory.ts` reads from the data file for captured tables and keeps the formula generators (PD, TX81Z, fold) for the rest. Ids `fx:<slug>` stay the same, so sets keep working. A renamed table keeps its old id.
- AKWF license credit goes in the About overlay credits line.
- Update the `src/audio/AGENTS.md` rule on where factory table data comes from.
