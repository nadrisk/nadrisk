# Add five 90s keys presets to PAD

Add five piano / electric piano sounds after the 12 pads, so the bank runs 01–17. They stay in the 90s atmospheric DnB / jungle palette and are built in code (no sample downloads).

| # | Name | Type | Character |
|---|------|------|-----------|
| 13 | JUNGLE PNO | PNO | Bright, punchy rave piano stab, fast hammer, short compressed decay, cuts through breaks |
| 14 | BUKEM RHODES | EPNO | Warm, soft tine, rounded top, slow wide chorus, long tail for m9/m11 chords |
| 15 | JD SPACE EP | EPNO | Soft EP body plus a shimmering FM bell tine, big long reverb |
| 16 | MKS DIGITAL | PNO | Slightly metallic, detuned digital piano, snappy decay, small room |
| 17 | VINYL JAZZ | PNO | Dark, dusty sampled-record piano, gentle drift; AGE makes the tails crackle |

## What you'll see and hear
- `<` / `>` and the VAL knob step through all 17 and wrap 17 → 01.
- The display shows `(PNO)` or `(EPNO)` on these.
- Keys start their sound on tap like a piano, then fade naturally even if you hold (they don't sustain flat like pads); release still lets the tail ring.
- BRT, MOTN, SPCE, AGE start at 0 like the other presets; XY pad, chords, NOTE/OCT work the same.
- Existing 12 pads and saved sets are unchanged (preset numbers 01–12 stay the same).

## Technical details
- `src/audio/padPresets.ts`: add tables `epno` (strong fundamental + soft 2nd/3rd, near-sine tine) and `pno` (bright decaying harmonic series with slight odd/even imbalance) to `PadTable` and `padPartials`. Append 5 recipes using existing fields: a ≈ 0.002–0.005, s ≈ 0 so the existing ADSR gives piano decay (d 1.5–4 s), `fm` for the hammer/tine burst (JD SPACE EP ratio 7, short decay; RHODES ratio 1 low amt; JUNGLE ratio ~3.5 very short), `swell` negative for filter closing over the decay, cutoffs ~4000 / 1800 / 5000 / 3500 / 1400, verb per character (JD SPACE size ~8).
- `src/components/PadPanel.tsx`: extend `CAT()` so these names map to `PNO` / `EPNO` (checked before the BELL/FM rule).
- Verify preset count/wrap uses `PAD_PRESETS.length` everywhere (VAL range, arrows); fix any hard-coded 12.
- Tests in `pad.test.ts`: 17 presets, wrap 17→1, new presets render finite audio and decay toward silence while held.
