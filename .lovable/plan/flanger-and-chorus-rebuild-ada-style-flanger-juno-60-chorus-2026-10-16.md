# Flanger and chorus rebuild: ADA-style flanger, Juno-60 chorus

Both effects are currently one shared, simple delay line. Each gets its own dedicated model, based on published circuit analyses and open-source emulations (bucket-brigade delay models, TAL-U-NO-LX and Juno chorus write-ups, ADA flanger circuit notes). The research happens as the first step, and the findings are noted before any sound is built.

## Chorus: Juno-60
- **Three switches, like the real one:** I (slow, gentle), II (faster, deeper), I+II (fast, shallow shimmer). They use the real triangle-wave speeds and delay ranges from the circuit (roughly 0.5 Hz, 0.8 Hz and about 8–10 Hz).
- **The lush stereo comes from the circuit itself:** a single delay line, swept left and right in opposite directions, with the dry signal in both sides. That is what makes it feel wide without phasing in mono.
- **Analogue character:** the dark, soft top end of the original chip, gentle saturation, and an optional quiet hiss (NOIS knob, default low).
- **Controls:** MODE (I / II / I+II), MIX, WDTH, NOIS. RATE and DEPTH stay as fine-tune offsets around the chosen mode (centred = authentic).

## Flanger: ADA
- **The ADA's very wide sweep:** about 35:1, from near-zero delay (through-zero-like jet sounds) up to long, metallic delays.
- **Controls modelled on the pedal:** MAN (manual delay position), RNGE (sweep range), SPED (rate, still syncable), ENH (feedback, from negative/hollow through to positive/ringing, the ADA "Enhance"), plus MIX and WDTH.
- **Analogue character:** a lowpassed delay chip, soft clipping inside the feedback loop so high ENH screams but never explodes, and a slightly curved sweep like the real LFO.
- Setting RATE to 0 gives the classic static "manual" comb tone.

## Older sets
Saved chorus and flanger settings load into the new models with matching values (old RATE/DEPTH/MANUAL/FDBK mapped across), so nothing breaks. They will sound different, by design.

## Screens
Existing chorus/flanger visuals keep working; they will read the new parameters (chorus mode shown on screen).

## Checks
Automatic tests: no runaway at maximum feedback, MIX 0 is fully dry, stereo actually differs left/right, older sets load. Browser check for errors. Ear test stays with you.

## Technical details
- New `nad-juno` and `nad-ada` processors added to the single shared worklet bundle (per src/audio/AGENTS.md): fractional-delay BBD model with anti-alias/reconstruction lowpass, per-mode triangle LFO, tanh clip in feedback.
- New params added to the defs in effects.ts; hydration maps old `manual`/`feedback`/`depth` and fills missing keys with defaults. FX_COST adjusted if needed. MOD_PARAMS keeps `mix`.
- Record the design rule in src/audio/AGENTS.md.
