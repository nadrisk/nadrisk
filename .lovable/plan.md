# Spectral synth: GATE, TIGHT, SHIFT redesign

Yes, that makes sense. Each band's bar height becomes its "stability": a full bar is clear and steady, a lowered bar sounds thin and unstable, and a very low bar breaks into spectral fragments. GATE sets how strongly that happens.

## GATE: lower bars break apart
- GATE at 0: the bars only set loudness, like now (clean).
- As GATE rises, each band gets more unstable the lower its bar is:
  - **Full bar:** stays solid.
  - **Mid bar:** thins and shimmers (fast random level flutter, small pitch wobble).
  - **Low bar:** chops into short random spectral fragments that flicker in and out, with crystalline decay.
- The spectral gate stays on the whole voice. Its threshold follows GATE, so the weakest bands fall below it and break up first.
- The fragments are random and never lock to the tempo, so it can't sound like an arpeggiator again.

## TIGHT: band width
- High TIGHT: each band is a thin, focused strip, so only frequencies right at the band come through (glassy, whistling).
- Low TIGHT: bands are wide, so more of the source's frequencies are caught (thick, noisy, full).
- TIGHT no longer changes the per-band pluck/swell shaping. Note shape comes only from the ENV page, so the two don't fight.

## SHIFT: move the focus
- SHIFT already moves all bands together up or down (±2 octaves). It will glide smoothly while a note is held, so you can sweep the focus point live.

## Screen
- The BND bars draw solid when full and break into dotted, flickering pixels as GATE makes them unstable, so you can see which bands are fragmenting.

## Technical details
- `src/audio/spectral.ts`: per band, add an instability amount `u = gate * (1 - level)`. Pre-baked noise is lowpassed per band (rate rises with u) and fed into the band's gain (flutter depth ∝ u) and its bandpass detune (±20 cents · u). When u > 0.6, a hard-gated noise drives the level to make fragments. Shared noise buffers only; nothing new is built per hit beyond the band's own nodes.
- Specgate threshold becomes `-70 + gate * 40`, release `0.3 - gate * 0.2`.
- TIGHT maps to bandpass Q, 2 to 40 logarithmic. BLUR keeps its detune/noise role and also widens Q slightly. Remove the tight-based A/D/S per band.
- The voice `update()` glides SHIFT, TIGHT (Q) and GATE live. Older sets load unchanged with the same parameter keys.
- Tests: offline render checks that GATE 0 equals the clean output, and that GATE 1 with low bars yields a fluctuating band envelope.
