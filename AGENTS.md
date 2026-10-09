# Architecture
- Keep the site on React and Vite with shared patcher styling across home and news so navigation remains consistent.
- Use Tone.js for the browser instrument, started only after a user gesture and disposed on unmount, to provide reliable audio synthesis without hosted audio or a backend.
- Keep groovebox state and transport in a focused hook, and per-trigger voice graphs (drum, synth, sampler) in src/audio on the shared Tone raw context, so sound logic stays separate from the patch interface.
- Per-slot effects live in src/audio/effects.ts as rebuildable chains whose order is the audio order; custom DSP (bitcrush, envelope follower) runs in inline AudioWorklets so no extra files need hosting.
- Preserve the original news data as the archive's source of truth; the home page may select entries but must not duplicate their content.- Pad phrase sequencers store pitch as scale degrees (src/audio/arp.ts) and run on a look-ahead audio-clock scheduler while a pad is held, so phrases stay in key and in time.

- Chords, choke assignments and A/B modulation lanes belong to each slot and are captured in sets, so recall restores performance routing without changing the original note grids.
- Advanced rhythmic, ducking, multiband and buffer-capture processing uses inline AudioWorklets on the shared audio context, so effects remain audio-clock driven without hosted DSP files.
- Master performance processing sits after the summed pads and before a safety limiter; transient capture buttons are never restored held from a saved set.
- Step-sequencer modulation is stored per slot per pattern bank (slot.mods[bank].values indexed by step) and applied only on lit steps, so the note grid stays the single place where rhythm lives.
