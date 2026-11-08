# Modular PRC routings + FL-style sampled grand piano

## 1. PRC: two modular percussion synths (MODL removed)

PRC keeps two engines, picked with two wide tabs: `[NOIS]` and `[VCO]`. Each has a 6-position ROUT dial. Each position is its own internal patch with its own modules wired up, not a preset.

**NOIS routings**
1. METL: Noise → resonator bank (3 inharmonic tuned bandpasses) → VCA
2. FOLD: Noise → wavefolder → resonant filter → VCA
3. SHFT: Noise → frequency shifter → comb filter → VCA
4. GRAN: Noise → micro-grain gate (random burst particles) → pitch-modulated bandpass → VCA
5. X-FB: Noise → parallel LP + BP → cross-feedback (safety-capped) → mixer → VCA
6. COLL: Noise → short delay (1–25 ms) → wavefolder → feedback loop → VCA

**VCO routings**
1. C-FM: VCO1 → linear FM into VCO2 → wavefolder → VCA
2. X-MOD: VCO1 ↔ VCO2 cross-FM → VCA
3. PLUK: VCO impulse → tuned delay → lowpass damping → feedback → VCA
4. R-FLD: VCO → wavefolder → modal resonator bank → VCA
5. SYNC: master VCO → hard-synced swept slave → frequency shifter → VCA
6. X-FB: VCO → parallel filters → saturating cross-feedback → mixer → VCA

**Knobs (same layout on both engines)**
- ROUT: picks routing 1–6. The screen draws the active patch as a small block diagram.
- TUNE: base pitch / resonant root.
- P.ENV: pitch envelope. Turn right to dive down (kicks, zaps), center for a steady tone, left to sweep up.
- DEC: snappy decay, capped at about 5–150 ms with a steep curve, so hits never get muddy.
- Model knob: COLR on NOIS (pink → white → crackle → digital hash); FOLD on VCO (fold / FM / cross-mod amount for the chosen routing).
- DRV: starts at 0.

**XY pad**
- NOIS: X = COLR, Y = TUNE + P.ENV.
- VCO: X = FOLD, Y = TUNE + P.ENV.
- The center always matches the saved knobs, and COMMIT writes the offsets into them, as on other instruments.

**Safety:** every feedback path has gain below 1 and soft clipping, and is torn down when the voice ends, so nothing can ring on forever.

**Old sets:** MODL and older models load as the closest routing (METL → NOIS/METL, ZAP → VCO/SYNC, CLIK/SHRD → NOIS/GRAN, MODL → VCO/R-FLD).

## 2. Piano: a real sampled grand, like FL Studio's default piano

FL Studio's default piano (FL Keys) plays recorded piano notes. Synth tricks won't get that sound, so MIDI GRAND will play real recordings:
- Use the free Salamander Grand Piano recordings (CC-BY license, the set Tone.js uses in its own demos). Bundle about 8 notes (A0 up to C7, spaced every minor third / octave, compressed MP3) inside the app, so it works offline and needs no download service.
- Each key plays the nearest recorded note, pitch-shifted a few semitones. Velocity sets loudness and brightness. The sound fades naturally while held and stops softly on release.
- Samples load in the background the first time a PAD or MIDI GRAND is used. Until they load, the pad stays silent instead of falling back to a synth.
- BRT opens or closes a gentle tone filter, and AGE adds the SP-1200 grit. Presets stay dry.
- MIDI E-PNO stays as it is. Add the credit line "Salamander Grand Piano by Alexander Holm, CC-BY" to the About overlay.

## Out of scope
Drum presets, other instruments, AV, the master chain, saved-set format (new fields are optional).

## Technical details
- `src/audio/idm.ts`: `IdmModel = "nois" | "vco"`, plus new fields `rout` (0–5), `penv` (−1..1) and `colr`/`fold` reusing existing slots `a`/`b`. The routings are built with native nodes (BiquadFilter, WaveShaper, DelayNode with capped feedback, quadrature oscillators for shifting). Pull out `routings.ts` with one builder per routing.
- Old-model mapping goes in `idmParams` LEGACY. `xyMaps.ts` gets an IDM branch per model. The PRC panel gets two tabs and a ROUT diagram on the PixelScreen.
- Piano: `src/assets/piano/*.mp3` with a manifest, plus a `pianoSamples.ts` loader that decodes once per AudioContext and caches the result. `playKeys("grand")` uses an AudioBufferSource with playbackRate, a velocity lowpass and an envelope. The old additive grand code is removed.
- Tests: all 12 routings render finite audio, the tail stays silent after DEC plus a margin (feedback stays bounded), legacy mapping, XY ranges, DRV default of 0, and the piano picks the nearest sample with a correct playbackRate.
