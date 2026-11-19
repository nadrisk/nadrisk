# Restore the clean built-in wavetables with descriptive names

## What changes
1. **Bring back the earlier, cleaner sound.** All 20 built-in tables go back to the pure math-built shapes from the version before the recorded waves were added. No recorded material, so no low-res crunch.
2. **Make every table pristine.** Each shape uses only clean overtones, every shape is equally loud, and high notes stay free of harsh aliasing. The old "8-bit" table is replaced with a clean, bright shape so nothing in the list is gritty on purpose.
3. **No synth or brand names.** Each table is named after how it sounds:

| Now | New name |
|---|---|
| JUNO PWM | THIN PULSE |
| ACID 303 | RUBBER SQUARE |
| MINI FAT SAW | FAT SAW |
| VECTOR | MORPH SAW |
| RESO DIGI | GLASS PEAKS |
| DIGI HYBRID | FROST EDGE |
| CZ RESO SAW | WARP SAW |
| CZ RESO TRAP | KNEE SLOPE |
| FM BASS | METAL PUNCH |
| FM BELL | CRYSTAL BELL |
| FM BRIGHT | GROWL |
| BUCHLA FOLD | SINE FOLD |
| B3 DRAWBARS | WARM BARS |
| EPIANO A | SOFT TINE |
| EPIANO B | HOLLOW REED |
| CLAVINET | TWANG |
| VOWEL TALK | VOWEL GLIDE |
| HUMAN VOX | AIR CHOIR |
| GLASS HARM | ODD GLASS |
| LO-FI 8BIT | BRIGHT AIR |

4. **Saved sets keep working.** A set using any of these tables opens with the same table under its new name.
5. The credit for the recorded wave collection is removed from HELP.

## Technical details
- Restore src/audio/wtFactory.ts formulas from commit 6d28dc0; keep existing `fx:<slug>` ids so saved sets resolve unchanged; only display names change.
- Replace the lofi quantized generator with a smooth bright additive shape.
- Delete src/audio/wtFactoryData.ts and scripts/wt-extract.py; remove AKWF credit in InfoOverlays.tsx.
- Update wtFactory.test.ts: 20 tables, equal RMS, no brand words in names (JUNO, 303, PROPHET, PPG, CZ, FM, BUCHLA, B3, RHODES, WURLY, CLAV, MOOG, DX).
