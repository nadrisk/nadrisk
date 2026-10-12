# Drum defaults, tape tail handling, and sequencer row tools

## 1. Useful drum sounds out of the box
- When you switch a drum pad to KICK, SNR, HAT or CLAP, it loads a ready-to-use sound:
  - **KICK:** a solid, punchy kick with a short sweep, a clear click and a tight decay.
  - **SNR:** a snappy, tight snare with a short body and crisp noise.
  - **HAT:** a fizzy closed hi-hat that is bright, short and metallic.
  - **CLAP:** a tight clap with 4 bursts and a short room tail.
- Double-tapping any drum knob or drag area resets it to that sound's value, not to 0 or to whatever it was first set to.
- A blank set's drum pads start with these sounds too.
- Existing saved sets and the starting kit sound the same as now. Only switching the drum type or a double-tap reset loads the new values.

## 2. Tape echo tails: what's wrong now and the fix
**Bug:** STOP turns the echo's repeats off, but they only come back when you press PLAY. So when you tap a pad while stopped, it gets a short echo that fades too quickly.

**Better approach (Ableton-style):**
- **STOP once:** the repeats are left alone. The echo is now capped so it always dies away on its own, so the tail rings out naturally and your pad taps afterwards sound the same.
- **STOP twice quickly (or STOP while already stopped):** cuts every echo and reverb tail on all pads within about 30 ms, with no click. The sound comes straight back for the next hit.
- This works for tape delay, reverse delay, spring, reverb and the perform echo, and the cap from Stage 2 stays.

## 3. Sequencer row tools
- **Double-tap a row's name** to clear that row in the current pattern: its notes and its velocity, chance and roll values. A single tap still selects the pad. The modulation lane is kept.
- **LEN lock:** a new LOCK key at the top of the length column. While it's on, changing one row's length changes every row to that length, so going from 16 to 4 steps is one tap. When it's off, each row is set separately as it is now. The lock is saved with the set.

## Checks
- Switch each drum type, listen, then double-tap knobs and check they return to the sound's starting values.
- Tape echo with FDBK at max: STOP, then tap the snare and hear the full echo. Double-STOP and check the tails go silent.
- Double-tap to clear a row, and use LEN lock on 16→4 with the sequencer playing.
- Phone and desktop.

## Technical details
- `voices.ts`: per-kind `DRUM_INIT[kind]`, a full DrumParams patch. The `Drum type` tap applies it. DrumkitPanel's `K()` passes `reset: DRUM_INIT[kind][key]`, and the drag zones do the same.
- `effects.ts`: remove the STOP `hush` ramp. Add `FxNode.flush(at)`, which briefly drops the delay/spring/convolver wet and feedback and restores them after ~60 ms. The convolver is cleared by swapping in its buffer again.
- `useGroovebox.ts`: a second STOP within 400 ms, or STOP while stopped, calls flush on every chain and on the performance echo. Add `clearRow(r)` and `lenLock` state (saved in sets, defaults to off).
- `Groovebox.tsx`: double-tap detection on `gb-row-label`. The LOCK toggle has aria-label "Lock loop lengths" so MIDI learn can find it, and `onLength` fans out to every row while it's on.
