# Groovebox master plan, grouped by size and cost

Credit figures are rough guesses, not quotes. Each group can be approved and built on its own, smallest first. Sound comes before screens in every group.

## Group A: Quick fixes (about 1–2 credits total)
1. **Drum defaults:** DRV always starts at 0, and double-tap resets it to 0.
2. **Empty sampler:** no waveform and no markers when no sample is loaded.
3. **808 / ACID mode key:** the same top-right spot on the 808 PTCH page and the ACID 303 page. Removed from the ACID SET page.
4. **Siren mode key:** shows **LASER** while on Siren and **SIREN** while on Laser. Same spot on every page.
5. **Siren knob tidy-up:**
   - OSC: TONE, NOTE, REL, LEV
   - LFO: RATE, DPTH, centered
   - SWP: SWP, TIME, centered
6. **Siren wave key:** tapping the top-left icon cycles SQR, SINE, SAW. The icon, the full label and the sound all change.

## Group B: Small behaviour changes (about 2–3 credits)
1. **LASER plays one note at a time:** a new note cuts the ringing tail, and the last note still rings out with its full release.
2. **Sequencer CLEAR follows the page you are on:**
   - NOTE page: clears the whole row, including VEL, CHNC, ROLL and every MOD lane.
   - Any other page: clears only that page.
   - MOD page: clears only the lane you are looking at.
3. **Kick and snare presets:** back to four each, rebuilt from your uploaded UKG, DnB, dubstep and hip-hop patches.

## Group C: Effect screens and modes (about 3–5 credits)
1. **Vibrato VIB/LOFI key:** LOFI shows a cassette and adds the BUMP and OXID knobs. Both are hidden in VIB mode. The current LOFI sound is kept.
2. **Reverse delay screen:** cassette-style reverse arrows. Their spacing follows TIME, and each repeat fades with FEEDBACK. A new double reverse arrow icon in the list.
3. **acid.drive~ pedal screen:** a simple pedal outline with three knob dots, an LED that lights with the signal, and a stomp switch. A clean wave goes in and fuzz comes out.

## Group D: Big Muff fuzz sound (about 3–5 credits)
- acid.drive~ is rebuilt as a Big Muff-style fuzz:
  - Two clipping stages in a row, then the Muff tone control (dark to scooped to bright).
  - Controls: SUST, TONE, MID, BIAS, MIX, VOL.
  - Level-matched, so turning SUST up does not blow up the volume.
- Older sets load with the closest settings, and sequencer drive modulation moves to SUST.
- Sound must be signed off by your ear test.

## Group E: Phrase TRANCE mode (about 4–6 credits)
- New TRANCE mode with classic patterns:
  - Off-beat rolling bass
  - Gated chord stabs
  - Octave-jumping 16th arps
  - Notes stay in key with the global Harmony settings.
- Controls: pattern choice, density, octave spread and gate.

## Group F: Trippy acid visual (about 4–6 credits)
- The secret `acid` look gets stronger:
  - A spinning mandala layer across the whole device
  - Strokes with red, green and blue copies slightly offset
  - A slow melting wobble and shifting colours
- Values stay readable. Typing `acid` again or pressing Escape turns it off. No change to sound.

## Group G: Earlier unfinished items (larger)
1. **Factory patch bank (about 3–5 credits):** DnB, dubstep, IDM, techno and bass-music patches in the Patches menu, made only from the instruments and effects you already have.
2. **NADRISK failure stage (about 3–5 credits):** master "malfunction" processing (dropouts, stutters, crunch) in NADRISK mode only.
3. **External MIDI keyboard (about 5–8 credits):** plays the selected pad chromatically across two octaves, records hits and pitch step by step, and supports chord controllers.
4. **SPEC synth mode for Cyberspace (about 8–12 credits, the largest):**
   - Plays chords that follow the Harmony scale, with resonator mapping.
   - Controls: TIGHT, blur and transient bite.

## Suggested order
A, then B, C, D, E, F, then G1 to G4. The full list is roughly 40–60 credits, depending on how much the sound needs reworking after your listening tests.

## Technical details
- **Group A:**
  - `drumDefaults()` and `drumPresets.ts`
  - `SirenPanel.tsx` taps and knobs, using the shared `knobLayout` so pages with fewer knobs are centered
  - `Sub808Panel.tsx` mode key
- **Group B:**
  - LASER uses the same mono-cut path as 808, ACID and REESE in `useGroovebox`/`voices.ts`.
  - CLEAR works on the per-step `vel`, `chance`, `roll` and `mods[bank]` lanes.
- **Group C:** `FxChain.tsx` and `fxIcons.ts`. Displays read the effect's real settings.
- **Group D:** in `effects.ts`: high-pass, then two oversampled clip stages with gain between them, then a tone stack mixing low-pass and high-pass with a MID control. New fields are optional.
- **Group E:** pattern generators in `arp.ts`, timed with scale degrees and the audio clock.
- **Group F:** one overlay canvas, gated by `frameGate` and paused when off screen.
- **Group G:**
  - Patches use the existing `patchStore` format.
  - The failure stage uses prebuilt, bypassed master stages in `performance.ts`.
  - MIDI builds on `useMidi.ts`.
  - SPEC is a new mode inside the Cyberspace engine.
- Record every new structural rule in `AGENTS.md`.
- **Checks for each group:** unit tests, plus a browser check at 393px and desktop width. Sound changes need your ear test.
