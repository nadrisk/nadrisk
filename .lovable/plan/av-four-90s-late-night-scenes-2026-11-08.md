# AV: four 90s late-night scenes

Replace the current AV backdrops with exactly four scenes. Mood: hypnotic, slightly psychedelic, uncanny, but cozy — like a CRT glowing at 3 AM. Rudimentary 90s computer graphics (Amiga/DOS demo, screensaver), slow, lots of black space.

## The four scenes
1. **AQUA** — a slow lava-lamp blob floating over calm crossing water ripples. Kick: blob sighs and sends one soft ring through the water.
2. **TOTEM** — one shape that morphs triangle → square → circle, centred in an endless smoky tunnel. Each drum hit sharpens the shape and sheds a curl of smoke (feedback trail) that drifts back into the tunnel.
3. **BLOBS** — classic melting gradient blobs drifting and fusing, drawn as stepped contour bands. Sub/kick pulls them together; hats add a light edge shimmer.
4. **CAM** — your camera as a grainy silhouette with slow fading motion trails. Beats nudge the threshold.

Plus **NONE**. DEPTH, AURORA, PLASMA and the current TUNNEL are removed.

## Reactivity (simple)
Only four sources, from the existing analyser: kick/sub, snare/mid, hats/high, overall level. Per-pad reactions are switched off for all scenes. The CODE overlay stays as it is (toggle with K).

## Colour
1-bit by default (dithered shading); the optional colour mode keeps using the shared cosine palette, slowed down.

## Technical details
- New pure renderers in `src/vj/scenes/` (aqua.ts, totem.ts, blobs.ts) writing into the existing raster buffer; TOTEM uses a small persistent feedback buffer (zoom-in + decay + noise displacement) owned by the engine and reset on scene change.
- `engine.ts`: `MODELS = ["AQUA","TOTEM","BLOBS","CAM","NONE"]`; drop `depthcore.ts`, `ambient.ts` and the `react()` call; keep `reactions.ts` only if the bus still references it, otherwise delete with its test.
- CAM: add frame-difference trails with decay to `camera.ts`; keep generation-guarded stream lifecycle.
- Band envelopes (kick/mid/high/rms) derived once per frame from the existing 20 Hz bus data with slow attack/release smoothing.
- Old saved/bus model names (DEPTH, AURORA, PLASMA, TUNNEL) map to AQUA so open TV windows don't break.
- Tests: scene renderers deterministic and bounded for given time/bands; model migration; update engine tests. Update AGENTS/project rule for the AV lineup.
