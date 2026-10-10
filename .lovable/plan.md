# Rebuild the drum engine: modern, Elektron-style kick, snare, hat and clap

## Why the hat pitch controls do nothing
All three drum types share one generic voice: a single oscillator plus noise through one filter. On the hat:
- The pitch sweep only moves that one oscillator. The metallic parts stay at fixed pitches.
- That oscillator is only 30% of the mix, behind a 7 kHz filter, so you mostly hear noise.
- The default sweep amount is 0, so pitch decay has nothing to shape.

## Direction: modern "machines", not vintage-circuit copies
Elektron's Syntakt and Analog Rytm are built around per-sound machines. Each type of sound has its own small, purpose-made set of parameters rather than one generic voice, and every track has its own overdrive and filtering. Syntakt's digital tracks include dedicated bass drum, snare, hi-hat/cymbal and clap machines [5](https://www.elektron.se/product/syntakt). The sound comes from the controls themselves: punchy FM-style tones, short sweeps and tight transients. That is what this rebuild follows. The machines below are designed in that spirit; they are not copies of Elektron's.

Each machine has eight controls on its main page, which is the Elektron style. Every control audibly changes the sound.

1. **KICK (FM kick):** a sine body with an FM operator for punch and grit. Controls: TUNE, SWEEP (depth), CONTOUR (sweep time and curve), FM AMT, FM DECAY, TRANSIENT (click level and type), DECAY, DRIVE.
2. **SNARE (FM snare):** a tuned FM body plus a separate noise layer. Controls: TUNE, SWEEP, FM AMT, BODY DECAY, NOISE LEVEL, NOISE DECAY, NOISE TONE (filter base and width), DRIVE.
3. **HAT / CYMBAL (metallic):** six detuned square/FM partials, which give the shimmer. Pitch and sweep move all six, so the pitch controls are clearly audible. Controls: TUNE, SWEEP, CONTOUR, SPREAD (how far apart the partials are), COLOR (tone vs. noise), TONE (filter base and width), DECAY, DRIVE. Closed, open and ride become presets of this one machine.
4. **CLAP (new):** a burst generator with a separate room tail. Controls: TONE (band-pass), WIDTH, BURSTS (1–6), SPREAD (time between bursts), TAIL, TAIL TONE, DECAY, DRIVE.

Every machine also gets:
- **A clean sound by default**, with a track overdrive for the modern punch.
- **A base-width filter:** high-pass and low-pass together, set by a base and a width, instead of a single filter type.
- **Velocity that changes the sound, not just the level:** harder hits get more sweep and more transient. This also makes note-repeat rolls feel alive.

## On screen
- The kind selector gains a fourth option: KICK / SNR / HAT / CLAP.
- The page showing which machine is loaded is labelled MACH. Its eight knobs are laid out as two rows of four.
- The ENV page keeps the draggable ADSR graph.
- Each machine has its own small visual that reacts to its controls: the sweep curve, the partial spread, the burst pattern and the decay shape.
- The CLAP pad loads the new clap machine.

## Kept as-is
- Old saved sets still load. Their drum values carry into the new machines, and any missing values get defaults.
- MIDI learn, the sequencer, effects, choke groups and recording are unchanged.

## Check
- For each machine, turn each of the eight knobs, confirm the sound clearly changes, and check that its visual moves.
- Confirm the hat's TUNE and SWEEP are clearly audible.
- Load an old saved set and check it still plays.

## Technical details
- `src/audio/voices.ts`:
  - `DrumParams.kind` gains `"clap"`, plus optional machine fields: `sweep`, `contour`, `fmAmt`, `fmDecay`, `transient`, `bodyDecay`, `noiseLevel`, `noiseDecay`, `noiseBase`, `noiseWidth`, `spread`, `color`, `bursts`, `burstGap`, `tail`, `tailTone`, `drive`, `fltBase`, `fltWidth`.
  - `playDrum` dispatches to `playKick`, `playSnare`, `playHat` and `playClap` on the shared raw context.
  - Drive uses a WaveShaper with a tanh curve. The base-width filter is a high-pass then a low-pass Biquad pair. Velocity scales the sweep depth and the transient gain.
  - Hat: six oscillators, each at `tune × ratio × spread`, all ramping with sweep and contour.
- `src/hooks/useGroovebox.ts`: new machine defaults, presets for KICK/SNARE/HAT CL/HAT OP/RIDE/CLAP/NOISE, and hydration that maps old fields (`pitchEnv` to `sweep`, `pitchDecay` to `contour`, `noise` to `noiseLevel`/`color`, `cutoff` to `fltBase`).
- `src/components/DrumkitPanel.tsx`: the MACH page (eight labelled knob zones per kind), per-machine visuals and the four-way kind selector. MIDI-learnable aria labels are kept.
- `roadmap.md`: add "Elektron-style drum machines and clap".
