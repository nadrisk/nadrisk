# Sampler XY: useful sample controls, no detune

## Goal
On a sampler pad, the XY pad moves things that matter for samples. It keeps the feel of X = tight to open and Y = dark to bright. It never changes fine tune, so samples stay in tune.

## Mapping by sampler mode

| Mode | X: left TIGHT -> right OPEN | Y: down DARK -> up BRIGHT |
|---|---|---|
| One-shot / ADSR / loop | Sample END pulls in (shorter) or opens to the full length; envelope tightens or blooms | Tone: high shelf cut or boost, plus a gentle low-pass when dark |
| Vintage (stretch) | Stretch amount: tighter/faster or longer/slower; envelope tightens or blooms | Stretch grain size (small = brighter/grittier, large = smoother/darker) plus tone |
| Granular | Grain size and spray: tight and focused or wide cloud | Grain POSITION scans through the sample, plus tone |

- Fine tune is removed from the sampler XY entirely.
- Pitch is never touched by the XY on any sampler mode.
- END never goes past START, so the sound can't vanish. Granular position stays inside the sample.

## Screen feedback
- Corner labels change with the mode, so you always know what each direction does:
  - Standard: TIGHT / OPEN = END, DRK / BRT = TONE
  - Vintage: SHRT / LONG = STRCH, DRK / BRT = GRAIN
  - Granular: TIGHT / WIDE = SIZE, BACK / FWD = POS
- While dragging, the header shows the live values, e.g. "END 62% TONE +4", using the same readout style as the knobs.
- Labels use the same fixed slots as now, so nothing overlaps (the existing layout test still covers this).
- SET writes the current END / stretch / position / tone into the sampler knobs, as it does today.
- Recorded XY motion and the LFO drive these new targets automatically.

## Technical details
- `src/audio/xyMaps.ts` sampler branch: drop `fine` and `grainDens/grainRnd` from Y. Branch on `grain` / `stretch`:
  - standard: `end` (or `endFrac`) clamped to `start + 0.02 .. 1`, plus existing `envXY`.
  - vintage: `stretchAmt` octave sweep, `stretchGrain` on Y.
  - granular: `grainSize`, `spray` on X; `start`/grain position offset on Y, clamped 0..1.
  - Tone on Y for all modes via the slot's channel EQ `high` gain (+/-9 dB) and channel filter cutoff when below centre; included in `commitXY` output.
- Add a `xyAxisLabels(slot)` helper in `xyMaps.ts`, used by `XyScreen.tsx` for corner labels and the header readout.
- Tests in `xyMotion.test.ts` (or a new `xyMaps.test.ts`): sampler XY never changes `fine` or `pitch`; END stays above START; position stays in 0..1.
