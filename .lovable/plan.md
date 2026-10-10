# Roll the pixel-screen look out to the remaining instruments

The WISPDISK sampler screen is approved. This plan extends the same 128×64 pixel-screen system to the other instrument panels and the save/load bank, using the existing building blocks (`PixelScreen`, `Zone`, `Tap`, `Px` drawing primitives, bitmap font). The audio engine, sequencing, MIDI and rack behaviour stay untouched — only how each instrument's settings panel is drawn and interacted with.

## What you'll see

- **Synth (CYBERSPACE screen):** page tabs OSC1 / OSC2 / FLT / LFO. Oscillator pages show a pixel waveform icon, pixel knobs for gain/pitch/fine, and the additive partials as 16 pixel bars. Filter page shows a stepped filter-curve graph with cutoff/resonance knobs. LFO page shows a tiny animated waveform with rate/depth knobs.
- **Drum (DRUMKIT screen):** page tabs per drum type (KIK/SNR/HAT) plus TONE and FLT pages; pixel pitch-envelope arrow graph, noise/FM/ring knobs, stepped filter curve.
- **808 (SUB808 screen):** pitch-envelope graph, release/click knobs, tube/harmonics/tone knobs — same layout language as WISPDISK.
- **Siren (SIREN screen):** LFO waveform display with rate/depth, sweep arrow graph, release knob.
- **Poly (ENSEMBLE screen):** cutoff/res/detune/sub/pulse/chorus knobs with a small voice-stack icon.
- **Shared ENV page:** every instrument gets an envelope page with the ADSR drawn as a stepped breakpoint graph and A/D/S/R pixel knobs (replaces the current AdsrView + knob row).
- **KIT save/load pop-up (MEMORY screen):** the 8 set slots as a pixel bank list with a stepped scrollbar, SAVE / LOAD / DEL / EXPORT / IMPORT pixel buttons, opened from the rack. Replaces the current SetBank panel visually; storage logic unchanged.

## How it's built

- One new file per screen in `src/components/` (e.g. `CyberspacePanel.tsx`, `DrumkitPanel.tsx`, `Sub808Panel.tsx`, `SirenPanel.tsx`, `EnsemblePanel.tsx`, `MemoryPanel.tsx`), each a `PixelScreen` with invisible `Zone`/`Tap` hit-zones on top — same pattern as `WispdiskPanel`.
- A shared `EnvPage` helper draws the ADSR graph + four knob zones, reused by every screen.
- `SlotEditor.tsx` swaps each engine's current HwKnob groups for its screen; the name field, mute, choke, chord-pad group and sample picker stay as they are.
- `SetBank.tsx` becomes the MEMORY pop-up shell; all save/load/export/import functions stay byte-identical.
- Each screen keeps its aria-labels, so MIDI learn, keyboard arrows and double-click reset keep working exactly as on WISPDISK.

## Deliberately out of scope

- No changes to the pad rack, step sequencer, mixer, performance rack or visualizers in this round.
- No audio-engine changes of any kind.
- Themes stay as they are (1-bit OLED default); per-instrument screen colours can be a follow-up if you want them.

## Check before done

- Typecheck passes.
- Browser check: open each engine's panel, turn knobs, switch pages, save/load a set through the MEMORY pop-up, confirm values change and sound follows.
