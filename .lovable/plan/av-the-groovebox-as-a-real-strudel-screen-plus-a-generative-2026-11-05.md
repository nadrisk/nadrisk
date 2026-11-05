# AV: the groovebox as a real Strudel screen, plus a generative noise-displaced Depthcore

## 1. Strudel screen (replaces the typing editor)
The code no longer types itself. It shows the whole current groovebox, written out as one finished Strudel program and laid out the way the real Strudel REPL looks:

- **Top bar** in Strudel's own style: the `strudel` wordmark and `REPL`, then `play/stop` and `update` buttons showing the transport state. On the right are the tempo and `cps`.
- **Editor**: Strudel's monospace code with line numbers. The code sits directly over the visual with no solid blocks behind it. Real Strudel uses a dark see-through background, so the text keeps a thin dark outline to stay readable. Long code is allowed to run over the backdrop.
- **Code mirrors the groovebox exactly**, built from the current pattern bank rather than from hits:
  ```text
  setcps(128/60/4)

  // A · pad 1 KICK
  $: s("bd*4").bank("RolandTR909").gain(.9)
    .lpf(6000)

  // pad 5 SYN
  $: note("<c3 eb3 g3>").s("sawtooth")
    .attack(.005).release(.15).lpf(900).room(.4)
  ```
  - Every pad that has steps in the current bank gets a `$:` block. Muted pads show `_$:`, and soloed pads are marked too, matching Strudel's own mute convention.
  - Step velocity becomes `.velocity("…")`, and chance below 100% becomes `?` (for example `hh*8?`). Track lengths other than 16 become `.slow()` or `.fast()`. Phrase and chord pads use `note("[c3,e3,g3]")` chords.
  - The pad's real engine, filter, envelope and active effects become chained calls.
  - The code updates when you edit the sequencer, switch bank, or change a sound.
- **Live highlighting like Strudel**: each word in the pattern gets the outline box at the moment it actually plays. This uses the same step clock as the grid, so it stays in sync.
- **Inline `_punchcard()` widgets**: a small 1-bit pianoroll-style strip under each block, like Strudel's inline visuals, with a playhead.
- **Colours**: Strudel's syntax highlighting is mapped onto the current DISP theme using shades of the theme colour. Keywords, strings, numbers and comments are told apart by brightness and weight, so it stays 1-bit-themed.

## 2. Generative Depthcore: a real 3D mesh with noise displacement
This follows how TouchDesigner artists usually build this look: a dense base mesh (sphere, torus or plane) pushed outward along its own normals by animated 3D noise. In TouchDesigner that's the Noise SOP, or a GLSL vertex shader with simplex or fBm noise. Feeding the noise its own output (domain warping) and using ridged noise gives sharp crests and folds. Shading is flat per face, so the facets read.

How it will work here:
- **Base topology**: a dense icosphere of about 2,500 vertices. It slowly morphs between three base shapes (sphere, torus, twisted ribbon fan), so it never settles into one form. The current ribbon fan becomes one of these states instead of being dropped.
- **Displacement**: 3D simplex fBm with domain warping plus ridged noise, pushed along the vertex normals. The noise moves through time, so the surface keeps flowing and folding.
- **Sound control**:
  - Kick: a short burst of displacement amplitude (spikes).
  - Snare: jumps the noise to a new region (sudden reshape).
  - Hats: fine high-frequency surface detail.
  - Synths and bass: raise the warp, for slower and more melted folding.
  - Loudness: raises the overall displacement.
- **Look**: flat-shaded facets with one key light and one rim light. These are converted into the theme's two colours with dither patterns, and the brightest crests get crisp edge lines.
- Still a single object: no satellites or particles.
- Performance: the mesh is drawn at the existing low pixel resolution. On phones it drops to about 640 vertices automatically if frames slow down.

## 3. Unchanged
The name stays **AV**, and so do the backdrop choices (DEPTH, CAM, SWEEP, NONE), the TV OUT window and both pop-out links.

## Technical section
- New bus message `{ t: "doc", bank, bpm, pads: [...] }`, sent from `useGroovebox.ts` only when the bank, pattern, lengths, vel/chance, mute/solo or a slot's sound fields change. It is debounced to about 150 ms and also sent on `hello`, so the TV window gets it.
- `src/vj/strudelDoc.ts` (pure) turns pads into Strudel lines with token spans. `miniNotation()` is kept and extended with `?`, velocity and length. `liveCode.ts` (the typist) is removed.
- Highlighting maps the transport step to an atom span, the way the current `atomSpan` does.
- `src/vj/noise.ts` holds seeded 3D simplex, fBm, ridged noise and domain warp. `src/vj/depthcore.ts` becomes mesh generation, base-shape morphing and normal displacement, reusing the existing triangle rasteriser with painter's sort and back-face culling.
- Tests:
  - `strudelDoc.test.ts`: four-on-the-floor, a muted pad becomes `_$:`, chance gives `?`, track length gives `.slow`.
  - `noise.test.ts`: deterministic and bounded output.
  - `depthcore.test.ts`: vertex count is bounded and displacement is zero when amplitude is zero.
- The AGENTS.md rule for AV is updated.
- Verification: Playwright screenshots at 1280x720 and 393x706 of the real groovebox AV overlay with a beat programmed.
