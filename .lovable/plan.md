# PAD: streamlined 3-page JV-1080 layout

## What changes
PAD goes from 5 pages (PRST, MCRO, NOTE, CHRD, ENV) to 3:

- **PRST (play page)** — JV-1080 style 2-line LCD:
  - Top line: `PR-A:011 (BELL)` bank, number, category
  - Middle: large patch name flanked by `[<]` DEC and `[>]` INC tap buttons (wrap 12 -> 1)
  - Bottom: tone boxes `TONE [#][#][ ][ ]` showing how many layers the preset uses
  - Knobs: VAL (preset 1-12), NOTE (key-snapped root), OCT (-3..+3), CHRD (OFF or chord type)
- **TONE** — BRT, MOTN, SPCE, AGE with a full-height wave visual (SP12 tag lights only here when AGE > 0)
- **ENV** — ATK, REL, INV, C-OCT with a full-size envelope curve

Header bar, category tags and layer line appear only on PRST; TONE and ENV use the whole screen.

Loading a preset (DEC/INC/VAL) works like today: renames the pad and sets its reverb. Patterns, chokes and saved sets are untouched; old sets load the same.

## Technical details
- Only `src/components/PadPanel.tsx` changes: PAGES -> ["PRST","TONE","ENV"], remap knobs, redraw PRST body, Tap hit-zones for DEC/INC, remove the 12-cell grid.
- CHRD knob: index 0 = off, 1..n = existing chord types (writes same chord settings as the chord screen).
- Quick test: DEC/INC wrap index math.
- Check in preview at phone width (393px) that buttons and text don't overlap.
