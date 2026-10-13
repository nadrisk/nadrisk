# Targeted fixes and audio refinements

1. **303 click removal** — In the ACID voice, start each note with a 2 ms fade-in on a separate de-click gain, start the oscillator at a zero-crossing phase, and end every stop/release with at least a 3 ms fade before the oscillator stops. Retriggers fade the previous voice instead of cutting it, so no pop reaches drive or delay.
2. **Tape delay SEND knob** — Add a new `send` parameter (default 1, so saved sets sound unchanged) that sets the level going into the tape loop. At 0 the loop gets nothing, so only the spring reverb is heard. Rearrange the tape delay knob pages so every page has an even number of knobs with full, untruncated labels.
3. **Double-tap reset on multi-page screens** — Today the reset value is the first value seen for each label, so switching pages and coming back records the edited value as the default. Fix: take the default from each effect's or instrument's real factory default (the effect parameter table, or the drum preset's home value), and only fall back to the first-seen value when there is no factory default. This applies to all panels that share the knob code.
4. **Sampler One-shot to ADSR** — Switching the play mode quickly fades out (about 5 ms) any sample voice still ringing on that pad.
5. **Spectrum freeze** — Investigate first: reproduce by holding a BRK pad with the spectrum visible. Likely causes are the screen's update loop stopping and not restarting, or the pad's analyser disconnecting when the voice is rebuilt. Fix the cause that is confirmed and make the loop restart if it ever stops.
6. **Performance and sampler layout**
   - Move SET directly above the TIME readout on the FX page. Make it flash once per press instead of staying lit (an asterisk next to T still shows that a home is stored).
   - Move the sample name onto its own line below the knobs on the sampler screen.
   - In the BPM entry box, use at least 16px text on phones so iOS doesn't zoom in, and scroll back after the box closes.

Afterwards, check desktop (1280), tablet (768) and phone (390) layouts for overlap, run the tests, and do offline renders for the 303 clicks and delay SEND = 0.

## Technical details
- Files: `src/audio/acid.ts`, `src/audio/effects.ts` (delay `send` param + input gain), `src/components/FxChain.tsx`, `src/components/pixelScreens.tsx` / `HwKnob.tsx` reset lookup, `src/hooks/useGroovebox.ts` (sampler mode change → `stop()` on the pad's voices), `src/components/SpectrumScreen.tsx` + `src/lib/frameGate.ts`, `src/components/PerformanceRack.tsx`, sampler panel, `src/index.css`.
- Update the reset rule in AGENTS.md.
