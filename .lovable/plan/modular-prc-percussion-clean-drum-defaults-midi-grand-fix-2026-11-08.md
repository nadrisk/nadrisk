# Modular PRC percussion + clean drum defaults + MIDI GRAND fix

## What you get
1. **PRC becomes three modular engines** (instead of the current five models), for intricate IDM percussion:
   - **NOIS** – noise pinging a resonant filter (Plaits noise engine style): ticks, snaps, liquid filter drops, crackle. Knobs: TONE, RES, SWP, COLR.
   - **VCO** – West Coast oscillator (Lockhart/Serge wavefolder + FM): rubbery bongs, wooden blips, alien squelch. Knobs: TUNE, FM, FOLD, DIVE.
   - **MODL** – struck resonator (Rings/Plaits modal style): metallic pings, glassy bells, tuned clanks. Knobs: TUNE, STRK (strike brightness), DAMP, INHR (inharmonic spread).
   - All three share DEC and DRV; DRV starts at 0.
   - Three wide tabs on the PRC screen: `[NOIS] [VCO] [MODL]`.
2. **XY pad follows each engine** (centre = saved sound, COMMIT writes it into the knobs as today):
   - NOIS: X = TONE dark→bright, Y = short/dry snap → long resonant ping (RES + DEC + SWP).
   - VCO: X = FOLD clean→folded, Y = FM + DIVE (tame → squelchy).
   - MODL: X = STRK soft→bright, Y = DAMP + INHR (tight wood → long ringing metal).
   - XY labels on screen change per engine.
3. **Drum synth DRV starts at 0** on new/first-load drum pads. Drum presets keep their own drive.
4. **MIDI GRAND plays again** – the hammer thump that was throwing an error is fixed.
5. **Old sets keep working:** old PRC models map onto the nearest new engine (METL/PING → MODL, ZAP → VCO, NOIS/CLIK/SHRD → NOIS).

## Out of scope
No new effects, no sample downloads, no changes to DRM presets, sequencer, AV or master chain.

## Technical details
- `src/audio/idm.ts`: replace models with `"nois" | "vco" | "modl"`; `IdmParams` gains per-engine fields (tone/res/sweep/color, tune/fm/fold/dive, strike/damp/inharm) with defaults; `drive: 0` default. Wavefolder = cached `WaveShaperNode` curve (Lockhart-style tanh/sine fold), noise = cached buffer into biquad bandpass/lowpass with fast exp envelopes, modal = 4–6 high-Q bandpass partials excited by a short noise/impulse burst. Every source is started and registered so stops never throw.
- `idmParams()` migrates legacy `model` values and fills missing fields, so saved sets/patches hydrate through the same path.
- `src/audio/xyMaps.ts`: per-model IDM branch + per-model XY labels; extend `xyMaps.test.ts` (ranges, centre = identity, labels per model).
- PRC panel UI: three tabs and four knobs per engine in the existing PixelScreen layout.
- `src/hooks/useGroovebox.ts` line 57: `drive: 0.2` → `0`. GEN `genModels` updated to the new model names.
- `src/audio/pad.ts` `playKeys`: start hammer source at `t`, push into `srcs`; add test running all 14 PAD presets through `playPad` without throwing.
- Tests: idm engines produce finite audio, legacy model mapping, drive default 0.
