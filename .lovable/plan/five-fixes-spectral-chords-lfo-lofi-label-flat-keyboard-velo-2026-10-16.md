# Five fixes: spectral chords + LFO, LOFI label, flat keyboard velocity, stereo width

## 1. Spectral synth plays chords
- When the synth is in SPEC mode, it gets the CHORD page like the poly and sampler pads (type, inversion, spread, strum/arp, follows the global key).
- ADD mode stays as it is (single note), and the chord settings are kept per pad, so switching modes loses nothing.
- Each chord note gets its own spectral voice. GATE handles up to 12 notes at once; any extra notes play ungated.

## 2. Vibrato mode button says where it goes
- In VIB mode the button reads LOFI. In LOFI mode it reads VIB. The knob value readout follows the same rule.

## 3. LFO works in SPEC mode
- The pad's shared free-running LFO is wired into the spectral voice for every target the LFO page offers (cutoff, pitch, amp; plus band SHIFT if the target list allows). Phase keeps running across notes, like the other synths.

## 4. Keyboard mode plays at full velocity
- In KBD mode every key from the MIDI controller plays and records at full velocity, whatever the touch. Pad mode is unchanged.

## 5. Stereo width
- Tape delay: the three heads are spread left / centre / right, and the spring is decorrelated per side. A new WDTH knob (default about 60%) controls the spread.
- Chorus, flanger and phaser: the left and right modulation run out of phase (chorus/flanger use a second delay line, phaser a second all-pass chain). Each gets a WDTH knob (default about 70%). 0 = the current mono sound, so older sets sound the same when loaded with width 0. New effects start with the default width.
- Bass under about 150 Hz stays centred.

## Technical details
- Chord path: in `useGroovebox.ts` play(), include `engine === "synth" && synth.mode === "spec"` in the chordNotes branch, and show the chord page in CyberspacePanel only in SPEC mode.
- LFO: pass `e.lfos[i]` into `playSpec` and connect it through depth gains to filt.frequency / osc detune / amp, mirroring playSynth.
- Velocity: `useMidi` keys flag forces vel = 1 before keyOn and in step recording.
- Width: add a `width` param to the delay/chorus/flanger/phaser defs. Older sets that have no width param load with 0, so they keep their current sound. Builds use ChannelSplitter/Merger, so the FX cost stays within MAX_FX_LOAD (raise the cost of these four effects slightly if needed).
- Add a rule to `src/audio/AGENTS.md` for the width design. Tests check the destination label, flat velocity and stereo decorrelation (L≠R offline).
