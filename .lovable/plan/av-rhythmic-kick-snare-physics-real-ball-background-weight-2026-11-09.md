# AV: rhythmic kick/snare physics, real ball, background weight

## What changes
1. **Kick = push + spin.** Each kick gives the camera a forward surge and the object a burst of spin speed. Both coast down smoothly (like a real spun object slowing from friction) until the next kick, so motion lands on the beat.
2. **Snare = tilt + pop.** Each snare snaps the object to a slightly new angle (about 15–20°) and briefly scales it up (~1.2×), then it eases back to normal size within a fraction of a second. The new angle stays until the next snare.
3. **Bass no longer moves things.** Movement and rotation respond only to kick and snare.
4. **Background weight.** A soft blur/haze on the far background in the 3D scenes, a bit stronger during the kick surge, so motion feels heavy. The object stays sharp.
5. **Plasma.** Only the speed of the flow (liquid/tunnel/interference etc.) reacts: it rushes on the kick and settles back to cruising pace.
6. **Real ball.** Patterns wrap around SPHERE/MATTER like a globe, so there are no four-panel seams. Cube and pyramid keep their flat-face mapping.

## Technical details
- `src/vj/engine.ts`: replace the travel/rotation multipliers with state: `spinVel += kickImpulse`, `spinVel *= exp(-drag*dt)`, `rotationTime += (base + spinVel)*dt`; `travelVel` works the same way for kick. Snare: `tiltTarget += ±0.3 rad` (alternating sign), a smoothed `tilt` follows it, and a `pop` envelope decays fast (~120 ms). Drop bass from the motion formulas. Add a separate `plasmaTime` that advances with the kick-driven speed.
- `renderer.ts`/`shaders.ts`: new uniforms `uTilt` and `uPop` (scale applied in object space), and `uBlur` (background blur amount). Background blur is done as a cheap mix toward fog/haze based on distance and depth (no extra pass), applied only to rays that miss the object. The PLASMA program uses the kick-driven time.
- `skin()`: for SPHERE/MATTER, use spherical UVs (atan2/asin of the object-space normal), with seam-safe derivatives; keep triplanar mapping for the other shapes.
- Still uniforms only, so changing options never recompiles shaders. Update the vj tests: the engine's kick sets spin speed, which decays; snare pop returns to 1; bass leaves motion unchanged.
