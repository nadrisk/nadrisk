# Metal feedback, free-running LFOs, new drum bus, effect load limit, insert EQ

## 1. Metallic feedback stays under control
- The feedback follows the incoming sound. When a hit comes in, the feedback opens up. As the sound dies away, the feedback drops with it, so it can never build into a screaming drone on its own.
- A new **DCY** control sets how long the feedback stays open after each hit.
- There's also a safety ceiling inside the loop, so even the highest FDBK setting rings and then decays.
- **Random square modulator**: a new MOD page with a stepped random modulator (it jumps to a new random value on every step). You get:
  - **RATE**, free in Hz or synced to the tempo
  - an amount for each of **TIME** (pitch of the ring), **TONE** and **FDBK**

  The result is glitchy, jumping metallic pitches.

## 2. LFOs keep running between notes
- Right now the synth LFO and the siren wobble restart from zero on every hit. Instead, each pad's LFO keeps running in the background, and every note picks it up wherever it currently is.
- The synth LFO's ATK fade-in still applies to each note.
- A **FREE / TRIG** switch on the LFO page lets you get the old restart-on-every-hit behaviour back when you want it. FREE is the default.

## 3. Drum bus rebuilt: four one-knob controls (BOOM removed)
- **TRANS**: turn left for tighter (shorter tails), right for more open (longer sustain). Centre does nothing.
- **SMASH**: in the style of the Pulsar Smasher. Smasher models an 1176 compressor in its "all buttons in" mode: very fast attack, extreme compression and heavy grit [1](https://pulsar.audio/smasher/). Turning it up pushes from slight grit to total squash, with louder output to match.
- **TONE**: turn left for darker, right for brighter, centre is flat.
- **CLIP**: a soft clipper that catches peaks before they go over 0 dB, in the style of an overdriven Tascam 4-track cassette. The low end hits the clipper first, so kicks and bass get that thick, woolly, compressed saturation (the Tame Impala drum sound), and the top end rolls off slightly like tape.
- **MIX** stays.
- Saved sets using the old drum bus load with sensible settings: the old ATTACK/SUSTAIN settings become TRANS, and BOOM is dropped.

## 4. Effect load limit, like the Zoom MS-50G
- Each effect has a load cost. Reverb, metal, the spectral filter and OTT are heavy; EQ, the DJ filter and tremolo are light.
- The ADD page shows a **LOAD** bar for the whole groovebox (all 16 pads together).
- An effect that would push the load past the limit shows as greyed out on the ADD page and can't be added. The bar reads **FULL**.
- I'll set the limit with measurements in the test browser (and by eye against a tablet-class CPU), so that 16 pads with a full sequencer keep running without crackles.
- A saved set that's already over the limit still loads and plays, but the LOAD bar shows **OVER** until you remove some effects.

## 5. Insert EQ that behaves like a normal channel EQ
- **Matched curve**: the screen asks the actual EQ filters for their frequency response and draws it, so what you see is exactly what you hear.
- **Stronger lows and highs**: LOW and HIGH go from -24 to +12 dB. Turning one fully left becomes a proper cut (a 24 dB/oct low-cut or high-cut at its frequency), the way a DJ-mixer kill or an EQ low cut works.
- **Mid**: a standard bell with a proper bandwidth Q, and a slightly wider default. Boost and cut sound symmetrical, as on studio channel EQs.
- **Reference**: these are the standard EQ formulas, the Audio EQ Cookbook, which the browser's filters and open-source channel EQs like x42-fil4 both use. The fix is mostly that our display didn't match those filters and the shelves were too gentle, not that the filter maths was wrong.

## Not changed
Other effects, instruments, sequencing, pads, layout and themes.

## Checks
- Typecheck, tests and build.
- Test-browser measurements:
  - metal: the output falls back to silence after a hit, even at maximum FDBK
  - LFO: its phase continues across consecutive notes, and TRIG mode restarts it
  - drum bus: each knob changes the level and tone in the right direction
  - EQ: the drawn curve matches the measured response, and full-left LOW removes the lows
  - load limit: ADD blocks at the limit, and playback stays smooth at the limit
- Fast-tap check on the phone simulation.

## Technical details
- `effects.ts` metal: an input envelope follower (worklet) multiplies `fb.gain` (feedback × env, decay from DCY). A tanh soft clip plus a 0.9 hard ceiling sit in the loop. A sample-and-hold LFO (`ConstantSource` stepped on the audio clock, or a tiny worklet) fans out through depth gains to `delayTime`, `lp.frequency` and `fb` modulation. New params: `decay`, `modRate`, `modSync`, `modTime`, `modTone`, `modFb`.
- LFO: one free-running `OscillatorNode` per slot in `Engine` (synth and siren rate/wave kept in sync on change). `playSynth`/`playSiren` connect it through their per-note fade gain instead of creating their own. A `lfo.retrig` flag keeps the per-note oscillator path.
- Drum bus: `nad-transient` driven by `trans` (attack/sustain derived from it), then an 1176-style FET stage (fast attack, ratio about 20, program-dependent release, pre/post saturation), then a tilt EQ (a low and a high shelf around 800 Hz, opposite gains), then a pre-emphasis low shelf, a soft clip with a 0 dBFS ceiling, de-emphasis and a gentle high roll-off. Migration happens in set hydration.
- Load: a `FX_COST` table plus a `MAX_LOAD` constant. The current total is computed from all slots, and `FxChain` disables the ADD taps it can't afford.
- EQ: the curve is drawn from `getFrequencyResponse` on the live (or offline mirror) biquads. LOW and HIGH at -24 swap to cascaded highpass/lowpass. Ranges widen, and old sets stay valid.
