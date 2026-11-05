# AV: compact Strudel layout + one shared step grid

## How Strudel users keep a project tidy
- **All drums in one line.** Kick, snare and hats go into a single pattern using commas (`s("bd*4, [~ sd]*2, hh*8")`), not one block per drum.
- **Only a few blocks.** There is usually one `$:` each for drums, bass, chords and lead.
- **Short chains.** Effects are listed only when they move away from the default value.
- **One shared view.** Players draw one combined `_pianoroll()` or `_punchcard()` instead of one strip under every block. This is the step-sequencer view in your blue example.

## What changes
1. **Grouped code.** Each pad goes into one of four groups:
   - **drums:** every DRM and IDM pad, combined into one `s("…, …, …")` line
   - **bass:** BAS
   - **synth:** SYN
   - **samples:** SMP
   
   Each group gets one `$:` block. Pads that share a group and play the same notes are merged as well.
2. **Lean chains.** A pad's effects only show when they differ from the default sound. Per-pad `.velocity()` lines are removed, and chance stays visible as `?` inside the pattern. Most banks then fit in about 10–20 lines, not 45 or more.
3. **One step sequencer at the bottom.** A single grid replaces all the small punchcard strips:
   - one row per active pad, labelled `bd`, `sd`, `hh`, `c3` and so on
   - 16 columns that follow the bank's step count
   - lit cells for steps that are on, with brighter cells for higher velocity
   - a moving playhead column
   
   It is drawn in the 1-bit style and pinned above the AV controls, so the code above it stays short.
4. **Readability.** The text strips behind each line become more solid. The `< BG > + TV OUT CLOSE` controls get their own clear bar so they no longer sit on top of the code.

## Technical notes
- `src/vj/strudelDoc.ts`: add `groupPads()`. Build drums as a comma stack with `.bank("nad")`, and drop default-valued calls. `activeAtom` highlighting goes per stack layer.
- `src/vj/engine.ts`: remove the per-block punchcard. Add `drawSeqGrid(pads, step)` from the existing doc and step bus. No new audio routing.
- `VjOverlay.tsx`: give the controls a solid bar.
- Update `strudelDoc.test.ts`: four drum pads give one `$:` line, and chains leave out default values.
