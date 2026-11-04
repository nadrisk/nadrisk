# PRC-aware rhythm generators + even instrument loudness

## 1. Rhythm generators that know the PRC sounds
Today every break style gives all percussion pads one shared lane, so several PRC pads fire on the same steps.

- Each PRC model gets its own lane per style (AMEN, 2STP, DNB, BOOM, 4/4, IDM):
  - CLIK: sparse off-grid ticks, occasional ratchets (2–3x).
  - PING: melodic answers in gaps between kick/snare.
  - METL: accents on off-beats, longer spacing.
  - SHRD: short bursts/fills near bar ends.
- Two PRC pads of the same model get rotated variants so they talk to each other instead of doubling.
- Ghost hits on PRC lanes use lower velocity and 70–90% step chance so patterns breathe.
- RANDOM tab and the sequencer RAND key use the same PRC-aware logic: denser syncopation and ratchets for PRC rows, still respecting ·/X/S row states and undo.

## 2. Even loudness across instruments
- Measure each engine (DRM, PRC, SYN at 1 and 8 voices, BAS 808/ACID/REESE, SMP) at default velocity and 75% level.
- Apply a fixed per-engine output trim so all land in the same peak/loudness window (target roughly -4 to -2.5 dBFS), mainly lifting SYN.
- SYN voice count compensation so 1 voice and 8 voices feel equally loud.
- Sound character is unchanged; only output level. Saved sets keep their channel levels.

## 3. HACK stays silent when nothing plays
Right now HACK can make clicks and thumps from silence, replay bits of old hits, and keep its pattern running after STOP.
- When the pad is silent, HACK outputs true silence (no clicks or ghost stutters).
- SKIP never replays an old, finished hit once the sound has died away.
- On STOP or pause, the HACK pattern halts, any stutter is cut and its memory cleared; pressing STOP twice cuts HACK too, like the other effects.
- The sound while playing stays exactly the same.

## Technical details
- HACK silence: input envelope follower in `hackWorklet.ts` (fast attack, short hold); below ~-80 dBFS SKIP is disabled and output is gated to 0, so bit-flipping silence (code 2048) can't produce output. Pattern clock reads a transport running flag sent over the port from Tone transport start/stop/pause listeners in `effects.ts`; stop flushes the stutter buffer. Add `hack` to the double-stop FX flush list in `useGroovebox.ts`. Tests in `hack.test.ts`: silent input gives exactly zero output with SHRT/SKIP up, and no stutter output after input stops.
- `src/audio/patternGen.ts`: detect PRC model from slot (engine `idm` + model), add per-model lane tables and ratchet/chance output; extend `patternGen.test.ts` (distinct lanes per model, no identical PRC rows, ratchets only on PRC/hat).
- `src/hooks/useGroovebox.ts` `randomizePattern`: route PRC rows through the new generator.
- Loudness: add a per-engine trim constant table in `src/audio` applied at each voice output (voices.ts / idm.ts / clean.ts / reese.ts / acid.ts); offline render test asserting each engine's peak at defaults sits within the target window.
- Update `src/audio/AGENTS.md` with the trim rule.
