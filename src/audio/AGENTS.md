# Audio
- Per-slot effects live in src/audio/effects.ts as rebuildable chains whose order is the audio order; custom DSP (bitcrush, envelope follower) runs in inline AudioWorklets so no extra files need hosting.
- Advanced rhythmic, ducking, multiband and buffer-capture processing uses inline AudioWorklets on the shared audio context, so effects remain audio-clock driven without hosted DSP files.
- Tone registers only one AudioWorklet module per context, so every processor (including the tape recorder in src/audio/tapeWorklet.ts) must be concatenated into the single loadWorklets bundle.
- Dynamics effect displays read silent analyser taps on each effect's pre/post nodes, so meters show live signal without altering the audible chain.
- Drum voices are per-kind machines in src/audio/voices.ts with optional fields filled by drumDefaults(), so older sets load without migration.
- Pad hits never build buffers or curves (sample variants pre-baked at idle, drive curves cached; max 6 ringing voices per pad), so every instrument triggers instantly.
- Voices expose stop() (instant cut for chokes, cap, transport) and release(at, r) (fade from the current level that only ever shortens a tail); retriggers and live release edits re-time a pad's ringing tails with its current release, so release changes are heard immediately.
