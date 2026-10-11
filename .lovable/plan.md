# Synth and EQ fixes

## 1. Double-tap resets to the right value
- At the moment a knob resets to whatever value it had when its page opened, so PTCH can jump to -24.
- Each knob gets a fixed home value: PTCH 0, FINE 0, insert EQ band gains 0 dB, and filter/EQ frequencies to their usual defaults.
- New synth sounds start with O2 at PTCH 0 and FINE 0. Built-in starter sounds stay as they are.

## 2. Turning knobs while a pad is held
- At the moment the synth's settings are only read when the note starts.
- A held synth note will follow these knobs live: CUT, RES, FENV, osc GAIN, PTCH, FINE, FM amount, NOIZ and WET. Changes glide over about 20 ms so there are no clicks.
- The same applies to poly's CUT, RES and detune.

## 3. One waveform system: additive for every oscillator
- The wave key (top left of O1/O2) steps through the recipes SINE, TRI, SAW, SQR, ORG, HOLW, BELL, and USR when you've drawn your own bars.
- The separate preset box on the right goes away, because the wave key now does that job.
- Old sets that used sine, triangle, saw or square load as the matching recipe, so they sound almost the same.
- One difference to listen for: because each recipe uses 16 partials, SAW and SQR are slightly softer at the very top than the old built-in waves.

## 4. FM works like Serum's "FM from B"
- How it works today: the amount of FM is multiplied by O2's volume. So turning O2 down, the usual Serum technique, also turns the FM off. The additive balancing also makes O2 quieter, which weakens FM even more.
- New behaviour:
  - **FM mode:** O2 is never heard on its own and only shapes O1. O2's GAIN stops controlling how much FM there is, so you can turn O2 all the way down and the FM sound stays. The FM knob is the only control for depth.
  - **MIX mode:** both oscillators play together at their GAIN levels, as now.
- The FM follows O2's pitch. It works like phase modulation, the way Serum does it: FM depth grows with O2's pitch ratio, so the tone stays consistent across the keyboard and when you change O2's PTCH.
- O2's real peak level is used when sizing the depth, so FM is equally strong whichever wave or partial recipe O2 uses.

## 5. Filter envelope also moves FM
- On the ENV page with the FLT tab open, there will be two amount strips at the top: **CUT** (the current one) and **FM** (new, 0–100%).
- FM opens the FM amount along the filter envelope's shape, giving classic plucky or brassy FM attacks. It shares the same ADSR, so there's nothing new to set up.
- The O2 screen shows a small `E` next to FM when this is active.

## 6. Playback lag
- Suspected cause (not confirmed yet): every additive note rebuilds its waveform when it starts. The loudness balancing is only worked out when a knob moves, so it is unlikely to be the cause.
- Check how long a note takes to start, then remember each waveform so it is built only once, when you edit the bars, never on a hit.
- Re-measure fast retriggers afterwards.

## Technical notes
- `Zone` gets an optional `reset` prop; `Knob.reset` is passed through `knobZones`; this follows the existing AGENTS rule about an explicit resetValue.
- The synth voice returns an `update(params)` handle that is stored per ringing voice; `updateSlot` forwards synth/poly patches to the voices currently held on that pad, using `setTargetAtTime`.
- PeriodicWave cache keyed by the rounded partial array per context; FM gain divided by the computed peak of the cached wave.
- New `fenvFm` synth field (default 0) drives a `modAdsr` on the FM gain; old sets hydrate with 0.
- The wave value stays `"additive"` plus `partials`; older wave strings are mapped on hydration.
