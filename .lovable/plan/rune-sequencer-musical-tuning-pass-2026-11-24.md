# Rune sequencer: musical tuning pass

Goal: make placed runes editable, make AMT clearly audible, give Bass and Arp proper registers, and let several Bass/Arp pads take turns for timbral variety. Each phase stops at a checkpoint for your "go", as before. Nothing is deleted; retired parts stay behind flags.

## Phase A: Card interaction (no sound changes)
- Tapping a placed card selects it and opens its inspector. It no longer deletes the card.
- The inspector shows SPD (2 to 1/32), AMT, targets and a DEL button. Delete and Backspace keys also remove the selected card.
- Remove the unlabeled menu button at the end of each lane, then reflow the lane so no gap is left.
- Each card shows a small speed badge (2, 1, 1/2 … 1/32) and its AMT fill, so the timing reads at a glance.
- Dragging a card's edge still resizes it, dragging up or down on its body still sets AMT, and dragging from the dock still places a card.

## Phase B: Role octaves and the OCT knob
- Bass plays in a fixed low register (around C1 to C2). Arp plays in a fixed upper register (around C4 to C5). Rhythm pads keep their own tuning.
- On pitched instruments (SYN, TRN, SMP), the NOTE knob becomes OCT, with a range of −2 to +2 octaves. In the rune sequencer, OCT shifts the register of that pad's role.
- For pads set to Free, and for old sets: the saved note is turned into the nearest OCT value plus a hidden fine offset, so old sets sound the same. The NOTE code stays behind a flag so it can be brought back.
- Drums keep their own tuning controls.

## Phase C: Multi-synth alternation
- When two or more pads share Bass (or Arp), they take turns instead of all playing at once.
- Bass changes pad per phrase (each card or bar), so the low end never doubles.
- Arp changes pad per note group (every 1, 2 or 4 notes, set by the card's AMT or by its own ALT setting), which gives an interlocking texture.
- The order is fixed for each pattern, so a loop repeats the same way every time.

## Phase D: Making AMT clearly audible
Rework AMT on each rune so that 0% and 100% sound clearly different:
- EUCLID: number of hits (density)
- SHIFT: how far the pattern rotates, plus octave jumps
- ANCHOR: how strongly the downbeats are accented compared to the rest
- GIBBS: how fast the rhythm accelerates or ripples
- FIBO: how deep the grouping goes
- PRIME: how many prime-number steps play
- STOCH: probability, plus velocity spread
- NULL: rest length or gate
For Bass and Arp, AMT also changes note length (gate) and velocity range. Each rule gets one test that compares the result at 0% and 100%.

## Technical details
- RuneSequencer.tsx: in `up()`, a tap with no movement sets `sel` instead of calling `remove`. Delete moves to the inspector and the keyboard. The `rune-settings-key` button is removed, along with its grid column in CSS.
- runeCompiler.ts: `rootAt()` gets a role base octave (Bass 24 / Arp 48 semitones above the engine reference) plus the slot's `oct * 12`. Alternation picks a slot index per segment for pads that share a role, and writes rows only for the pad that is playing.
- Slot type: add `oct` (−2..2). In lineup and set hydration, migrate `note` → `oct` plus a fine offset. SlotScreens: swap the NOTE knob for OCT behind `NOTE_RETIRED`. Harmony snapping stays for Free pads.
- Tests in src/test/runes.test.ts: role register ranges, OCT shift, alternation never stacks two Bass pads on one step, old-set pitch kept, and AMT changes the output at 0 vs 1.
- Checks: typecheck, tests, and the browser on desktop and phone (tap selects, DEL deletes, SPD changes on a placed card).

## Not changed
Engines, FX, mixer, PERF, AV, themes, saved-set playback.
