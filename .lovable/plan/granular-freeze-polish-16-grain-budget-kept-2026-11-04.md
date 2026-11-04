# Granular + Freeze polish (16-grain budget kept)

The grain limit stays at 16 so performance doesn't change. All improvements are about smoother sound and clearer screen feedback.

## What you'll notice
1. **Freeze holds where you hear it** — turning FRZ on mid-note locks the cloud at its current playhead, not back at the start point. Turning it off continues from there.
2. **Live freeze/position** — FRZ, POS, SIZE, SPRAY and density changes reach a held granular note right away instead of on the next hit.
3. **Frozen shimmer** — while frozen, grains get a tiny random position jitter (a few ms) so the held sound is a lush still cloud instead of a buzzy repeated slice.
4. **No clipped grains at the end of the sample** — spray and LFO wrap/reflect inside the start–end region, so grains near the end never get cut short or bunch up on one spot.
5. **Screen feedback on GRN page**
   - A moving cursor on the waveform shows where the cloud is reading.
   - When FRZ is on, the cursor becomes a solid bar with a small `||` mark.
   - Dragging the waveform on GRN shows `POS 42%` (not `STRT`).

## Technical details
- `src/audio/voices.ts` `playGrains`: read params through a mutable ref and expose `update(p)` on the returned Voice so the existing live-edit broadcast in `useGroovebox.ts` reaches it; freeze latches the current `pos`; frozen jitter ±~4 ms; replace the clamp with reflection inside `[lo, hi - grainLen]`; publish current read fraction per slot (plain module map, read by the screen's existing capped redraw — no React audio-frame state).
- Grain cap (16), node count and Hann window unchanged.
- `src/components/WispdiskPanel.tsx`: draw read cursor / freeze bar on GRN; waveform Zone label + readout switch to POS on GRN.
- Tests in `src/audio` for the pure position helper: reflection stays in range, freeze latch keeps position, jitter bounded.
- Verify: typecheck, tests, Playwright screenshot of GRN page with FRZ on/off. Actual listening stays for you.
