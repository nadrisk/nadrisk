# Groovebox batch: drums, siren, 808, effects, sequencer, visuals

Built in the order below. Sound comes first, then screens. Everything outside this list stays as it is.

## 1. Drum presets and defaults
- Kick and snare go back to **four presets each**, rebuilt from your uploaded patches (UKG, DnB, dubstep, hip-hop).
- Every drum sound starts with **DRV at 0**. Double-tap resets DRV to 0.

## 2. Siren and LASER
- The **wave icon** at the top left becomes a tap key that cycles SQR, SINE, SAW. The icon and the full label change, and the sound changes straight away.
- The **mode key** at the top right shows where a tap will take you: **LASER** while on Siren, **SIREN** while on Laser. It stays in the same place on every page.
- Repeated knobs are removed:
  - OSC: TONE, NOTE, REL, LEV
  - LFO: RATE, DPTH, centered
  - SWP: SWP, TIME, centered
- **LASER plays one note at a time.** A new note cuts the ringing tail, so long releases no longer pile up. The last note still rings out with its full release.

## 3. 808 / ACID mode key
- The key sits in the same top-right spot on the 808 PTCH page and on the ACID 303 page.
- It is removed from the ACID SET page.

## 4. Effects
- **Vibrato:** a VIB/LOFI key, like the instrument mode keys. In LOFI mode the screen shows a cassette, and the BUMP and OXID knobs appear. In VIB mode those two knobs are hidden. The current LOFI sound is kept.
- **acid.drive~ becomes a Big Muff-style fuzz:**
  - Sound: two clipping stages in a row, then the Muff tone control (dark to scooped to bright).
  - Controls: SUST, TONE, MID, BIAS, MIX, VOL.
  - Level-matched, so turning SUST up does not blow up the volume.
  - Screen: a simple pedal outline with three knob dots, an LED that lights with the signal, and a stomp switch. A clean wave goes in on the left and fuzz comes out on the right.
- **Reverse delay screen:** cassette-style reverse arrows. Their spacing follows TIME, and each repeat gets smaller and fainter with FEEDBACK. The list icon becomes a double reverse arrow.

## 5. Sampler
- An empty sampler pad shows no waveform and no markers.

## 6. Sequencer CLEAR
- **On the NOTE page:** CLEAR wipes the whole row: notes, velocity, chance, rolls and every MOD lane.
- **On the VEL, CHNC or ROLL page:** CLEAR wipes only that page.
- **On a MOD page:** CLEAR wipes only the lane you are looking at.

## 7. Phrase TRANCE mode
- New TRANCE mode in the phrase sequencer, based on classic trance patterns:
  - Off-beat rolling bass
  - Gated chord stabs
  - Octave-jumping 16th arps
  - Notes stay in key with the global Harmony settings.
- Controls: a pattern choice, plus density, octave spread and gate.

## 8. Trippy acid visual
- The secret `acid` look gets stronger:
  - A spinning mandala layer across the whole device
  - Strokes with red, green and blue copies slightly offset
  - A slow melting wobble and shifting colours
- Values stay readable. Typing `acid` again or pressing Escape turns it off. Sound is unchanged.

## Still open from the earlier program (not in this batch unless you say so)
- Factory patch bank
- SPEC synth mode
- NADRISK failure stage
- External MIDI keyboard, step recording and chord recording

## Technical details
- Drum presets: `drumPresets.ts`; the `drive` default is set in `drumDefaults()`.
- Siren: tap zones in `SirenPanel.tsx`. LASER takes the mono-cut path used by 808, ACID and REESE in `useGroovebox`/`voices.ts`.
- Big Muff:
  - Runs in `effects.ts`: pre-emphasis high-pass, then two oversampled clip stages with gain between them, then a tone stack mixing low-pass and high-pass with a MID control.
  - The new fields are optional, and older sets map to the closest settings.
  - The sequencer MOD drive target still points to SUST.
- Screens: `FxChain.tsx` and `fxIcons.ts`.
- Sequencer CLEAR logic uses the per-step `vel`, `chance`, `roll` and `mods[bank]` lanes.
- TRANCE: pattern generators in `arp.ts`, timed with scale degrees and the audio clock.
- Acid visual: one overlay drawn on a canvas, gated by `frameGate` and hidden when off screen.
- New structural rules go in `AGENTS.md`.
- Checks: unit tests (presets, clear, trance, Muff level) plus a browser check at 393px and desktop for every changed screen. Sound still needs your ear test.
