# Curated open-source rave sample library

## Goal
Replace the built-in sampler palette with recognisable, useful rave and electronic-music sounds while only bundling audio that is clearly licensed for redistribution. Existing saved sets must retain their original sounds.

## Library direction
Build a compact, performance-ready collection around:

- A clean-room **Amen-style break** recreation, not the copyrighted original master.
- Several **Juno-style hoover** notes or stabs suitable for pitching across the pads.
- Short **vocal shouts** with clear CC0 permission.
- Supporting classic electronic drums, metallic percussion, bass hits and textures from CC0 or redistribution-permitted repositories.

Candidate sources already checked:

- Freesound: CC0 Amen recreation by JapanYoshiTheGamer.
- Freesound: CC0 Juno-2/hoover recordings by woowah.
- Freesound: CC0 vocal material from unfa, selecting only individually verified clips.
- MckAudio: CC0 hardware drum recordings.
- Stargate sample repository: samples explicitly permitted for redistribution.

Every chosen file will be checked individually; attribution and licence details will be recorded with the bundled library. Any file whose permission is unclear will be excluded.

## Implementation
1. **Curate and prepare the audio**
   - Download only verified reusable source files.
   - Trim silence, make sensible start points, remove unintended DC offset, and set consistent headroom without crushing dynamics.
   - Export browser-friendly WAV files and keep loops cut to exact musical boundaries where appropriate.

2. **Expand rather than overwrite**
   - Keep all 12 current library files and identifiers so saved sets continue sounding exactly as they do now.
   - Add new `rave-*` library identifiers and files alongside them.
   - Avoid changing the behaviour of imported user samples.

3. **Create the new starting palette**
   - Point the default sampler slots to selected rave sounds, including the Amen-style break, hoover and vocal shout.
   - Keep synthesized drum, 808, synth and poly slots unchanged unless a sampler slot is intentionally replaced.
   - Set useful initial sampler modes: BRK for the break with its source BPM supplied, ADSR/ONE for stabs and shouts, and appropriate pitch/root settings.

4. **Expose the collection in the existing sample picker**
   - Add concise hardware-screen names that fit the current pixel UI.
   - Preserve the existing library entries so old sounds remain selectable.
   - Make no unrelated UI or audio-engine changes.

5. **Licence record**
   - Add a human-readable sample credits/licence file covering source URL, creator, clip name, licence and any required attribution for each bundled sound.

## Verification
- Confirm every new library identifier resolves to a playable file.
- Load an older saved set and verify its original library identifiers still resolve unchanged.
- Reset to the default set and verify the new break, hoover and shout are present with their intended modes and settings.
- Check the break loops and follows project tempo in BRK mode using its known source BPM.
- Run the existing tests, TypeScript check and production build.
- Leave final sound judgement to an iPhone ear-test before publishing.

## Scope boundary
This changes the bundled samples, their catalogue entries and the default sampler choices only. It does not alter the sampler engine, effects, sequencer, other instruments or existing saved-set data.
