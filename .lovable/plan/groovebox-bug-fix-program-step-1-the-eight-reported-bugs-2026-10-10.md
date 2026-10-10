# Groovebox bug-fix program — Step 1: the eight reported bugs

## Approach
Work through the uploaded report in steps, one approved batch at a time. This plan covers **Step 1 only: the eight bugs in section 1**. Feature requests (LFO destinations, Akai stretch, breakbeat slicing, channel meters, master chain reorder, responsiveness overhaul) become later steps, each with its own plan after this one is verified.

## Step 1 scope — bugs 1.1 to 1.8

1. **Spectral filter (1.1)** — Rebuild the spectral effect so it genuinely reshapes harmonic content: a resonant band-bank / vocoder-style spectral character with parameters that produce clearly audible change across their full ranges, instead of behaving like a conventional filter.

2. **Synth filter envelope retrigger (1.2)** — Fix the FLT envelope so it retriggers on every note: repeated notes, rapid playing, overlapping notes, and glide/legato transitions, without getting stuck.

3. **Insert channel EQ (1.3)** — Make the three-band EQ behave predictably: audible low and high cuts, and a mid sweep that works across its full range (currently dies around 4 kHz). Display curve and audio stay matched.

4. **Independent additive oscillators (1.4)** — Give oscillator 1 and oscillator 2 separate partial sets so editing one never changes the other, with correct recall when switching oscillators.

5. **Sampler reverse waveform (1.5)** — Mirror the displayed waveform when reverse is enabled, staying in sync with playback direction and position.

6. **Sampler loop (1.6)** — Make the loop button work: loop start/end points, continuous playback between them, a crossfade control to avoid clicks, and boundary updates during playback.

7. **Release ring-out and choke groups (1.7)** — Every instrument rings out per its release settings (like the 808); choke groups immediately cut same-group tails, never other groups, consistently across all instrument types.

8. **Master dynamics meters (1.8)** — Make the master GR and OUT meters respond to real audio (gain reduction and post-processing level), matching the live metering already used in the slot effects.

## What stays untouched
Sequencing, transport, recording, themes, layout, and all currently working features. No new controls beyond what a fix requires (e.g. loop crossfade).

## Verification per fix
- Typecheck, Vitest, and a production build.
- Live-preview checks: rapid repeated pad hits, overlapping notes, glides, choke behavior, meter movement, EQ sweeps, loop adjustment during playback.
- Regression pass on playback, held phrases, note repeat, STOP, and set save/load.
- Where possible, audio-level assertions via analyser taps; listening confirmation on real speakers/headphones remains yours.

## Later steps (separate plans, in report order)
- Step 2: Synth LFO multi-destination modulation with per-destination depth and LFO attack (2.1).
- Step 3: Akai-style time stretch (2.2).
- Step 4: Breakbeat import, warp, and slicing (2.3).
- Step 5: Mixer channel dB meters (3.1).
- Step 6: Master chain reorder EQ → Glue → Clipper → Limiter (4).
- Step 7: Instrument triggering responsiveness audit (5).
