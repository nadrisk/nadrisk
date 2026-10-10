# Restore and reorganize the poly panel

## Goal
Bring back the useful fader-based poly layout while keeping every existing poly sound control, eliminating overlap, and making each visual control unambiguous.

## Current findings
- The poly sound engine still has all six voice/filter parameters: **SUB, PLS, DET, CHR, CUT, and RES**, plus its amplitude envelope.
- The current **VOX** page removed the four faders and instead shows four knobs.
- The square-stack graphic currently reacts to **detune, chorus, pulse, and sub**, which makes its meaning unclear.
- **CUT/RES** remain available on the separate **FLT** page; the envelope remains on **ENV**. No poly audio parameter needs to be removed or recreated.

## Changes
1. **Restore matching faders on VOX**
   - Bring back four compact vertical faders for **SUB, PLS, DET, and CHR**.
   - Keep the four bottom knobs in the same left-to-right order: **SUB, PLS, DET, CHR**.
   - Each fader and its matching knob will control the same parameter, so there are no unrelated controls.

2. **Make the square-stack a detune-only visual**
   - Reserve a clean area on the left for the three-square voice icon.
   - Only **DET** changes the square spacing/retraction.
   - **SUB, PLS, and CHR** affect only their faders/readouts and sound, not the icon.

3. **Keep the remaining poly options neatly separated**
   - Retain the **FLT** page with **CUT** and **RES**, its centered filter response, and matching controls.
   - Retain the **ENV** page with the draggable ADSR graph and matching **ATK/DEC/SUS/REL** knobs.
   - Keep chord, strum, and arpeggio controls in the existing chord section; do not change their behavior.

4. **Remove unnecessary wording and prevent overlap**
   - Remove the long `SUB/PULSE DETUNE/CHORUS` explanatory line.
   - Use only short hardware labels beside the relevant controls.
   - Fit the icon, faders, labels, and knob row into distinct fixed pixel regions with no shared hit areas.

## Technical scope
- Update only the poly panel presentation and its existing control mappings in `EnsemblePanel.tsx`.
- Reuse the current pixel-screen `Zone`, knob row, filter curve, and draggable envelope controls.
- Do not change the poly audio engine, parameter ranges, saved-set format, MIDI behavior, effects, sequencer, or other instruments.

## Verification
- Confirm all four VOX faders and matching knobs adjust the same values.
- Confirm only DET moves the square-stack graphic.
- Confirm CUT/RES and the filter graph still work on FLT.
- Confirm the ADSR graph and knobs still work on ENV.
- Check the poly screen at desktop, tablet, and phone widths for overlap and touch-target alignment.
- Confirm typecheck, tests, preview build, and browser console remain clean.
