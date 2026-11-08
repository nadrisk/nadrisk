# Fix note start / release behaviour

Goal: notes always start, hold and fade the way the knobs say — no stuck tails, sudden cuts, clicks or "confused" releases, especially with long release times and fast retriggers.

## What we know so far
- Every voice has two fade paths: its own envelope (planned ahead when the note starts) and a separate release stage used when a pad is let go, choked or retriggered.
- A release request is ignored if it would end later than the tail already planned ("only ever shortens"). That's on purpose, but it's the most likely place where long releases seem to get confused.
- The filter envelope is planned ahead too, and it doesn't follow an early release, so the tone can keep sweeping while the note fades.
- The exact cause of what you're hearing isn't confirmed yet. Step 1 pins it down before anything changes.

## Steps
1. **Reproduce first.** Build offline test renders for these cases: a held pad released early, a fast retrigger during a long release, a tap shorter than the attack, a sequencer step whose release crosses the next hit, and hitting the 6-voice limit. For each one, measure clicks, jumps and leftover sound. Keep only the cases that actually fail.
2. **One release path per voice.** Releasing, retriggering and choking all go through the same fade, which always starts from the voice's current level and never jumps to silence or to full volume. If a release gets ignored, the planned tail must already be shorter.
3. **Filter follows the release.** When a note is released early, the filter envelope moves into its release stage at the same moment as the volume.
4. **Click-free retrigger and voice limit.** When a pad goes over its voice limit, the oldest or quietest voice fades out over about 5 ms instead of being cut. Retriggering a mono pad (BAS, REESE, sampler slices) fades the previous note the same way.
5. **Mono note priority (BAS / REESE).** Holding several keys keeps a note stack: the newest note plays (last-note priority) and lifting it glides back to a note still held. Legato skips the envelope restart only when the pad's glide is on.
6. Apply the same fixes to drum, synth, sampler and siren/laser voices. ACID keeps its own envelope engine and is only checked against the step 1 cases.

## Not changing
- Sound presets, saved sets and knob ranges. Old sets sound the same apart from losing the clicks.
- Poly SYN chords. They keep today's allocation and only get the click-free steal from step 4.

## Technical details
- `src/audio/voices.ts`: `finish()`, the sampler and siren voice `release` and `stop` functions, `fadeOut()`, and `filterEnvAdsr()`. The filter param is stored on the voice so `release()` can cancel-and-hold it, then aim it at base cutoff over r.
- `stop()` keeps using `amp.gain.cancelScheduledValues`. Check whether Safari reads stale values there, and if so move it onto the `__rg` stage (that stage already exists for this reason).
- The pad voice cap in the engine or hook replaces its hard stop with a 5 ms fade on the stage.
- Tests go in a new `src/audio/envelope.test.ts`, rendering through OfflineAudioContext or a pure gain-curve model, one test per case from step 1.
- Update the voice release rule in AGENTS.md.
