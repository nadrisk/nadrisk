# DIGI.DELAY~ — clean Airwindows-style digital delay

Add a new pristine digital delay to the FX rack, next to the existing tape delay (which stays unchanged).

## What you get
- A new effect called **DIGI.DELAY~** in the FX list, usable on pads, group buses and anywhere tape delay works.
- Full-bandwidth, crystal-clear repeats (no tape wobble or saturation), smooth time changes without zipper noise.
- Built-in **ducking**: echoes dip while you play and bloom back in the gaps. Only fresh dry hits duck; repeats never duck themselves.

## Controls (8 knobs)
1. **TIME** — synced divisions (1/32 to 1 bar, with dotted and triplet) or free ms; tap toggles SYNC/FREE.
2. **MODE** — DUAL (independent left/right) or PING (bouncing left/right).
3. **OFFS** — right-side time offset (e.g. dotted or triplet against the left).
4. **FDBK** — clean feedback, gently limited so it can never run away.
5. **HP** — removes low rumble from repeats (20 Hz–1 kHz).
6. **DAMP** — softens highs on each repeat (1–20 kHz, default fully open).
7. **DUCK** — 0% off, 100% up to about −18 dB while you play.
8. **MIX** — dry/wet.

Default start: 1/8 sync, DUAL, no offset, FDBK 35%, HP 20 Hz, DAMP open, DUCK 0, MIX 30%.

## Screen
1-bit 128×64 like the other effects: a header with the current time (e.g. `1/8 + 1/8.` or `PING 375MS`), a stereo timeline of echo taps shrinking with feedback, and a small duck meter showing how far the repeats are pushed down right now. Everything stays inside the frame on phone and desktop.

## Checks
- Add tests: Hermite interpolation passes known points exactly, feedback stays bounded at 100%, ducking only reacts to dry input, sync times match BPM.
- Phone (393 wide) and desktop screenshots of the screen; confirm saved sets with the effect reload correctly and old sets are untouched.
- Confirm the FX load meter counts the new effect.

## Technical details
- New AudioWorklet `src/audio/digiDelayWorklet.ts` (same bundle pattern as `noizWorklet.ts`): stereo ring buffers, 4-point Hermite read, per-sample smoothed delay time, one-pole HP/LP in the feedback loop, soft-clip on feedback, envelope follower on the dry input (5 ms attack, ~250 ms release) controlling wet gain.
- Register type `"digi"` in `src/audio/effects.ts` (params, `modParamsOf`/targets for sequencer and LFO mods, tempo sync via existing transport BPM), and in `src/components/fxCatalog.ts`.
- Screen in `src/components/FxChain.tsx` using PixelScreen/knobLayout conventions; duck meter written per frame via the existing capped redraw (no React audio-frame state).
- Tests: `src/audio/digiDelay.test.ts`, update `src/test/fxCatalog.test.ts`.
