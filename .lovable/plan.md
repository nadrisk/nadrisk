# Fix: SPEC GATE stops working after it is lowered

## What the recording shows
GATE works the first time (screen shows the real kept/removed bins). After lowering it and moving other knobs, the gate and its screen go back to plain bars, even at GATE 100, and stay that way.

## Likely causes (to confirm first)
1. **Notes that start at GATE 0 never get a gate.** A note started with GATE at 0 has no gate attached, so raising GATE again while it plays does nothing, and the screen gets no data.
2. **The gate supply runs out.** There are 12 gates to share. Each note reserves one until its *planned* end, not when it actually stops. Held notes, re-triggers and early releases keep their gates reserved, so after a few notes none are free and every new note plays ungated.

## Step 1 — reproduce
In the browser, hold a SPEC note and sweep GATE 100 → 0 → 100, then retrigger notes repeatedly. Log how many gates are in use and whether each note got one. Report which cause is confirmed.

## Step 2 — fix
- Every SPEC note gets a gate from the start, even at GATE 0, where it passes sound through untouched. GATE can then be lowered and raised freely while notes play.
- A gate is handed back the moment its note actually ends (cut, released early or finished), not at the planned end.
- If the gates really are all in use, the oldest one is taken over instead of a note playing silently ungated.
- The screen shows the real bins whenever a gate is active at GATE above 0, and plain bars only at GATE 0.

## Step 3 — check
- Test: hold, sweep 100 → 0 → 100; the gate still removes weak partials after the sweep.
- Test: 40 retriggered notes, and every note still gets a gate.
- Browser repeat of your recording's steps, with the screen checked.

## Technical details
- `src/audio/spectral.ts`: always `takeGate` (worklet bypasses below 0.001); release the pool entry via `finish`'s onClean and on `stop`/`release` (set `busy = 0` / new end); steal the least-recently-taken entry when all 12 are busy; disconnect the entry's input on reuse.
- `src/components/CyberspacePanel.tsx`: the live mask condition is unchanged except that it now relies on gates always being present.
- Extend `src/audio/specSynth.test.ts` with pool tests; update the SPEC GATE rule in `src/audio/AGENTS.md`.
