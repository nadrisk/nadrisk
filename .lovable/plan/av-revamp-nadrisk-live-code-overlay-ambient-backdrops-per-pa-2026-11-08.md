# AV revamp: Nadrisk live-code overlay, ambient backdrops, per-pad reactivity

## What you will get
1. **CODE overlay you can toggle** — a CODE key on the AV controls (and the C key) shows/hides it. Off by default, so visuals run clean.
   - Replaces the boxy tracker matrix with a Nadrisk-flavoured patch text, e.g.
     `$01 kick.ukg  |> x . . . x . . .  cut 0.42`
     one line per pad, the playing step highlighted, lines flashing when that pad hits, muted pads dimmed.
   - Drawn semi-transparent over the visual, left-aligned in pixel type; never Strudel's look or wording.
2. **Backdrop lineup** (cycled with the existing model key): DEPTH (kept), AURORA, PLASMA, TUNNEL, CAM (kept), NONE. SWEEP is folded into the new ones.
   - AURORA: slow drifting ribbons of colour, 90s ambient.
   - PLASMA: soft morphing liquid blobs, generative gradients.
   - TUNNEL: slow rotating concentric rings, laid-back hyperspace.
   - All use the existing colour hue sweep (COLR toggle), stay 1-bit dithered when colour is off, and move slowly by default.
3. **Every pad affects the picture** — each of the 16 pads owns a spot on screen and a reaction by sound type:
   - kick / bass: slow shockwave ring + colour bloom from its spot
   - snare / clap: soft horizontal light sweep
   - hats / perc: stardust sparkle near its spot
   - pads / chords / synth: colour wash whose hue follows the note
   - sampler: scanline ripple
   - Pad filter brightness widens the bloom; reverb/delay amount lengthens the trails.
   Reactions are gentle and decay smoothly so the result stays laid-back, not strobing.
4. TV pop-out window keeps working and remembers CODE on/off and backdrop.

## Technical section
- `src/vj/codeDoc.ts`: new pure `codeLines(pads, step, bank)` producing the DSL text + highlight spans; tests updated. `trackerDoc.ts` removed from the render path.
- `src/vj/bus.ts`: `VisualState` gains `code: boolean`; new `{t:"code"}` control cached like `color`, restored on `hello`.
- `src/vj/ambient.ts` (new, pure): `aurora`, `plasma`, `tunnel` field functions on a low-res buffer (reusing `noise.ts`, `raster.ts` Bayer dither, `colorSweep.ts` palette), rendered at reduced resolution and upscaled, gated by existing frameGate / slow-frame fallback.
- `src/vj/reactions.ts` (new, pure): bounded pool (max ~32) of decaying impulses `{x,y,kind,hue,age,life}`; pad index → fixed 4x4 screen origin; life scaled by pad fx reverb/delay mix, radius by `cut`. `VjEngine.hit()` pushes into it; each backdrop samples it.
- `engine.ts`: MODELS = DEPTH, AURORA, PLASMA, TUNNEL, CAM, NONE; old saved model indices mapped safely.
- `AvControls.tsx`: CODE key. No audio routing changes; still uses the silent analyser bus.
- Tests: codeLines output, reaction pool cap/decay, pad→origin mapping, model index migration.
