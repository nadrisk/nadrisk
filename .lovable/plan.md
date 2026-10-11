# Desktop horizontal hardware rack

## Goal
Rebuild the large-screen arrangement as a tidy left-to-right hardware rack, while leaving the phone layout and all groovebox behavior unchanged.

## Layout
```text
DESKTOP RACK — horizontal scroll only when needed

┌──────────────┬──────────────────┬────────┬─────────────────────────────┐
│ DRUM RACK    │ SLOT / INSTRUMENT│ SELECT │ ACTIVE UTILITY              │
│ repeat keys  │ stacked screens  │ FX     │ FX / PHRASE / MASTER / etc. │
│ 16 pads      │ + insert         │ PHRASE │                             │
│              │                  │ SEQ    │                             │
│              │                  │ MIX... │                             │
└──────────────┴──────────────────┴────────┴─────────────────────────────┘
```

- Use one level desktop rail with aligned top and bottom edges instead of the current pads-above-workspaces stack.
- Keep the drum rack first, the selected slot editor second, then a narrow vertical utility selector, then the active utility panel.
- Give the rack a controlled hardware height and stable column widths so panels do not stretch into oversized windows.
- Let the rack scroll horizontally inside the groovebox when the available screen is narrower than the complete rack; keep the page itself stable.
- Keep the heading and status footer outside the rail so transport, theme, About, and status remain easy to reach.

## Wide utility views
- **Sequencer:** expand the active utility area across a wide horizontal bay so all 16 steps have room and rows remain easy to scan.
- **Mixer:** show all 16 channels in one full-width desktop bank; retain the existing 8-channel paging on smaller screens.
- Other utility pages use a consistent bay width and align to the same rack height without enlarging their 128×64 displays.

## Responsive behavior
- Apply the horizontal rack at desktop width only.
- Preserve the current stacked phone layout and touch sizing.
- Keep the existing tablet behavior unless the viewport has enough width for the desktop rail.
- Preserve crisp whole-number pixel scaling and all five display themes.

## Scope and safety
- Change presentation and section placement only; do not alter audio, sequencing, pad handling, saved sets, MIDI mapping, or control behavior.
- Keep every existing control and label available.
- Record the new desktop rack structure in the project architecture notes.

## Verification
- Check the complete rack at 1440×900 and 1920×1080 for aligned edges, no clipped controls, smooth horizontal scrolling, and correctly expanded mixer/sequencer views.
- Check 740×724 and 390×844 to confirm the existing stacked touch layout remains intact.
- Exercise pad selection, utility switching, sequencer editing, mixer controls, DISP, and About after the rearrangement.
- Confirm the preview builds without errors.
