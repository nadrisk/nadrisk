# Nadrisk Sound Engine and Interface Overhaul

Goal: every instrument feels like an OP-1 engine — few flat pages, exactly 4 knobs per page, one clear pixel graphic per page, mode switches in the header, no nested menus. The Sampler already meets this standard and stays as is.

## New instrument lineup

```text
DRM  drum synth (basic sounds)   - kept, trimmed to 3 pages
IDM  experimental drum synth     - new, replaces Siren
SYN  clean poly/mono synth       - rebuilt
BAS  bass engine: 808 / REESE / ACID - unified
SMP  sampler                     - unchanged
```

Siren (SRN) is removed. Old saved sets keep working: siren and poly pads load as the closest SYN or BAS REESE sound; pattern grids, names and chokes are never touched.

## 1. SYN — clean OP-1 style synth
- OSC page: WAVE (saw > square > triangle > sine morph), SUB, DETUNE, VOICES (1 = mono with glide/legato, 2–8 = poly). Graphic: live waveform.
- FLT page: CUTOFF, RESO, ENV AMOUNT, DRIVE. Graphic: filter curve.
- ENV page: ATTACK, DECAY, SUSTAIN, RELEASE. Graphic: draggable ADSR.
- Retired: additive drawbars, spectral gate, LFO page, sub-menus.

## 2. BAS — unified bass engine
Header switch [808] [REESE] [ACID], two pages per mode:
- 808: PITCH (NOTE, PITCH DECAY, PITCH ENV, CLICK) and BODY (DECAY, DRIVE, HARM, TONE)
- REESE: OSC (NOTE, DETUNE, SUB, GLIDE) and FLT (CUTOFF, RESO, DRIVE, RELEASE)
- ACID: 303 (CUTOFF, RESO, ENV, DECAY) and SET (NOTE, ACCENT, DRIVE, WAVE)

## 3. DRM — trimmed
Six pages become three: TONE (TUNE, PITCH DECAY, DRIVE, SNAP), NOISE (NOISE, NOISE DECAY, COLOR, FM), ENV (ATTACK, HOLD, DECAY, CURVE). Existing sounds keep their character.

## 4. IDM — new experimental drum synth
Header switch with four models drawn from Machinedrum, Syntakt, Nord Drum, Plaits and LXR:
- METL: metallic FM cymbal cluster
- PING: tuned struck membrane / resonator
- CLIK: glitch micro-impulse
- SHRD: noise shred with sample-rate crush
Pages: MODEL (4 model-specific knobs) and ENV (DECAY, BEND, GRIT, DRIVE). Starting presets for each model.

## 5. Phrase sequencer — streamlined
Five pages (SEQ, LOOP, KEY, TIM, TRNC) become two:
- RUN: RATE, GATE, SWING, LENGTH
- PATT: PATTERN, OCTAVE, KEY, ROLL (one-tap ratchet)

## 6. Metal effect — 4-knob resonator
Becomes a clean resonator with TUNE, RING, CLANG, DAMP, and a pixel graphic of a vibrating beam.

## 7. Instrument XY pad
Each instrument gets an XY page that moves many of its own controls at once (only its own controls, no outside effects).
- X axis: tighter (left) to open (right). Y axis: darker (down) to brighter (up). The center is the patch as saved.
- Each instrument has its own map, e.g. SYN: X = attack/release/detune/voices spread, Y = cutoff/reso/drive/wave. 808: X = decay/pitch decay, Y = tone/harm/click. IDM: per model. SMP: start/length/grain, filter/tone.
- HOLD keeps the new position; SNAP springs back to center on lift.
- COMMIT writes the explored sound into the knobs.
- Graphic: cursor with trail and the main moving values.

## 8. EQ scope becomes the spectrum
- The EQ's SCP page shows the frequency spectrum used under Poly/Sampler.
- The separate Spectrum panel is removed.

## Order of work
1. Engine lineup + saved-set migration (remove Siren, add BAS, IDM slot)
2. SYN rebuild
3. BAS unify (move REESE in)
4. DRM trim
5. IDM engine + presets
6. Phrase sequencer + Metal resonator
7. XY pad with per-instrument maps
8. EQ spectrum move
9. Tests for migration, voice count limits, XY center = saved patch, COMMIT; browser check of every page

## Technical details
- Engine tabs: `SlotScreens.tsx` ENG list; editors in `CyberspacePanel` (SYN), `Sub808Panel` + `EnsemblePanel` reese parts (BAS), `DrumkitPanel` (DRM), new `IdmPanel`; delete `SirenPanel`.
- Voices in `src/audio/voices.ts`: new `playSynth` poly allocator (voice stealing, mono legato/glide), `playIdm` per model on the shared Tone raw context; pad holds keep worker-clock booking and release cancellation.
- Slot type gains `bassMode`, `idm` params, `synVoices`, `xy {x,y,hold}`; set hydration bumps version and maps old `poly`/`siren`/additive fields.
- XY maps live in a new `src/audio/xyMaps.ts`: per engine, a list of {param, xAmt, yAmt, curve}; offsets apply at trigger and to sustaining voices with smoothing, never written to slot until COMMIT.
- Patches (`patchStore.ts`) store XY position with the sound.
- `ChannelEqScreen` takes `getSpectrum`; standalone Spectrum panel removed from `SlotEditor`.
- AGENTS.md rules updated for the new lineup and XY design.
