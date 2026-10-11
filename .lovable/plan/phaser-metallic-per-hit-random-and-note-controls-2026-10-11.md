# Phaser, metallic per-hit random, and NOTE controls

## 1. Make the phaser produce clear moving notches
- Replace the current internally summed/feedback arrangement with a classic guitar-pedal topology: dry signal mixed with a six-stage first-order all-pass chain, producing three moving cancellation notches.
- Keep the existing **RATE, SYNC, DEPTH, MAN, FDBK, ENV and MIX** controls and saved values.
- Sweep every stage around the same musical centre with small stage offsets, rather than spreading their fixed frequencies so widely that the result resembles short-delay flanging.
- Keep feedback stable and use it to sharpen the notches without creating a comb-like metallic tone.

## 2. Replace metallic random LFO with per-hit random
- Remove **RATE, SYNC, M-TM, M-TN and M-FB** from the metallic effect.
- Add one **RND** knob. At 0%, each hit uses the exact selected settings. Increasing it gives each new hit a safe random variation of **NOTE, TONE, METL and FDBK**.
- Trigger a new random state from every played hit, including sequencer and phrase hits.
- Keep the envelope-bounded feedback safety and tape-delay-style pitch glide when the resonant NOTE changes.
- Old sets still load: their removed modulation values are ignored and **RND** defaults to 0%.

## 3. Make NOTE readouts show the actual note first
- The current synth and sampler headers have room for only six characters, so degree-first labels such as `IV F3` can be cut down to only the Roman numeral.
- Change the compact NOTE readout to put the note first, for example `F3 IV` or `F#3 V`, trimming only the degree when space is especially tight.
- Keep scale snapping and chord-degree behavior unchanged.

## 4. Give poly a dedicated pitch page
- Move poly's existing NOTE control from **FLT** to a new **PIT** page so it is visible and unambiguous.
- The page will show the current note and its position in the selected global key/scale; no poly sound controls or pitch behavior change.

## Checks
- After each section: run the focused type check and tests before moving on.
- In the browser: confirm the new controls appear, old metallic sets load, NOTE readouts begin with note names, poly has a PIT page, and every pad/sequencer trigger requests a new metallic random state.
- Measure the phaser response to confirm multiple moving notches and no delay-comb spacing.
- Final sound judgment remains an iPhone ear test: phaser sweep, metallic hit variation, and tape-like retuning.

## Technical details
- Follow the standard multi-stage all-pass phaser model used by JUCE and classic four/six-stage pedal designs: pairs of all-pass stages create cancellation notches only when mixed with dry.
- Extend the effect-node interface with an optional per-hit trigger, rather than driving randomness from a free-running oscillator. Call it beside the existing per-hit pitch notification in the groovebox trigger path.
- Keep serialized effect parameter keys backward-compatible; hydration may retain unknown old modulation fields harmlessly.
