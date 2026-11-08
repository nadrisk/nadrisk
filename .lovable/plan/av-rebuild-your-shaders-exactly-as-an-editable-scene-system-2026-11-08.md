# AV rebuild: your shaders, exactly, as an editable scene system

## The promise this time
Every look comes from the shaders you pasted, ported line for line. Their colours, shading, fog, camera movement and speed stay exactly as written. Nothing gets "reinterpreted", no added hues, no colour sweep on top. Before I call it done, I render each of your original shaders and our version side by side in the same browser at the same moment and compare the pictures. If they don't match, it isn't finished.

## What you will be able to pick (AV controls)

```text
WORLD   SPACE  |  PLASMA  |  CAM  |  NONE
```

### SPACE (the 3D world)
- **GROUND**: FLAT (the endless reflective floor with the misty horizon, from *Infinite place* and the rotating-sphere one) or CLOUDS (the *Cloud diving* flight through cloud layers).
- **OBJECT**: NONE (just the space), SPHERE, CUBE, PRISM, TORUS (plain geometric shapes only), or PIPE (the smooth pipe structure from *Infinite place*).
- **MOTION**: FLOAT (slow hover and turn), JUMP (shape hops on the floor), ORBIT (camera slowly circles it), DRIFT (camera glides forward like the original).
- Colours: only the original shaders' own sky, fog, sun and surface values.

### PLASMA (the 2D family)
- **FORM**: CLASSIC, TUNNEL, INTERFERENCE (the two-colour one), each taken from the matching shader you gave.
- **EFFECT**: NONE, PIXEL, DITHER (the exact pixel and dither methods from your examples).
- **COLOR**: one choice for each original shader's palette, plus 1-BIT (white on black, for the OLED look). Nothing else.

### CAM and NONE
Stay as they are now. The NAD code overlay (K key) still floats on top of everything.

## How the music moves it (gentle, never taking over)
Only the same four signals as today: kick, snare, hats, overall loudness.
- Kick: a small swell in object size / plasma pulse, or a little burst of flight speed.
- Snare: a short brightness lift on the surface.
- Hats: tiny shimmer in the pixel/dither grain.
- Loudness: slightly thicker mist or faster plasma drift.
All of these are small nudges on the shader's own movement, which stops on silence and returns to its natural pace.

## Controls
The AV screen gets a small row: WORLD, then the 3 choices for that world (GROUND/OBJECT/MOTION or FORM/EFFECT/COLOR), each stepped with arrows. ← / → still steps worlds. Every change also reaches an open TV window right away, same as now. Old saved choices (AQUA, TOTEM, BLOBS) open as SPACE · FLAT · SPHERE · FLOAT.

## What gets removed
AQUA, TOTEM and BLOBS, plus the colour-sweep tinting on scenes.

---

## Technical section
- New `src/vj/gl/`: one WebGL2 (WebGL1 fallback) full-screen quad renderer; fragment sources kept as separate `.glsl` string modules copied from `shaders_pasted.txt`, keeping each shader's math, constants and colour vectors untouched. Only additions: uniforms for `iTime`, `iResolution`, option selectors and the four audio bands, wired as small additive terms.
- SPACE: one raymarch shader assembled from the pasted sources: ground/fog/sky from *Infinite place* (FLAT) or the cloud-diving volume (CLOUDS); object SDF switch from hg_sdf/iq primitives already in the paste; pipe = the paste's `fOpPipe` structure; motion = camera/object path functions. Built per combination with `#define`s and cached, so no wasted loops.
- PLASMA: one shader per FORM; EFFECT and COLOR as `#define` post blocks using the paste's own pixelate/Bayer and palette functions.
- Render at reduced internal resolution (adaptive, existing slow-frame logic) and upscale with nearest filtering on the existing canvas for performance on phones. CAM keeps the current 2D raster path on a sibling canvas.
- `engine.ts`: `MODELS` becomes worlds; new `scene` options object in `bus.ts` visual state (broadcast + hello replay), migration of old model names. Context loss handled (rebuild programs on restore); GL disposed on unmount.
- Tests: option/migration logic and bus state; a shader compile check in Playwright for every combination.
- Fidelity check: Playwright page renders each original pasted shader (Shadertoy wrapper) and our matching preset at fixed times t=0,5,20 s; screenshots compared visually by me and with a pixel-difference score; any mismatch gets fixed before finishing.
- Update the AV rule in AGENTS.md/project knowledge (scenes now WebGL from ported sources; CAM unchanged).
