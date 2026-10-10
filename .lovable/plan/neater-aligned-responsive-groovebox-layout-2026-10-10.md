# Neater, aligned, responsive groovebox layout

Fix the visual issues from the latest screenshots: uneven widths, cluttered top-to-bottom stacking, overlapping additive-synth elements, oversized knobs, the paged sequencer, and the lofi visualizers. Audio engine, sequencing, MIDI, sets and recorder stay untouched.

## 1. Alignment and grid layout
- Make the slot/instrument workspace exactly the same width as the pad rack above it — no black gap on the right. Pixel screens keep their integer scaling, but the chassis around them stretches to fill, so edges line up.
- Re-arrange the workspace contents into a tidy grid (screens side by side where they fit) instead of one long top-to-bottom stack, reducing the cluttered feel.

## 2. Smaller, cleaner screen elements
- Shrink knobs and controls inside the 128×64 screens so labels and graphs have breathing room.
- Fix the additive synth: partial bars stay inside their bounded graph box, no bleeding into the knob row or header; knobs sized down to match the other instruments.

## 3. Sequencer: full grid back, compact menu
- Remove the 4-tracks-per-page paging — show the full step grid again like before.
- Shrink the sequencer control/menu area so the grid dominates; controls become a compact strip of pixel keys.

## 4. Visualizers back to high quality
- Oscilloscope, spectrum and master waveform render at native device resolution again (no coarse 1/3 pixel grid) — smooth, crisp lines.
- Fix the unclear button in the visualizer rack's upper-right corner: give it a clear pixel label/icon so its function is readable.

## Technical details
- Changes live in `Groovebox.tsx` (layout, sequencer paging removal), `index.css` (grid widths, alignment, control sizing), `pixelScreens.tsx` / instrument panels (knob sizes, additive bounds), and `VisualizerRack.tsx` / `Waveform.tsx` (restore devicePixelRatio rendering).
- Mixer keeps its 8-channel pages (already approved); only the sequencer loses paging.
- No changes to `src/audio`, `useGroovebox`, saved sets, MIDI mappings or recorder.

## Check before done
- Typecheck passes; browser check at desktop and phone widths: rack and slot edges aligned, additive screen clean, full sequencer grid visible and editable, visualizers smooth, no page errors.
