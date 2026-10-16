# Fix: spectral GATE silent, chords playing one note

## What's wrong
- **GATE does nothing:** the spectral gate is created in a way the app's audio system rejects. The error is caught silently, so every note plays ungated and turning GATE changes nothing.
- **Chords sound like one note:** the chord notes are worked out correctly, but the synth plays every one of them at the root pitch (stacked unisons) and ignores strum timing.

## Fixes
1. Create the spectral gate the same way the spectral~ effect does, so it actually loads on every note. If it ever fails to load, report it once in the console instead of failing silently.
2. Give each chord note its own pitch and strum/arp timing on the synth pad, like the poly pad. This is how SPEC chords become real chords. ADD mode is unchanged.
3. Check the held-note path and MIDI keyboard (KBD) path too, so chords and GATE work from pads, the sequencer and the keyboard alike.

## Check
- Offline render: a C-minor chord on a SPEC pad shows three separate pitches in its spectrum. GATE 0 vs GATE 1 changes the spectrum clearly, and quiet bands disappear at high GATE.
- In the browser, a SPEC pad with chord on: confirm the spectral gate node is created (no fallback) and the chord sounds.

## Technical details
- `src/audio/spectral.ts` `takeGate`: replace `new AudioWorkletNode(ctx, …)` with `Tone.getContext().createAudioWorkletNode("nad-specsynth", { outputChannelCount: [2] })`. The raw context is a wrapped context, so the native constructor throws. Warn once on failure.
- `src/hooks/useGroovebox.ts` `run()`: the synth branch calls `playSynth(..., pitch, t, gate, ...)`. Change it to `pitch + offset, at(k), gk(k)` for every synth note. With a chord off, `notes` is `[0]`, so behaviour is unchanged.
- Add a test asserting that a SPEC chord plays distinct pitches, and that the gate pool uses the Tone context factory.
