# noiz~ — noise injection effect (based on Robbert van der Helm's Crisp)

## What you get
A new effect called **noiz~** in the **DIRT** group on the FX screen. It adds noise that follows the sound itself: the noise only appears while the sound is playing and pulses with it, giving kicks, 808s and basses bite and sizzle without washing out the low end. Works on single pads and on groups G1–G4 like every other effect.

## Controls (same pixel-knob style as the other effects)
| Knob | What it does |
|---|---|
| AMT | How much noise is added (fine control at low amounts) |
| MODE | CRSP (Crisp: noise follows the upper half of the wave), FULL (noise follows the whole wave, rougher), ALTR (follows the lower half, different texture) |
| TONE | Colour of the noise, dark crunch to airy fizz |
| PRE | How much of the source's top end drives the noise; low = only the body/kick drives it |
| WDTH | Mono noise to wide stereo noise |
| MIX | Dry/wet, like other effects |

Starting values are subtle (AMT low, CRSP, PRE fairly low) so adding it never jumps out loud.

## Also included
- Small 1-bit icon/screen art matching the other effects.
- A modulation target (AMT) so sequencer mod lanes can move it.
- Counted in the FX load meter (light cost).
- Saved in sets and pad patches like any effect; older sets unaffected.
- Quick Guide gets a one-line entry.

## Technical details
- New `nad-noiz` AudioWorklet in the existing worklet bundle in `src/audio/effects.ts`: per-channel xorshift noise, one-pole LP on the modulator input (PRE), modulator `max(0,x)` / `x` / `min(0,x)` by MODE, noise shaped by a 2-pole HP+LP pair around TONE, decorrelated L/R noise blended by WDTH, output = dry + AMT·shaped noise·mod, then MIX.
- Register `noiz` in the FX definition table (`label: "noiz~"`, params amt/mode/tone/pre/width/mix), `FX_COST`, `MOD_PARAMS`, DIRT category, and `FxChain.tsx` value formatting/labels (MODE shows CRSP/FULL/ALTR, TONE/PRE in Hz/kHz, WDTH MONO..WIDE).
- Unit test evaluates the worklet source: silence in -> silence out; CRSP adds noise only on positive excursions; AMT 0 is bit-identical to dry.
