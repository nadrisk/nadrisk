# Add a LASER mode to the dub siren

## Goal
Add a second **LASER** mode inspired by the fat, pitch-bending lead in Skrillex & Alvin Risk’s “Try It Out”. Keep the existing **DUB** sound and controls intact.

The −24 to +24 control will set the **per-hit pitch-envelope sweep**, as requested—not a repeating wobble.

## Research direction
- ADSR’s Skrillex-laser tutorial uses bright Square–Saw oscillators, pitch envelopes and detuned unison: [tutorial](https://www.adsrsounds.com/ni-massive-tutorials/laser-sounds-in-ni-massive/).
- A track-specific recreation was criticised for sounding like a high supersaw and missing the pitch envelope: [discussion](https://www.reddit.com/r/edmproduction/comments/27miru/skrillex_alvin_risk_try_it_out_lead_synth/).
- Build an envelope-led, detuned oscillator patch rather than a generic supersaw. These are recreation references, not verified original preset settings; closeness to the record requires your listening test.

## Sound and controls
- A small **DUB / LASER** selector inside the existing siren screen. Switching modes preserves each mode’s settings.
- LASER uses three bright oscillators: a centre voice and a detuned stereo pair, with level compensation so widening does not simply increase loudness. Offer SAW and SQR flavours.
- **OSC page:** existing root NOTE, DETUNE, TONE and LEVEL. TONE is a low-pass control; DETUNE goes from focused to thick and wide.
- **PENV page:** AMOUNT **−24 to +24 semitones**, DECAY time and CURVE, with a signed pitch-envelope graph.
  - Positive amount starts above the root and falls back to it.
  - Negative amount starts below the root and rises back to it.
  - Zero disables the pitch bend. Every hit restarts the pitch envelope.
- **AMP page:** attack, decay, sustain and release using the existing envelope controls. Held pads follow the usual hold/release behaviour; sequenced hits stay short and punchy by default.
- Start with a useful laser patch: +24 semitone sweep, approximately 60 ms pitch decay, moderate detuning, bright tone and a short amp decay. Final voicing is subject to your ear test.
- LASER does not inherit the dub siren’s repeating LFO. DUB’s free-running LFO remains unchanged.

## Match the existing control rules
- Frequency controls use logarithmic movement; their drawings and MIDI positions use the same mapping.
- Signed pitch amount is linear in semitones, with zero at the centre. Detune is measured in cents.
- Envelope times allow fine adjustment at short durations; graphs use the same values as the sound.
- Every new control has an explicit double-click/tap reset to its LASER starting value, not whichever value it had when the page opened.
- Tone, detune and level edits respond smoothly while holding a LASER pad. Envelope edits affect the next hit without restarting an active sweep.
- Preserve the fixed 128×64 bitmap screen, existing frame size, themes and labelled MIDI controls. No surrounding rack redesign.

## Technical details
- Extend `SirenParams` with an optional mode and separate LASER settings, defaulting older sets to DUB. Preserve existing siren values, save/load, pad routing and shared-LFO behaviour.
- Add a LASER branch to the siren voice path in `src/audio/voices.ts`, with audio-clock pitch-envelope scheduling and a live-update handle connected through the existing hook.
- Keep a fixed three-oscillator budget per hit; use the existing ringing-voice limits and cleanup paths. Clamp pitch near the audio context’s usable range and disconnect every voice node on release/stop.
- Reuse `SirenPanel`, `Panel`, `Zone` and envelope drawing helpers. Draw oscillator spread and the actual configured pitch trajectory; avoid adding an always-running animation loop.
- Record the new mode architecture in `AGENTS.md` during implementation.

## Checks and checkpoint
1. Test ±24/0 pitch sweep endpoints, reset values and old-set defaults.
2. Browser-check DUB/LASER switching, all pages, held-pad edits, rapid retriggers, sequencer playback and save/load recall.
3. Confirm DUB still sounds and behaves as before; inspect output for clipping and test node cleanup and rapid-hit performance.
4. Check desktop and phone screen fit, MIDI mappings, tests and preview errors.
5. Stop for your ear test against the record before further sound revisions. Browser checks cannot prove an exact sonic match or real iPhone latency.

## Out of scope
No changes to other instruments, effects, sequencing, master sound or layout; no samples, new backend or new effect chain.