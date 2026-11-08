# PAD instrument: instant 90s atmospheric DnB / jungle pads

## Goal
A sixth instrument, **PAD**, that sounds right the moment you pick a preset. Play it from the pads and shape it with the XY pad. There are few knobs, and they all follow the existing 1-bit hardware look.

## What you get
- **Lineup:** DRM · IDM · SYN · BAS · SMP · **PAD**. Old sets load unchanged.
- **Screen tabs**
  - **PRST:** a list of 12 presets. Tap one to load it.
  - **TONE:** 4 macro knobs (BRIGHT, MOTION, SPACE, AGE) plus attack and release.
- **12 starting presets**, each drawing on a classic sound:
  1. GLASS STR (strings, JV-style)
  2. SPACE VOX (ooh/aah choir)
  3. DREAM BELL (soft digital bell)
  4. WARM SOLINA (string machine)
  5. MINOR 9 STAB (chord stab)
  6. DUSK AIR (breathy wash)
  7. OCEAN SWELL (slow filter swell)
  8. TAPE CHOIR (worn, wobbling choir)
  9. CELESTE (glassy, bright)
  10. FAR SAW (wide detuned saw pad)
  11. FM HAZE (soft FM shimmer)
  12. DUB DRONE (dark, low drone)
- **XY pad is the main control.** Each preset sets what the X and Y directions do:
  - **X:** dark to bright (filter, vowel morph on the VOX presets).
  - **Y:** dry and still, through to wide, drifting and washed in reverb.
  - The existing REC motion and synced LFO work on PAD as they do on other instruments. COMMIT bakes the current position into the patch.
- **Chord pads:** the existing chords, scale and voice leading apply, so a single tap plays a full voiced chord in key.
- Notes sustain while held and release on lift, like SYN.

## Sound recipe (pure code, no sample downloads)
- **Oscillators:** a stack of 2–4 oscillators per voice using Fourier tables in the spirit of Google's WebAudio wavetables (Warm Pad, Choir, Strings, Celeste), plus detuned saw and soft FM for some presets.
- **Choir:** a parallel bank of 3 bandpass formants (Peterson & Barney vowel values) that morphs between vowels as X moves.
- **Ensemble:** a stereo chorus in the style of string-machine and Dimension chorus units, plus slow pitch drift (AGE).
- **Envelope:** soft attacks and long releases (JV-style shapes), with a filter envelope.
- **Space:** each pad sends to its own long-tail reverb in the slot's effect rack. No new master routing.
- **Voice limits:** a 6-voice cap with gentle fades when a voice is stolen, to stop clicks and runaway CPU use.

## Out of scope
- Imported samples, AKWF downloads and changes to the master chain or AV.
- New scales or chord types.

## Technical details
- `EngineKind` gains `"pad"`. `Slot.pad = { preset, bright, motion, space, age, atk, rel }` gets defaults, and hydration fills it in for old sets (no set version bump needed).
- New `src/audio/pad.ts`: the voice graph on the shared Tone raw context, the PeriodicWave tables and the formant bank.
- New `src/audio/padPresets.ts`: preset data and XY mappings per preset.
- `xyMaps.ts` gets a PAD branch. Offsets apply only when a note is triggered, and COMMIT writes them into the macros.
- `useGroovebox`: add `pad` to `heldEngine`, to `livePatch` and to trigger dispatch. The scheduler and grid stay the same.
- `Groovebox.tsx` + `PixelScreen`: add PRST/TONE pages and a selector key. The desktop and phone layouts match, and the phone layout stacks.
- `patchStore` already stores the slot's sound fields. Add `pad` there.
- **Tests**
  - Each preset loads and renders finite audio within its peak bounds.
  - XY corner values map into range.
  - Old sets without `pad` still load.
  - Voice-cap stealing never goes over 6 voices.
- Add an `AGENTS.md` rule for the PAD engine.
