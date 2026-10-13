# Sequencer MOD targets + blank-slate start

## 1. MOD lane: a fixed, curated target list
Each row's MOD target button only offers these (effects appear only if that effect is on the pad):

| Target | What the step value moves |
|---|---|
| CUTOFF | pad filter (as now) |
| PITCH | ±12 semitones, scale-snapped (as now, pitched pads) |
| TIME (new) | tighten / open this pad's envelopes, like Performance TIME but only for this row's instrument. Centre = unchanged, down = shorter/tighter, up = longer/opened (same x0.25 to x4 range as Performance TIME, stacked on top of it) |
| reverb~ | MIX (send amount) |
| tape.delay~ | SEND |
| reverse.delay~ | MIX |
| saturate~ | DRIVE |
| acid.drive~ | DRIVE |
| phase~, chorus~, flange~, degrade~ (bitcrush) | MIX |
| vibrato~, tremolo~ | DEPTH (these have no mix knob; depth is their amount) |
| trance.gate~ | MIX |
| morph.flt~ | MORPH |
| dj.filter~ | SWEEP |
| ott~ | DEPTH |
| res.metal~ | THRESH |

All other effects (EQ, compressor, spectral, sidechain, dyn EQ, neuro box, drum bus, gate, gain) no longer appear in the list. Rows in old sets that pointed at a removed target show "no mod" and stop modulating; their drawn values are kept.

## 2. Start from a blank slate
- The groovebox opens exactly like pressing NEW: 16 empty neutral pads, empty patterns. The IDM starter kit and its samples (GLITCH etc.) are no longer loaded on open.
- Loading a set fills any missing field from the blank pad instead of the old starter kit, so nothing from the default kit (like the glitch sampler) can sneak in.
- Starter samples that were loading in the background can no longer land on a pad after a set is loaded.
- The RST (reset to starter kit) path is removed with it.

Likely cause of the bleed (to confirm first by saving/reloading a sampler set in the browser): set loading builds pads on top of the starter kit, and the starter kit's sample loader runs in the background on open and can finish after a set loads.

## Checks
Typecheck/tests; browser: fresh load is blank; build a set with a non-sampler pad, save, reload, load: no GLITCH; each MOD target appears only with its effect and audibly moves its knob value; TIME mod shortens/lengthens hits.

## Technical details
- `effects.ts`: replace `MOD_PARAMS` with an explicit allowlist; `modParamsOf` returns `[]` for others (no fallback to mix). Labels in `MOD_LABEL` (send, drive, morph, sweep, thresh).
- `Groovebox.tsx` `targetsOf`: add `["time","time"]` for every engine.
- `useGroovebox.ts` scheduler: `time` target computes `envMul = 2 ** ((value - .5) * 4)` and passes it to `hit` (new optional arg), multiplied into the existing `factor`.
- `useGroovebox.ts`: initial slots/banks = `blankSlots()` / empty banks; drop the mount `loadKitSamples` effect and `resetAll`; `applySet` bases on `blankSlots()`; guard sample loads with a load-generation counter so stale loads are ignored.
