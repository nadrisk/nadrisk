# One connected instrument, built around the main screen

Undo the two-column grid of separate windows. The instrument screen becomes the centerpiece, and the other screens attach to it like parts of one device, with shared edges and no gaps or separate frames.

## Layout

```text
+---------------------------------------------+
| SLOT strip: name | engine keys | MUTE CHK   |  <- thin bar, joined to the screen below
+---------------------------------------------+
|                                             |
|        MAIN INSTRUMENT SCREEN (large)       |  <- full width, largest scale
|                                             |
+----------------------+----------------------+
| EQ (insert)          | CHORD / LIBRARY      |  <- compact strip, joined underneath
+----------------------+----------------------+
| UTILITY SELECTOR  FX PHR SEQ MIX MST ...    |
+---------------------------------------------+
| utility screen, flush to the selector       |
+---------------------------------------------+
```

- The instrument screen fills the full width and gets the biggest whole-number scale, so it is the focus.
- The SLOT screen turns into a slim top strip on the same panel (name, engine, mute, choke, vol/pan), not a separate box.
- EQ, chord and sample library sit as a short strip right under the instrument, touching it, with one shared 1-pixel line between parts instead of separate windows.
- The utility selector and its screen attach directly below, same width, so the whole instrument reads as one device.
- On phones it is the same order, one column.

## Technical details
- `SlotEditor.tsx`: drop the two `gb-ed-col` columns; order is SlotScreen (strip), engine panel, then a bottom row with ChannelEq + Chord/Library.
- `SlotScreens.tsx`: give SlotScreen a short strip variant (128×20-style canvas) for the top bar.
- `index.css`: remove the 2-column grid and gaps on `.gb-editor-body`; zero gaps/borders between screens, single shared divider lines; join the instrument and utility workspaces vertically with no gap.
- No audio, sequencing, MIDI, sets or recorder changes. Check at desktop and phone widths with screenshots.
