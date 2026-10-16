# Sequencer: expand to 32 steps with one button

## What you get
- A **x2** key in the sequencer's top row. Tap it and the pattern grows to 32 steps; it then reads **x1** (it names the length you'd switch to). Tap that to go back to 16.
- Growing keeps your first 16 steps and copies them into steps 17–32, so the groove carries on unchanged until you edit it. Shrinking back keeps the extra steps hidden, not deleted, so going to 32 again brings them back.
- The grid still shows 16 columns so it stays tidy on a phone. A **1-16 / 17-32** half key switches which half you see and edit. While playing, the view follows the playhead unless you've picked a half yourself (tap the key again to follow).
- A small two-cell marker in the top row shows which half is playing.
- Each row's length goes up to 32 in 32 mode, so odd lengths and polyrhythms still work.
- Velocity, chance, rolls and the three MOD lanes all cover all 32 steps. CLEAR and RAND work on the whole pattern, following the existing page rules.
- Each of the four pattern banks (A–D) has its own 16/32 setting, saved with sets. Older sets load as 16 steps.
- Recording (pads, MIDI step recording) and loop/offset tricks in the performance strip work over all 32 steps.

## Technical details
- `STEPS` becomes the maximum (32); the 32-wide arrays (pattern, vel, chance, ratchet, mods values) are always allocated. `Bank.steps` is 16 or 32 (default 16), and `fixBank` pads older 16-wide arrays to 32 by copying.
- The scheduler wraps on the bank's `steps`, `stepAt()` takes the row length capped at `steps`, the recorder and grid playhead share it, and loop crops stay within `steps`.
- The x2 toggle copies 0–15 into 16–31 only the first time the bank grows (a `grown` flag), and sets the row lengths that equalled 16 to 32 (and back).
- StepGrid gets a `page` offset (0/16) and renders columns `page..page+15`; the follow/manual page state is UI-only. The header gets the x2 and half keys in the existing header cells, so row widths don't change.
- Verify at 393px and on desktop: toggling, paging, playback across the 16→17 step, saving and loading a set. Tests for padding and the copy-on-grow; update AGENTS.md and roadmap.md.
