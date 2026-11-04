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

## Technical details
- `src/audio/patternGen.ts`: detect PRC model from slot (engine `idm` + model), add per-model lane tables and ratchet/chance output; extend `patternGen.test.ts` (distinct lanes per model, no identical PRC rows, ratchets only on PRC/hat).
- `src/hooks/useGroovebox.ts` `randomizePattern`: route PRC rows through the new generator.
- Loudness: add a per-engine trim constant table in `src/audio` applied at each voice output (voices.ts / idm.ts / clean.ts / reese.ts / acid.ts); offline render test asserting each engine's peak at defaults sits within the target window.
- Update `src/audio/AGENTS.md` with the trim rule.
