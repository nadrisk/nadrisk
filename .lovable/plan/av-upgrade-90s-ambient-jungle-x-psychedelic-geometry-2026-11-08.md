# AV upgrade: 90s ambient jungle x psychedelic geometry

Direction: slow, warm, hypnotic — like a Future Sound of London / LTJ Bukem rave tape projected on a club wall. Rolling breaks drive motion; pads breathe colour; nothing flashes harshly. Everything stays in the existing 1-bit pixel + optional cosine colour look, offline, no new libraries.

## 1. TUNNEL becomes a winding jungle wormhole
- Real forward travel with momentum: the camera flies down a curved path that bends and sways (curved-path tunnel warp), speed eases up with BPM and breaks, never snaps.
- Walls built from layered rings of organic texture (vine-like noise bands, fractal leaf patterns) instead of flat stripes, with fog fading into the distance.
- Kicks push a pulse wave down the tube; snares/breaks ripple the walls; pads tint the far end like a glowing horizon; bass slowly widens the throat.

## 2. DEPTH becomes a floating monument in a world
- Keep the noise-displaced crystal, but place it in a scene: a perspective ground grid drifting toward you, a slow horizon line, and a few orbiting rings and floating shard dust at different depths for parallax.
- Wireframe cage around the crystal that rotates opposite to it (classic 90s SGI demo feel).
- Pad reactions light the crystal from inside: kick pulses the core, hats light spike tips, chords shift the cage hue, bass bends the ground grid like a wave.

## 3. CAM becomes a psychedelic contour feed
- Edge detection (outline of you and the room) instead of raw dithered noise, so it reads as a wireframe silhouette.
- Slow feedback trails and a gentle kaleidoscope/mirror option, giving a melting, tripping look rather than a forced filter.
- Pads ripple the outlines; reverb/delay lengthens the trails.

## 4. Shared feel
- One gentle "breathing" clock tied to tempo so all three move laid-back at half/quarter time, with breaks adding faster micro-detail on top.
- Colour mode keeps our hue palette; each backdrop gets warmer, deeper default tones.

## Technical details
- `src/vj/ambient.ts`: replace polar TUNNEL with curved-centre path (x0(z), y0(z)), 1/r depth, noise-band wall texture, depth fog, travel offset integrated over time.
- `src/vj/depthcore.ts` + `engine.ts`: add pure generators for ground grid, orbit rings, cage (icosphere lo edges), particle dust; draw back-to-front with existing tri()/line().
- `src/vj/raster.ts`: add Sobel edge pass and feedback buffer blend for CAM; optional mirror fold; camera lifecycle unchanged.
- Reactions reuse `src/vj/reactions.ts` and the existing 20 Hz analyser bus — no new audio routing.
- Keep within frame gate; bounded particle/ring counts; extend existing vitest files (tunnel path continuity, edge pass on a test image, bounded counts).
