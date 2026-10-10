# Poly layout, draggable envelopes, and additive drawing

## Goal
Make the synth editors faster and clearer without changing their sound engines, saved values, MIDI behavior, themes, or the 128×64 pixel-hardware style.

## What the current code confirms
- The poly `VOX` screen draws its three-square icon beside four vertical faders, then places four bottom knobs underneath. The duplicated CHR/DET controls and their overlapping hit areas make this page crowded.
- SUB and PLS already control real poly voice parameters, but only through the on-screen faders. CUT and RES are real filter controls, while CHR and DET currently appear both as faders and knobs.
- Synth, poly, and drum envelopes share the same drawn ADSR graph and bottom knob model. The sampler has an equivalent separate ADSR screen. None of those envelope nodes are directly draggable yet.
- Additive synthesis already uses sixteen stored partial levels for either oscillator, but each bar currently behaves as an isolated vertical control rather than one continuous drawing surface.

## Changes

### 1. Rebalance the poly VOX page
- Remove CUT and RES from the poly `VOX` page; give the poly filter its own compact `FLT` page with its responsive filter curve, CUT, RES, and matching direct curve interaction.
- Reframe the shared synth/poly filter graph so its neutral response line sits around the vertical center, leaving dedicated headroom above it. Resonance peaks will then remain fully visible instead of flattening against the top edge, while cutoff still travels across the full frequency width.
- Keep `VOX` focused on the oscillator stack: four evenly spaced bottom knobs for SUB, PLS, CHR, and DET.
- Remove the duplicate vertical faders. Expand and reposition the square-stack visual into the freed area so it cannot overlap controls.
- Make the visual react distinctly to the four voice controls: sub layer, pulse layer, chorus spread, and detune separation, while retaining the current detune response.

### 2. Directly draggable ADSR graphs everywhere
- Add a shared interactive envelope overlay to the existing pixel graph.
- Let users drag the visible ADSR handles in the familiar DAW style:
  - attack handle: horizontal attack time
  - decay/sustain handle: horizontal decay and vertical sustain
  - release handle: horizontal release time
- Apply this same behavior to synth, poly, drum, and sampler ENV pages.
- Keep the four bottom ATK/DEC/SUS/REL knobs as precise alternatives, including keyboard, MIDI-learn, reset, and readout behavior.
- Give each handle an adequate invisible touch target while keeping the visible 1-bit nodes small and crisp.

### 3. Draw additive partial shapes
- Replace the sixteen separate partial hit areas with one bounded draw surface over the existing sixteen bars.
- On press and drag, map horizontal position to harmonic 1–16 and vertical position to level 0–100%; interpolate crossed bars so fast strokes create continuous shapes without gaps.
- Keep the same sixteen partial values and existing additive audio path, so sets and sound behavior remain compatible.
- Preserve keyboard/MIDI access to individual harmonics through labelled invisible controls; drawing is an additional faster gesture, not a replacement for accessible adjustment.

## Technical scope
- Update `EnsemblePanel.tsx` for the new VOX/FLT split and non-overlapping poly visualization.
- Extend the shared pixel controls in `PixelScreen.tsx` and `pixelScreens.tsx` with reusable ADSR and multi-bar drawing interactions, plus the centered filter-curve geometry.
- Adopt the shared envelope interaction in `CyberspacePanel.tsx`, `DrumkitPanel.tsx`, `EnsemblePanel.tsx`, and `WispdiskPanel.tsx`.
- Add additive drawing in `CyberspacePanel.tsx`; leave `voices.ts`, transport, effects, sequencing, sets, recording, and master processing unchanged.

## Verification
- Check every poly page at tablet and phone widths for icon/control overlap and readable labels.
- Sweep cutoff and resonance on the synth and poly filter pages; confirm the cutoff marker tracks correctly and the entire resonance peak stays inside the graph at maximum resonance.
- Drag each ADSR handle on synth, poly, drum, and sampler screens; confirm the graph, bottom knobs, readout, saved state, and audible envelope stay synchronized.
- Draw slow and fast additive curves across both oscillator pages; confirm all crossed harmonics update and saved sets recall the shape.
- Confirm touch scrolling is not intercepted outside active graphs, themes still redraw all screens, MIDI-labelled controls remain discoverable, and no runtime or console errors appear.
