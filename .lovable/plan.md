# Remove the module boxes and finish the remaining redesign

## Goal
Every instrument sits directly next to the others as one continuous hardware surface. Each section gets its own small label instead of a separate box with a title bar. The parts still drawn as web controls get the same pixel look as the converted screens.

## 1. Remove the module boxes
- Remove the outer frame, title bar, corner dots and gaps around each section (pads, slot, master, phrase, perform, tape, fx, midi, visuals, memory, mixer, sequencer).
- Sections sit edge to edge on one grid. A single 1-pixel line between neighbours is the only separation.
- Each section's name (e.g. `SLOT 03 SYN`) moves into its own pixel screen header, or becomes a tiny printed label above the section, like text on a hardware faceplate.
- Layout presets, reordering and full/half width still work.

## 2. Redesign the remaining web-style elements
- **Top bar**: replace the display-theme dropdown and LAYOUT button with a pixel strip (theme key cycles through themes, LAYOUT key).
- **Layout editor**: pixel list with move left/right and width keys instead of web buttons.
- **Pad repeat bar**: REPEAT / HOLD / LATCH / ROLL / rate / REC become one 128x16-style pixel key strip; the rate dropdown is removed.
- **Pads**: flat pixel blocks with a bitmap index and name, an inverted fill while held and a stepped velocity bar. Pads stay touch buttons, so multi-touch and finger velocity still work.
- **Step grid**: remove the length and mod-target dropdowns. Each row gets a pixel label strip: tap to cycle the length, tap to cycle the mod target. Step cells stay square, with pixel roll numbers and value fills.
- **Mixer**: replace the vertical sliders with stepped pixel faders and M/S keys, and move the EQ sliders into a small pixel EQ screen.
- **Footer status line**: bitmap-font status strip.
- **Size fixes**: SeqScreen and MidiScreen stop drawing too large on wide layouts (capped integer scale), and the visualizers use the same pixel grid size as the other screens.

## Unchanged
Sound, sequencing, MIDI learn (all keys keep their labels), saved sets, themes and the order of sections.

## Technical details
- `PatchNode` becomes a bare wrapper (`section` + aria-label, no ports or heading). The label goes in as an optional `data-label` faceplate caption. The `.gb-grid` gap becomes 0, and cells get `outline: 1px solid var(--line)`. The old `.patch-node`/`.node-heading`/`.node-ports` CSS is deleted.
- New pixel components: `TopStrip`, `RepeatScreen`, `RowStrip` (per sequencer row), `MixerScreen` (16 faders + EQ page). All of them use PixelScreen plus aria-labelled Zones, so MIDI learn and double-click reset keep working.
- PixelScreen gets a `maxScale` prop to cap the integer scaling.
- The DOM pads and step cells stay in the DOM so touch latency doesn't change; only their styling changes.
- Leftover web-control CSS rules in index.css get deleted.
