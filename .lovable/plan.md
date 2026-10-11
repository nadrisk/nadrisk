# Pad row tidy-up, GAIN to -INF, and a TIME "home" for RESET

## 1. Tidy pad-rack button row
- Move **NEW** to sit directly right of **REPEAT ON/OFF**, so the row reads:
  `REPEAT | NEW | MOMENT LATCH ROLL | rate | REC`
- Give all keys in the row the same height and even gaps; REPEAT and NEW share a width, the three mode keys share a width, rate and REC fill the rest so the row ends flush on both edges. Same on phone and wide screens.
- NEW keeps the tap-twice "SURE?" safety.

## 2. GAIN effect: down to -INF with fine control
Range becomes **-INF ... +24 dB**, default 0 dB (unchanged sound).

Suggested clever approach (instead of a plain linear knob): a **mixing-desk fader curve**.
- Most of the knob travel covers the useful area around 0 dB (roughly -12 to +12) in 0.1 dB steps, so small moves are tiny changes.
- The bottom stretch speeds up through -20, -40, -60 and the very end is **-INF** (silence).
- The top stretch reaches +24 dB.
- Display shows e.g. `-3.2DB`, `+6.0DB`, `-INF`.
- Double-tap still snaps back to 0 dB; MIDI learn follows the same curve, so a controller knob also gets fine control near 0.
- Old sets keep their saved boost exactly.

## 3. Performance TIME home value
- On the PERFORM FX page add a small **SET** key next to the TIME readout. Tapping it stores the current TIME as its home (screen shows a small marker on the readout, e.g. `T+20*`).
- **RESET · DROP** then returns TIME to that home instead of 0%. Everything else resets as today.
- Double-tap on SET (or setting home while TIME is 0) clears it back to 0%.
- The home value is saved with sets; old sets start with home = 0%.

## Technical details
- `RepeatBar` in `src/components/Groovebox.tsx`: reorder buttons, add a grid layout class in `src/index.css` for even sizing.
- `src/audio/effects.ts`: gain param switches to a 0..1 position (`pos`) with a taper function pos→dB (bottom = -INF → gain 0, smoothed setTargetAtTime); hydration converts old `gain` dB to the matching position. `FxChain.tsx` fmt shows dB/-INF.
- `PerformanceParams` gets `timeHome?: number`; `PerformanceRack.tsx` adds SET hit-zone (aria-labelled, MIDI-learnable) and reset uses `time: v.timeHome ?? 0`.
- Typecheck and browser check of all three.
