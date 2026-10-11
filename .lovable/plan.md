# Move SET out of the DJ filter grid

The SET key currently sits inside the DJ filter sweep pad on the PERFORM FX page, so a mis-tap near it grabs the DJ filter instead. Move SET to its own row below the grid, outside the sweep zone.

## New FX page layout

```text
y 0-9    header (unchanged)
y 11-34  DJ filter response grid (shrunk from 30px to 24px tall)
y 36-44  SET key row: tension bar on the left, SET key on the right
y 45-64  knob row (unchanged)
```

## Changes (all in `src/components/PerformanceRack.tsx`)

- Shrink the DJ response box from `box(2,11,124,30)` to `box(2,11,124,24)`; recompute the curve constants (top/bot) to fit the shorter box.
- Shrink the DJ sweep Zone from `h=30` to `h=24` so its hit area matches the grid and no longer reaches the SET key.
- Move the SET key and its Tap from `(104,28)` to `(104,36)` — clear of the zone (which ends at y 35) and above the knob zones (which start at y 45).
- Move the tension bar from `(3,38)` to `(3,37)` with width ~98 so it sits beside SET without overlapping it.
- Keep the T readout and the `*` home marker where they are; keep the tap flash and lit-when-home behaviour from the last fix.
- Time-home behaviour, RESET · DROP, MIDI learn and saved sets are untouched.

## Verification

- Typecheck and build.
- Simulated phone: confirm a tap on the SET key never changes the DJ filter, the curve still renders in the shorter grid, and the tension bar and SET key don't overlap.
