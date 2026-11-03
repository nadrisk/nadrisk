# HACK: Glitch Bot screen + S&H pattern modulation

## What you get
- **New screen: Glitch Bot.** A small, cute CRT robot in the middle of the screen, kept well inside the frame so nothing overlaps. Its face reacts to the sound and the knobs:
  - idle `[・_・]`, SHRT up = eyes flicker/swap, CLK low = slow blink, STRV = face sags/dims, SKIP = face jumps sideways for a moment.
- **GEN button (BEND page).** Each press rolls a new random modulation pattern for SHRT, CLK, STRV and SKIP, locked to the beat.
- **Pattern shape: sample & hold steps.** Jagged random squares: each step jumps to a new level and holds it, no smooth ramps. Every lane gets its own steps.
- **It fits the sound you already have.** The pattern moves around your current knob settings and never replaces them. DEPTH sets how far it moves. With DEPTH at 0 you hear exactly the knobs.
- **No dead patterns.** Like the phrase sequencer, the roll avoids getting stuck on one value or flipping between just two values.
- **Screen feedback.** Four small lanes of square steps under the bot, with a playhead. The header shows the knob and value you're turning, like the other effects.

## Controls
- Page **BEND**: SHRT · CLK · STRV · SKIP (as now)
- Page **PATT**: GEN button · RATE (1/4, 1/8, 1/16, 1/32) · STPS (4/8/16) · DEPTH
- Page **OUT**: SIZE · SYNC · MIX
- CHAOS is replaced by DEPTH. Old sets load with DEPTH 0 and no pattern, so they sound the same as before.

## Technical details
- Store `pattern: number[4][16]` (−1..1 values), `seed`, `rate`, `steps`, `depth` on the hack FX params. They save with sets and pad patches.
- Pattern step comes from the transport position (Tone ticks), so it lines up with the grid. The step value is held for the whole step: true S&H, no smoothing. Only a 2 ms declick happens on the worklet side.
- Value used = clamp(knob + depth × lane[step]), worked out per step and sent to the worklet parameters with a sample-accurate change at each step.
- Rolling (`src/audio/hack.ts`): seeded `hackRng`, random levels in lanes, reroll if a lane has fewer than 3 different levels or repeats the same level more than 3 steps in a row. SKIP lane is sparse (mostly 0, some spikes).
- Visual in `FxChain.tsx` hack branch: bot drawn inside y 23–42, lanes underneath, all inside the frame. It only redraws when needed, through the existing PixelScreen.
- Tests: GEN is deterministic for a given seed; no stuck lanes; DEPTH 0 equals the knob values; step lookup matches the grid step; old sets load without a pattern.
