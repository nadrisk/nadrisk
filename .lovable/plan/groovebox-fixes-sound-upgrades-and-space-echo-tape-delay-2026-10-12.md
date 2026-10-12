# Groovebox fixes, sound upgrades and Space Echo tape delay

Built in four stages. Each stage ends with a build check and a browser check, then pauses for your approval and ear test before the next one starts.

## Stage 1: Quick screen fixes
- Shorter effect names: rvrb, rvrs, metal, trance, and the insert panel is now called EQ.
- Fix the EQ screen that sometimes shows up black.
- 808: remove the second CLK from the AMP page and put drive in its place. Double-tap now resets each knob to a classic 808 setting instead of 0.
- STEPSEQ / PERFORM: move RESET · DROP onto the screen so both panels line up.
- Synth: the wave preview draws the actual wave made from the 16 harmonics.

## Stage 2: Controls and master sound
- BPM: tap the number to type a value, with − / + buttons next to it.
- Mod sequencer: only the parameters that make a big difference are listed.
- Tape recorder: when stopped, REC counts in for 2 beats and then starts. When playing, REC waits for the start of the next loop.
- Master EQ: the low and high bands get broader shelves, so turning them makes an audible difference.
- ECO gets a clearer label.

## Stage 3: Screens
- 1-bit oscilloscope. The EQ panel can switch between EQ and SCOPE, and the scope also fills the empty space next to the sampler and poly.
- Poly voice / spread display.
- Live screens for OTT (gain reduction on 3 bands), bitcrusher (bit and rate steps) and spectral gate (threshold).

## Stage 4: Sound engine
- Sidechain becomes a simple ducker with PAD, HP, DUCK, SMOOTH and REL.
- Compressor rebuilt so it reacts quickly and you can see the gain reduction.
- Saturation gets a smoother, warmer curve.
- Metal gets a THRESH knob, so quiet tails stop it ringing.
- Reverse delay gets a PING ping-pong switch.
- Drum bus SMASH is recalibrated so the squash is easy to hear.
- tape.delay~ becomes a Space Echo (inspired by RE-201 / Stardust 201):
  - 3 playback heads (MODE)
  - warm saturation on the repeats
  - repeats that get darker as they go
  - wow and flutter
  - a SPRING reverb control with a drip sound
  - the screen shows the heads and the spring.

## Technical details
- Stage 1: effect labels in FX_DEFS, the ChannelEqScreen redraw fix, resetValue on the 808 knobs, the PerformanceRack layout, and the CyberspacePanel wave.
- Stage 2: the BPM input in Groovebox, filtering MOD_PARAMS, tape.ts arm/count-in on the transport clock, and the master shelves in performance.ts.
- Stages 3–4: new processors are added to the single shared AudioWorklet bundle. The spring is built from allpass chirp stages with a lowpass delay loop, and FX_COST is updated. Saved sets keep loading through default params.
- Frame layout, MIDI learn labels and touch handling stay the same.
