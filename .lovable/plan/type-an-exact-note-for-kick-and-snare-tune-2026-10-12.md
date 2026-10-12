# Type an exact note for kick and snare TUNE

## What you get
- While the top bar shows a kick or snare TUNE readout (e.g. `F#2+46c`), double-tap that readout to open a small pixel-style entry box, the same look as the sample BPM box.
- Type a note with optional cents: `G1`, `F#2`, `Bb1 -12`, `D#3+25c`. Plain Hz also works (`49`, `49hz`).
- OK sets TUNE exactly; Cancel/Escape changes nothing. Values outside the knob range (kick 25–135 Hz, snare 80–500 Hz) are clamped. Anything unreadable is ignored and the box stays open with a short "?" hint.
- While the box is open, the readout stays visible. It goes back to the pad name once the box closes.
- Double-tapping the knob still resets it as before. Hats, other knobs and other instruments are unchanged.

## Technical details
- `pixelScreens.tsx` Panel: track the last-touched knob with the readout. Add an optional `onReadoutEdit(knob)` prop. When it is set and a readout is showing, place a labelled header Tap zone ("Type exact value") over the readout area (x 0 to the first tab); double-tap opens the editor. Pause the 1.6 s readout timer while the editor is open.
- `DrumkitPanel.tsx`: enable this only for kick/snare TUNE. Add `parseNote(text)`, which accepts note, accidental (#/b), octave (negative octaves allowed), optional signed cents, or a Hz number; it returns Hz as `440·2^((midi+cents/100−69)/12)`, clamped. The editor box reuses the BpmDialog pattern (portal, theme context, Silkscreen).
- MIDI learn still works because the zone has an aria-label. Saved sets are unaffected because TUNE stays a frequency value.
- Tests: parseNote round-trips with noteCents (`G1+8c`, `C#2`, `Bb1-12c`, Hz input, clamping, junk). Browser check: double-tap the readout, enter `A1`, readout shows `A1`.
