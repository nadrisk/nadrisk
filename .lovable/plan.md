# HACK: step-sequenced modulation, clean zero knobs, level control

## What changes for you
- Each HACK knob at 0 fully switches that part off, even while the pattern plays.
- The GEN pattern works like a step sequencer modulator: a looping row of steps per lane, locked to the beat, that repeats exactly until you press GEN again.
- New SMTH knob glides between steps: low values give hard square steps, high values give smooth flowing curves.
- The output level stays even, and a final peak catcher stops jumps and clipping. The effect's character stays the same.

## Controls
- Page 1: SHRT, CLK, STRV, MIX (unchanged)
- Page 2: RATE, STPS, DPTH, SMTH (SKIP and SIZE remain where they are now)
- The screen shows each lane's steps as bars with the smoothed curve drawn over them and a playhead. Lanes whose knob is at 0 are dimmed.
- The header shows the SMTH value while you turn it.

## Technical details
- `hack.ts`: `hackMod` returns 0 when knob <= 0.001; otherwise uses knob plus depth * value, scaled by the knob so modulation opens up around the base value. Steps are quantized pattern values from a seed; GEN rolls a new seed only.
- Worklet: step index comes from the transport position (RATE/STPS), so it stays in phase. A one-pole slew per lane with time from SMTH (0 = instant, max = about one step).
- Leveling: an analytic trim from the current STRV/SHRT amount compensates for the predictable gain rise; then a transparent peak limiter on the wet signal (fast attack, smooth release, ceiling about -1 dBFS) before MIX. The DSP of the effect is unchanged.
- Saving: `smth` stored per unit, default 0 for older sets.
- Tests: zero knob means no change from the dry path for that stage; same seed gives the same steps; slew at 0 is stepped and at max is continuous; output peak stays at or below the ceiling; level stays within about ±1.5 dB across STRV/SHRT ranges.
