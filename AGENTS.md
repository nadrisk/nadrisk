# Architecture
- Native uses shared Groovebox via Capacitor detection, so iOS stays aligned without site content.
- The public site renders only the groovebox; About opens as an overlay from an ABOUT key inside it; native stays groovebox-only. Theme state lives in each page shell and feeds the shared Groovebox so all five palettes stay consistent. Each load boots on the OLED display; DISP lasts only that visit.
- Use Tone.js for the browser instrument, started only after a user gesture and disposed on unmount, to provide reliable audio synthesis without hosted audio or a backend.
- Keep groovebox state and transport in a focused hook, and per-trigger voice graphs (drum, synth, sampler) in src/audio on the shared Tone raw context, so sound logic stays separate from the patch interface.
- Archive news; phrases use scale degrees/audio clock.

- Chords, choke assignments and A/B modulation lanes belong to each slot and are captured in sets, so recall restores performance routing without changing the original note grids.
- Master performance processing sits after the summed pads and before a safety limiter; transient capture buttons are never restored held from a saved set.
- Step-sequencer modulation is stored per slot per pattern bank (slot.mods[bank].values indexed by step) and applied only on lit steps, so the note grid stays the single place where rhythm lives.
- MIDI learn binds CC/notes to controls by their aria-label and drives them via synthetic DOM events (src/hooks/useMidi.ts), so every labelled control is mappable without per-control wiring.
- Master loudness and sub metering run as a silent parallel tap from the final output in that shared AudioWorklet bundle, so measurements reflect every master stage without changing audible routing.
- Step banks carry per-step vel and chance arrays beside the note grid; loop crops use stepAt() so the scheduler, recorder and grid playhead agree on which column plays.
- Slider double-click reset uses an explicit resetValue or the first value seen per ResetScope+label, and ignores synthetic (MIDI) events.
- DevicePanel owns frames; PixelScreen owns headers/controls. Drum headers temporarily replace the name with width-fitted knob values so six tabs cannot hide feedback. Phones stack; VIS stays unmounted.
- Hardware knobs (src/components/HwKnob.tsx) expose data-midi-value and accept a 'midivalue' CustomEvent, so MIDI learn drives them without synthetic pointer drags.
- Screens use integer-scaled 128x64 bitmaps and labelled hit-zones for crisp pixels/MIDI. Synth preview squares all 16 partials with fast-detail column coverage; empty additive oscillators are silent.
- Synth pitch, filter, and amplifier envelopes remain independent ADSRs, with shared draggable pixel-graph controls and backward-compatible set hydration so sound design stays direct without breaking saved sets.
- Pad holds (phrase, repeat, chord arp) are pumped from Tone's worker clock tick with a 150 ms horizon, and every voice booked ahead is tracked per pad so release, transport stop and set load cancel future notes; the grid uses a 100 ms look-ahead, so scheduling survives main-thread stalls without notes after release.
- Audio-context interruptions pause the transport in place and cancel booked notes; resume is retried on visibility return and the next tap, and the transport restarts only if the user hadn't pressed STOP, so interruptions never leave stuck or bursting notes.
- Mixer meters read a silent post-pan AnalyserNode per slot, written to the DOM per frame, so metering never re-renders the mixer.
- The master chain runs EQ → Glue → Clipper → Limiter, and the MASTER screen tabs, buttons and knobs follow that same order so display matches audio.
- Pads and live-strip keys (mutes, A–D) read raw touches with preventDefault (keys fire on lift <8px), so iOS never swallows fast taps.
- Sampler, poly and siren pad taps sustain until the last finger lifts, then release; imports accept WAV/MP3 only and are truncated to MAX_SAMPLE_SEC on decode.
- Pad pitch comes from slot.note (also the phrase root); a global Harmony (src/audio/harmony.ts) snaps NOTE knobs, walks phrases and picks chord quality in key, and sampler pitch is note relative to its sampleKey (sets v<2 migrate PTCH to NOTE), so one root drives every pitched path.
- Effects needing fresh note state use FxNode.trigger on the audio-clock path, keeping pads, phrases and sequencer hits aligned.
- Gate visible loops in frameGate; defer reverb impulses and sync only changed FX. REESE contours and shared 808/ACID digits reuse the slot meter via capped PixelScreen redraws, never React audio-frame updates.

- Pad patches (src/audio/patchStore.ts) store one slot's sound fields + FX rack and load through the same hydration as set recall, so patterns, names and chokes are never touched.
