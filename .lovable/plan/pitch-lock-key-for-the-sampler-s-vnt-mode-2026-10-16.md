# Pitch LOCK key for the sampler's VNT mode

## What you get
- On the sampler's **BRK** page, when **VNT** (vintage stretch) is selected, a new **LOCK** key appears in the top-right corner, directly under the BRK and IN page tabs.
- **LOCK on:** the sampler always plays at the sample's original pitch. Slices triggered from different pads, keys, chords or sequencer notes pick their slice but no longer speed up or slow down, so each one sounds exactly like the source.
- **LOCK off:** works as now (notes above the root play higher).
- The key draws inverted when on, like REV / LOOP / VNT. It's stored with the pad, so sets and patches remember it; older sets load with LOCK off.
- LOCK shows only in VNT mode. BRK mode keeps its BPM readout and engine label where they are now.

## Notes
- FINE tune still applies with LOCK on, so you can still nudge the tuning if a sample is slightly off.
- Pitch modulation from the sequencer and the LFO is ignored with LOCK on. Otherwise slices would move away from their original pitch again.
- The VNT stretch amount (TIME) still changes the length without changing pitch. That's the point of VNT.

## Technical details
- Add `pitchLock?: boolean` to `SamplerParams` (src/audio/voices.ts) and the sampler slot defaults. Hydration falls back to `false`.
- In `useGroovebox.ts` sampler triggering (the `samplerRun` path for non-warp playback): when `stretch && !warp && pitchLock`, still use the note to choose the slice (`sliceOf`), but set the playback pitch to the fine offset only. Leave out the note, chord and modulation semitones. Glide is skipped for locked voices.
- WispdiskPanel BRK page: when not in warp, draw a box at about (100, 11, 26, 7) labelled LOCK, inverted when on. Add a `<Tap x={100} y={10} w={26} h={9} label="Lock sample pitch" pressed=...>` that toggles `pitchLock`. Move the `X1.00` readout so it doesn't collide.
- Patch store and set recall already copy sampler fields, so nothing more is needed there.
- Verify: a unit test that locked VNT playback ignores note offsets; a typecheck; and a browser check at 393px and on desktop that the key sits cleanly under the tabs.
