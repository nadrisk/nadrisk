# Real master metering and complete display themes

## Goal
Add trustworthy, live master loudness feedback and make every groovebox element update immediately when the display theme changes, without altering the sound, sequencer, routing, or instrument behavior.

## Meter model and accuracy
- Use **ITU-R BS.1770 / EBU R128** metering rather than estimating loudness from the volume setting.
- Model the compact readout after established mastering meters such as the free Youlean meter, but keep the existing 128×64 NAD pixel-hardware visual language rather than copying its interface.
- Use a browser-native AudioWorklet implementation based on the standards-focused approach of **Loudness Worklet**: it measures live momentary, short-term, and integrated loudness and follows BS.1770-5. It fits the app’s real-time Web Audio architecture better than Needles, whose documented browser support excludes Safari and requires a separately hosted worker.
- Keep the processor in the project’s existing single AudioWorklet bundle, as required by the current audio architecture; do not add a second worklet-loading path or hosted script.

Research references:
- [Loudness Worklet — BS.1770-5 live AudioWorklet meter](https://github.com/lcweden/loudness-worklet/)
- [Needles — established browser LUFS meter](https://github.com/domchristie/needles/)
- [Youlean Loudness Meter — popular free mastering-meter reference](https://youlean.co/youlean-loudness-meter/)

## Master meter changes
- Tap the **final post-master signal** after EQ, glue, clipper, limiter, and performance processing, so the readings describe what the listener actually hears.
- Add a lightweight master meter processor that reports:
  - **M**: momentary LUFS over 400 ms.
  - **S**: short-term LUFS over 3 seconds.
  - **I**: gated integrated LUFS since playback/meter reset.
  - **SUB**: live 20–120 Hz band energy in dBFS, with peak hold, so low-end weight is directly visible.
- Reset integrated loudness when the transport starts from stopped state and provide a small explicit reset hit-zone on the MASTER meter page.
- Add a dedicated **METER** page to the existing MASTER screen rather than crowding OUT/DYN/EQ:
  - large current LUFS number;
  - narrow M/S/I history ladders with a clear −14 LUFS reference marker;
  - separate horizontal SUB bar with dBFS value and peak marker;
  - idle placeholders before audio starts.
- Replace the existing master OUT/DYN bars that derive from control settings with live meter values where appropriate, while retaining the parameter-reactive transfer curve on DYN.
- Throttle display updates to a stable visual rate and stop meter work when the audio engine is absent; audio processing remains on the audio clock.

## Complete theme propagation
- Keep `data-lcd` as the single active theme source, but make canvas rendering react to it immediately.
- Pass a theme revision into the shared 128×64 `PixelScreen` renderer so every instrument, effect, master, sequencer, and utility screen redraws with the new foreground/background colors when the selector changes.
- Make the master waveform and Visualizer Rack re-read their CSS colors on a theme change.
- Replace the Visualizer Rack’s fixed purple/yellow/red canvas colors with semantic theme tokens for secondary trace, warning, and overload states.
- Move or theme the rename dialog and any groovebox popups rendered outside the instrument tree so they inherit the selected display palette too.
- Replace fixed black/grey groovebox chassis values with semantic chassis tokens where they currently prevent blue-grey, amber, green, ice, or acid themes from reaching an element. Preserve hard pixel edges, square corners, bitmap text, and monochrome LCD character.
- Keep the theme selector persisted and verify that all nine existing choices still cycle correctly.

## Technical touchpoints
- `src/audio/tapeWorklet.ts` or a focused new meter-worklet source included by `src/audio/effects.ts`: standards-based LUFS and sub-band measurement in the existing bundled worklet module.
- `src/audio/performance.ts`: expose a non-audible tap of the final master output.
- `src/hooks/useGroovebox.ts`: own meter lifecycle/state, reset behavior, throttled readings, and cleanup.
- `src/components/HwScreens.tsx` and `src/components/Groovebox.tsx`: add the MASTER METER page and pass live readings/theme state.
- `src/pixel/PixelScreen.tsx`, `src/components/Waveform.tsx`, `src/components/VisualizerRack.tsx`, `src/components/SlotScreens.tsx`, and `src/index.css`: reactive canvas colors, themed portal, and complete semantic theme tokens.

## Verification
- Compare LUFS output with deterministic test tones/noise and a known BS.1770 reference implementation within an appropriate tolerance; confirm silence and gating behavior.
- Confirm the SUB meter stays low for high-frequency-only material and responds strongly to 20–120 Hz test content.
- Verify the final post-master reading reacts to master EQ, glue, clipper, limiter, and master volume.
- In the live preview, cycle every theme and visually inspect the instrument screens, master meters, waveform, visualizer canvases, controls, rename dialog, pads, and sequencer at tablet and phone widths.
- Confirm meter and theme changes introduce no console/runtime errors and that audio, transport, MIDI, sets, and recording still work as before.
