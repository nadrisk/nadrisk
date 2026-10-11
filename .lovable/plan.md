# Play/stop button in the sequencer view

## What you'll get
A **PLAY/STOP key on the SEQ screen itself**, so you can start and stop the pattern without leaving the sequencer.

## Changes
1. **SeqScreen** (`src/components/HwScreens.tsx`): add a PLAY/STOP key on the second row, in the empty space right of CLR (x 97, width 30). It shows PLAY when stopped, STOP when running, and lights up while playing — same look as the other keys on that screen.
2. **Groovebox.tsx**: pass the existing `g.playing` state and `g.togglePlay` into SeqScreen. No new logic — it drives the exact same transport as the MASTER screen's PLAY/STOP, so both stay in sync.

## Untouched
- Transport behavior, audio engine, and the MASTER screen's own PLAY/STOP.
- All other screens, the step grid, and row faders.

## Verify
- Typecheck + simulated phone tap: SEQ screen's PLAY starts playback, shows STOP while running, stops again on tap; MASTER screen still reflects the same state.
