# Rebuild the groovebox as a fixed rack with two workspaces

## Layout

- Keep the 4×4 pad rack permanently visible at the top, including repeat and recording controls.
- Replace the long vertical list of modules with two hardware workspaces directly below the rack:
  - **Instrument workspace:** always shows the currently selected pad/slot, its instrument selector, slot controls, instrument pages, chord controls, and sample library where relevant.
  - **Utility workspace:** one switchable panel for **FX, phrase, sequencer, mixer, master, performance, tape, visuals, memory, and MIDI**.
- On wide screens the two workspaces sit side by side. On phones they stack, but only these two panels remain, eliminating the long module-by-module scroll.
- Add compact pixel tabs/previous-next keys for changing the utility page. Retain the selected utility page and display theme on the device.
- Remove the old section-order and width editor because the new fixed hardware hierarchy replaces movable module boxes.

## Density and pixel-screen corrections

- Give each workspace a stable width and enough vertical room for its 128×64 display to scale by a whole number without clipping.
- Audit every pixel panel against the 128×64 drawing boundary and keep labels, knobs, graphs, and hit zones inside it.
- Fix the additive synth specifically by giving the 16 partial bars a dedicated bounded graph area, reducing their width/spacing, and separating them from the header, readout, and knob row.
- Reduce oversized controls and wasted framing rather than shrinking the bitmap type to illegibility.

## Mixer redesign

- Replace the current scrolling 16-strip web mixer with a pixel-hardware mixer shown inside the utility workspace.
- Show **8 channels per page**, with A/B page keys for channels 1–8 and 9–16.
- Draw compact stepped faders, level values, channel labels, mute/solo state, selected-channel marker, and a simple meter for each strip.
- Keep channel EQ for the selected slot in the instrument/insert workflow; do not place it beneath the mixer.
- Preserve volume, mute, solo, clear-solo, slot selection, MIDI labels, and all current mixer behavior.

## Sequencer redesign

- Replace the oversized scrolling rows with a compact pixel-hardware sequence workspace.
- Keep the 16-step grid and expose track paging so steps remain readable rather than compressing all 16 tracks into one cramped frame.
- Preserve A/B banks, queued-bank state, note/mod/velocity/chance/roll views, per-track length, modulation target, loop window, offset, ties, rolls, current-step playhead, selection, recording, randomize, copy, clear, and reset.
- Use the same square 1-bit interaction language as the instrument screens, with touch-safe DOM hit areas over the visual grid so multi-touch, MIDI learn, and drag editing continue to work.

## Technical scope

- Refactor `Groovebox.tsx` from the keyed multi-section layout into the fixed rack + instrument workspace + utility workspace structure.
- Add focused workspace navigation and dedicated pixel mixer/sequencer presentation components; reuse the existing instrument, FX, master, performance, tape, memory, MIDI, and visualizer logic rather than duplicating it.
- Update the workspace CSS to remove obsolete custom-layout rules and provide stable two-column/stacked dimensions.
- Adjust `CyberspacePanel.tsx` and any other overflowing screen drawings or zones found during the boundary audit.
- Leave `useGroovebox`, audio processing, sequencing timing, saved-set data, MIDI mappings, and recorder/export behavior unchanged.

## Verification

- Check every instrument page for clipping, especially additive synthesis.
- Exercise utility-page switching and confirm control values persist while changing pages.
- Test mixer pages and core sequence editing in note, modulation, velocity, chance, and roll views.
- Verify desktop and the current phone-sized viewport with screenshots, no overlaps, no unintended long module scroll, and no browser/build errors.
