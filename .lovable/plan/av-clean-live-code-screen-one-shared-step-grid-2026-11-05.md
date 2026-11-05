# AV: clean live-code screen + one shared step grid

## Goal
Keep the look of live-coded music, with code written over the visual, but brand it as the Nadrisk groovebox only. Remove the Strudel name, the REPL top bar and every Strudel reference, and cut the clutter.

## What changes
1. **No Strudel.** Remove the `strudel REPL` bar and the stop and update buttons. Remove any wording that mentions Strudel, both on screen and in the code comments the screen displays. The top of the screen shows one small line: `// nadrisk groovebox · bank A · 124 bpm`.
2. **Grouped code, the way live coders avoid clutter.** Pads are combined into at most four short blocks:
   - **drums:** every DRM and IDM pad in one line with comma layers, e.g. `s("bd*4, [~ sd]*2, hh*8")`
   - **bass**
   - **synth**
   - **samples**
   
   Each block shows effects only when they differ from the default sound. The per-pad velocity lines are removed, and chance stays visible as `?`. A busy bank then fits in about 10–20 lines.
3. **One step sequencer.** A single grid at the bottom replaces all the small strips:
   - one row per active pad, labelled `bd`, `sd`, `hh`, `c3` and so on
   - 16 steps
   - lit cells for steps that are on, brighter for louder steps
   - a moving playhead
   
   It mirrors your sequencer exactly and is drawn in the 1-bit style.
4. **Readability.** The text strips behind each line become more solid. The `< BG > + TV OUT CLOSE` controls get their own clear bar so they never sit on top of the code.
5. **Highlighting stays.** The currently sounding word keeps its outline box, in time with playback.

6. **More Depthcore background.** The current shape reads as a noisy blob. Real Depthcore art is built from hard, glassy shards with strong light and shadow and a deep sense of space. The shape changes in four ways:
   - **Low-poly facets:** fewer, larger flat faces with crisp edges, so it looks like cut crystal, not fuzz.
   - **Shards:** stepped noise pushes whole faces out into sharp spikes that radiate from the centre.
   - **Hard lighting:** one strong light gives faces either solid fill, dither or black, with bright edge lines on the ridges.
   - **Depth:** faces further away fade into a sparser dither. The shape slowly turns, with a kick pushing shards out and a snare re-cutting the facets.
   
   It stays one single shape with no extra objects.

## Technical notes
- `src/vj/strudelDoc.ts` → rename to `codeDoc.ts`. Add `groupPads()`, build drums as one comma stack, drop default-valued calls, and drop the `setcps` and header lines.
- `src/vj/engine.ts`: remove the REPL header and per-block punchcards. Add `drawSeqGrid(pads, step)` from the existing doc and step bus. No audio changes.
- `VjOverlay.tsx`: give the controls a solid bar.
- Update the tests (renamed to `codeDoc.test.ts`):
  - four drum pads give one block
  - default values are left out
  - no output contains "strudel"
- `src/vj/depthcore.ts`:
  - switch to `icosphere(1–2)` with per-face (not per-vertex) displacement along the face normal using quantised ridged noise
  - backface culling, painter's sort, and flat Lambert shading mapped to 3 dither levels
  - edge pass on high-angle ridges and depth-based dither fade
  - update `depthcore.test.ts` (faces stay planar, displacement is bounded)
- Update the AGENTS.md AV rule to drop the Strudel wording.
