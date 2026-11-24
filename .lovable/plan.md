# Rune Sequencer — agreed build plan

This plan is the contract. Each phase ends with a checkpoint: you try it, and the next phase starts only after you say go. Nothing outside a phase's list gets changed, and any deviation is raised with you before building, not after.

## What we agreed (locked)
- Runes become the primary way to sequence. The existing step engine (steps, ties, velocity, chance, rolls, MOD lanes, banks A–D) stays underneath; runes write into it.
- Three lanes: DRUMS, BASS/ARP, MOD.
- Any rune can go on any lane; the lane decides which rule (equation) the rune applies.
- Bass always plays progression roots, shaped by gaps, rhythmic gating and +1 octave jumps. No sub drops.
- Arp runs over the chords; when an arp passage plays, bass gets out of the way.
- MOD lane changes the notes above (ratchets, rolls, octave pops, gate length, reverse) and sound/FX settings (cutoff, time, effects).
- Hard cap: 3 modulation targets at once. Each rune has its own FX depth; some runes cannot touch FX.
- KEY, SCL and PROG move from above the pads into the sequencer header, next to BARS and banks A–D.
- Each of the 16 pads gets a role you set: Rhythm, Bass, Arp, or Free. Any instrument can take any role.

## Phase 1 — Rune engine (no visible change)
- Rune definitions: 8 runes, each with LEN, AMT, SPD and a rule per lane.
- Progressions and bass/arp note logic, quantized to KEY/SCL.
- Compiler that turns the three lanes into the existing pattern data for the current bank.
- Tests for: each rune per lane, bass root lock + octave jump, arp silencing bass, 3-target cap, runes blocked from FX.
- Checkpoint: tests shown passing. App looks and sounds the same.

## Phase 2 — Pad roles
- R / B / A / — badge on each pad, saved with sets; older sets load with every pad Free.
- Checkpoint: you assign roles; nothing else changes.

## Phase 3 — Rune sequencer screen
- New sequencer view: header (KEY, SCL, PROG, BARS, A–D), three lanes, rune dock, tap-to-place, tap a card to edit LEN/AMT/SPD.
- KEY/SCL removed from the top bar and shown only in this header.
- The old step grid stays reachable as a GRID view for inspecting what the runes wrote, until you decide otherwise.
- Phone layout stacks lanes; 1-bit look, square corners, no animation.
- Checkpoint: you play with it in the browser.

## Phase 4 — Retirements (only after you confirm Phase 3)
Each item needs your yes before removal; code is disengaged, not deleted, matching how we handled BAS/SMP/PAD:
- Monke
- Per-pad chord editor
- VEL / CHN / ROL / CND / NDG sub-pages of the grid
- GRID view itself (optional)

## Out of scope
Sound engines, FX, mixer, PERF, AV and themes are not touched.

## Technical details
- New: src/audio/runes.ts, src/audio/runeHarmony.ts (builds on src/audio/harmony.ts), src/audio/runeCompiler.ts (pure), src/components/RuneSequencer.tsx, tests in src/test.
- Rune layout stored per slot set per bank; compile is deterministic and runs on edit, not per audio tick, so the scheduler is unchanged.
- Harmony header move edits the gb-top-harmony segment in Groovebox.tsx.
- Monke (useMonke.ts, MonkeVisitor.tsx, src/audio/monke.ts) and ArpEditor.tsx are disengaged via flags in Phase 4 only.
- A rule per decision is added to AGENTS.md; roadmap.md tracks phase status.
