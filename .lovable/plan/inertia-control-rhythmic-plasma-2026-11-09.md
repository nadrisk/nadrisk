# Inertia control + rhythmic plasma

## What you get
- A new **INERT** button on the AV bar (next to MAT) opening a small popup with four steps: **MIN / MID / HIGH / MAX**.
  - MAX = today's feel (strongest push and longest coast).
  - MIN = slightly weaker than the old baseline; kicks settle almost immediately.
  - Default: MAX. Choice is mirrored to AV OUT windows.
- PLASMA forms and the tunnel visibly react to drums:
  - Kick: the pattern/tunnel rushes forward and coasts back to cruise speed, following the same INERT setting.
  - Snare: a quick radial pulse (tunnel) or phase jolt (other forms) on beats 2 and 4.
  - No colour flashes, palettes stay exact.

## Technical details
- `src/vj/gl/options.ts`: add `inertia` option (0..3), default 3; legacy sets hydrate to 3.
- `src/vj/engine.ts`: table per step `{spin, spinDrag, travel, travelDrag}`:
  MAX 3.6/1.2/2.0/2.2, HIGH 2.8/1.4/1.6/2.4, MID 2.2/1.6/1.3/2.6, MIN 1.2/2.4/0.7/3.2. Kick impulses and decays read from it.
  PLASMA render passes `uBand = {x: pop, y: 0, z: min(1, travelVel/3)}` and `uTravel = plasmaTime` instead of zeros.
- `src/vj/gl/shaders.ts`: tunnel depth uses `uTravel` instead of `iTime*0.2`, snare adds small fov/ring expansion from `uBand.x`; other forms advance phase via `uTravel` and add a small `uBand.x` phase jolt. Uniform-only, no new programs.
- `src/vj/AvControls.tsx` + `index.css`: INERT popover reusing `.av-materials` styling; sends existing `opt` bus message so AV OUT syncs.
- Tests: `motion.test.ts` — MIN decays faster and peaks lower than MAX; MAX matches current values; plasma receives non-zero band after a kick. `switching.test.ts` still shows one PLASMA program.
