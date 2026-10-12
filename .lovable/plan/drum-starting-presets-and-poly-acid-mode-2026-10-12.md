# Drum starting presets and POLY ACID mode

## 1. Sixteen ready-to-play drum presets
Add a compact **PRST** page to each drum machine, with four selectable sounds:

| Machine | Presets |
|---|---|
| HAT | Closed hat · Open hat · Ride · Shaker |
| SNARE | Tight · Deep fat · Ringy · Pitchy snappy |
| KICK | Punchy UKG · Soft · Dusty hip hop · IDM |
| CLAP | Short snap · Natural · TR-808 style · Sloppy |

- Presets load a complete drum sound, including its pitch, tone, envelope and drive—not just a different decay setting.
- Tune the open hat for a clearly sustained metallic tail, ride for bell-like ringing, and shaker for soft noise texture. Give each snare, kick and clap a genuinely distinct starting character.
- Applying a preset changes only the selected drum sound. Leave its pad name, level, effects, rhythm and choke assignments untouched.
- Knobs remain freely editable; double-tap returns to the selected preset's starting value. Old sets without preset information retain their current sounds and existing reset defaults.
- Save the chosen preset reference and edited sound with the set. Show when a preset has been edited, without adding controls to the existing sound pages.

## 2. A third POLY mode: ACID
Extend the existing mode selector to **POLY / REESE / ACID**, with each mode remembering its own sound. Older sets remain unchanged.

### Sound first
- A single mono oscillator with **SAW / SQR** selection, through a nonlinear, resonant 303-inspired filter. No unison, chorus or extra LFOs.
- Prioritise the distinctive hollow square, resonant squelch, exponential filter sweep, accent behaviour and smooth slide—not a generic resonant lowpass with a 303 label.
- Start with a usable dark, biting acid bass. Add restrained drive for the requested cyberpunk edge, with compensated output and bounded resonance.
- High step velocity engages accent, affecting both brightness and level; the ACC control sets its strength. Keep zero velocity silent.
- Use the existing phrase **SLIDE** control to bend the running note without restarting its envelopes. Regular grid ties continue to sustain notes; do not reinterpret them as pitch slides.
- Ignore chords in ACID mode. Held pads sustain cleanly; release, STOP and booked-note cancellation follow the existing instrument rules.

### Bare-minimum controls
Two compact pages, retaining the current screen size:
- **303:** CUT, RES, ENV, DEC.
- **SET:** NOTE, ACC, DRV, plus the SAW/SQR key and mode selector.

Slide time uses the existing phrase GLID control. Fixed musical amplifier behaviour avoids an extra ADSR page. Frequency controls are logarithmic; every new control has a sensible double-tap reset and MIDI label. Sound edits respond while held without restarting the note.

Hide the unrelated POLY voice-stack controls in ACID mode; leave POLY and REESE otherwise unchanged.

## 3. The 303 display
Use a large, crisp outlined **303** as the main graphic:
- CUT changes how much of the digits fills from the bottom.
- RES adds tightly bounded internal interference marks.
- ENV and DEC shape a small sweep contour beneath the digits.
- Actual pad output adds a restrained fill/pressure response, settling in silence.

Keep all graphics inside the existing frame and use the active display palette. No glow, gradients, new artwork assets or whole-panel audio-frame updates. Respect reduced motion.

## Technical approach
- Put reusable complete drum recipes and preset application/reset logic in a focused audio preset module; deep-copy envelopes so editing one pad never changes another preset or pad.
- Add optional ACID parameters alongside the existing POLY and REESE parameters. Integrate its mono voice with trigger, release, live-edit and phrase-glide paths.
- Research-backed filter references: Robin Whittle's TB-303 behaviour analysis and Tim Stinchcombe's diode-ladder analysis. Choose a proven, licence-compatible model rather than inventing a generic filter; treat the result as 303-inspired, not a claim of exact hardware emulation.
- If custom DSP is required, register it in the existing shared worklet bundle. Prepare coefficients, wave tables and drive curves away from pad hits; bound voice lifetime and avoid reconnecting a large graph on every note.
- Reuse the existing slot analyser and visibility-gated, capped pixel redraws for the 303 display. No new analyser or permanent visual loop.
- Record updated architecture guidance and the chosen sound/design requirements when implementing.

## Verification and delivery order
1. Implement and verify drum presets first: all sixteen selections, distinct rendered sounds, tails, selected-preset resets, edits, recall and old-set compatibility.
2. Build and validate ACID audio before adding the 303 graphic: saw/square character, filter sweep, resonance stability, accent, mono retrigger, phrase slide without envelope retrigger, held notes, release and rapid hits.
3. Add the compact controls and display; verify MIDI endpoints, all three mode recalls, save/load, phone and desktop fit, silence settling and hidden-page gating.
4. Compare rapid taps and sequencer playback under the same throttled conditions, with ACID visible/hidden and against POLY/REESE. Do not promise a CPU percentage before measurement.

Automated renders and browser checks can establish behaviour and stability, but final sound taste and real iPhone responsiveness still need your listening/playability check.