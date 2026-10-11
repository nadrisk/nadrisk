# Clean GAIN utility effect

Modelled on Airwindows **PurestGain**: a gain stage that does nothing except change level. No saturation, no filtering, no colour.

## What you get
- New effect **GAIN** in the ADD list, with its own small icon (a plain up arrow over a flat line).
- One knob: **GAIN**, 0 to +24 dB, default 0 dB (no change). The screen shows the value in dB with a big level bar.
- Double-tap resets to 0 dB. MIDI learn works like every other knob.
- Lightest load cost (1), so it almost never hits the effect limit.

## How it stays clean (best practices)
- The knob works in dB so its feel matches how loudness is heard. The audio uses the exact matching multiplier.
- Knob moves glide over about 20 ms, the way PurestGain smooths its changes, so turning it never makes zipper noise or clicks.
- No dither or bit tricks. The browser already processes audio at full 32-bit float, so a plain multiply is fully transparent.
- It has no ceiling of its own: big boosts are caught by the master limiter. If you put a GAIN before a clipper or the drum bus, it pushes that effect harder, which is useful on purpose.

## Not changed
All other effects, instruments, sets and layout. Old sets load as before.

## Technical details
- `effects.ts`: add `gain: { label: "gain~", params: { gain: [0, 0, 24, 0.1] } }` to FX_DEFS, FX_COST `gain: 1`; chain = single GainNode, `gain.setTargetAtTime(10**(db/20), now, 0.006)` on update.
- `FxChain.tsx`: `fmt` for `gain` -> `+X.XDB`; visual = level bar plus dB readout.
- `fxIcons.ts`: new `gain` icon.
- Verify: typecheck/tests; browser measurement that +6 dB doubles RMS amplitude and 0 dB is bit-identical in level.
