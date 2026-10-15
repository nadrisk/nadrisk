# Groovebox update program (7 phases)

This is a large batch. It ships in phases, in this order, so each one can be heard and checked before the next. Every phase keeps old sets and patches loading unchanged.

## Phase 1 — Transport and core UX
- **Space** toggles Play/Stop while KEYS mode is on. It is ignored while typing in text boxes.
- **STOP** returns every pad's phrase to step 1. **PAUSE** freezes the phrase and resumes from the same spot.
- **Pad copy/paste**: COPY and PASTE keys on the SLOT screen copy one pad's instrument, mode, sound, note/chord settings, EQ and FX rack onto another pad. Rhythm, name, mutes and chokes stay as they are. This uses the same loading path as Patches.
- **Performance offset**: tapping a step block on the timeline sets the offset to that step. The dial still works.

## Phase 2 — Cyberspace synth polish
- Cutoff reads cleanly (`850HZ`, `1.2K`, `12K`) and is never cut off. The knob curve is re-shaped so the upper half stays musical. Saved values are kept.
- New **EFM** knob on the ENV/FLT page: the filter envelope pushes the FM amount on its own, separate from the cutoff envelope depth.
- WET (filter blend) moves from the LFO page to the FLT page.
- New patches start with LFO to cutoff, volume and pitch at 0. Old sets keep their values.

## Phase 3 — Sequencer and modulation
- Each row gets up to **3 mod lanes** (for example pitch + cutoff + sample start). A lane picker (M1/M2/M3) sits on the MOD view. Old single-lane rows load as lane 1.
- **Poly pitch** mod is enabled for POLY, REESE and chords.
- **Sample start** mod works on sampler pads, including granular scrubbing and moving through slices in BRK/VNT.
- **RAND**: each row gets an exclude toggle (RAND skips it) and a solo toggle (only soloed rows are randomized).

## Phase 4 — Sampler and patches
- Sampler pads start empty, with no built-in sample loaded, ready for your own bank. Built-in samples can still be picked in the Library.
- **Factory patches**: a read-only FACTORY bank in Patches, with about 24 patches across DnB, dubstep, IDM, techno and bass music: sub and reese basses, chord stabs, acid leads, arps, ambient beds and risers. They use only the existing instruments and effects. You can load them and save copies, but not overwrite them.

## Phase 5 — Drum sound design
- TR-808 clap: tighter and brighter for 140 dubstep.
- New kicks: DnB (90–100 Hz punch), Dubstep (50–55 Hz sub with click), Dusty Hip-hop (warm 60–70 Hz), IDM (short, pitched-up glitch).
- New snares: DnB (200 Hz ring with a crisp tail), Dubstep (180–200 Hz with a noisy tail), Hip-hop (808/acoustic hybrid), IDM (short, pitched-up glitch).
- Existing presets stay as they are. The new ones are added to the preset lists.

## Phase 6 — Synthesis and effects
- **MORPH OPPOSE** toggle: the two filters sweep in opposite directions, one up and one down, crossing into each other. The display shows both moving.
- **Cyberspace SPEC mode**: a third synth mode for polyphonic color bass. A bank of harmonic resonators follows the global key and scale, and chords are supported. Controls are TIGHT (watery haze to tight modern pluck), BLUR and BITE (transient). It has its own saved settings, like REESE and LASER do.
- **Vibrato VIB/TAPE**: a hardware-style mode key replaces the LOFI knob. VIB is clean pitch vibrato. TAPE adds slow wow (~0.8 Hz), scrape flutter (~10 Hz), stereo azimuth drift, a 75 Hz head bump and oxide softening, with RATE, DEPTH, BUMP and OXIDE knobs. Old sets that had LOFI on load as TAPE.
- **NADRISK Failure stage**: no knobs. It reacts to loudness: infrasonic sub-harmonics, uneven diode saturation, and slow pumping surges on loud peaks. It is built in advance and switched with the mode, like the current OTT/clipper stages.
- **Malfunction sequence**: after the glitching NADRISK word, the Nadrisk logo flashes as 1-bit acid-green glitch art, then the groovebox appears.
- **ACID easter egg**: typing `acid` turns on a hue cycle and mandala pattern on pads and screens, visual only. Type `acid` again or press Esc to turn it off. It does not unlock or lock anything.

## Phase 7 — Hardware MIDI step recording
- A MIDI keyboard plays the selected pad chromatically across 2 octaves, centred on its NOTE.
- **STEP REC** key on the sequencer: each note played writes a hit on the current step, writes its pitch to a pitch mod lane, then moves to the next step. A rest key skips a step.
- **Chord controllers**: notes arriving together (within about 30 ms) are treated as one chord and played on the pad as that voicing. In step record, the root goes into the pitch lane.

## Checks per phase
Typecheck, tests and build. Browser checks at 390 and 1280 for overlap. Old-set load check. For audio changes, offline level and spectrum measurements: drum peaks and fundamentals, the TAPE head bump, Failure staying bounded by the limiter, no clicks on mode swaps.

## Technical details
- Before each phase, investigate the current code for that area: transport stop/pause and the phrase cursor in `useGroovebox.ts`, the mods data shape, the RAND code, the vibrato `lofi` param, and the sampler default `sampleId`. Then extend it with backward-compatible hydration.
- Mods: `slot.mods[bank]` becomes up to 3 lanes `{target, values}[]`; legacy objects are wrapped as lane 0.
- Copy/paste reuses the `patchStore` capture and apply functions through an in-memory clipboard.
- SPEC: an additive/resonator bank on the shared context, with voices capped against the existing ring cap. It is added to the `FX_COST`-style voice budget if it turns out to be heavy.
- TAPE and Failure DSP go into the single shared worklet bundle (per src/audio/AGENTS.md).
- Logo flash draws `nadrisk-logo.png` as a 1-bit threshold on the existing malfunction canvas.
- The ACID egg is a CSS class on the root, with `hue-rotate` animation and a conic-gradient overlay, using `prefers-reduced-motion` to tone it down.
- MIDI chord grouping is a short note-on window in `useMidi.ts`. Step record shares the sequencer cursor state.
