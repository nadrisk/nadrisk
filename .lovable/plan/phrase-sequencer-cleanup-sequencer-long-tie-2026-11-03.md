# Phrase sequencer cleanup + sequencer long-tie

## What changes for you

1. **Double-click to tie long notes (step grid)**
   - Put a note at the start and one at the end, then double-click the end note. Every step from the nearest earlier note up to that note becomes one long held note. Any notes in between are joined into it.
   - The normal single tap still works. A tap now waits a moment to make sure it isn't a double-click, so the first tap never wipes the end note.
   - Double-clicking a note with no earlier note in the row does nothing. Double-clicking inside a note that's already tied keeps it as is.
2. **OCT is back on PATT.** Moves phrases up or down across octaves 0–6, so they no longer get stuck at OCT6.
3. **Phrases follow the global KEY and SCL** shown above the drum grid. The separate ROOT and SCL knobs inside the phrase are removed.
4. **SPRD changes the pattern you're playing right now.** It widens or narrows the notes live, and you can see the step bars stretch or squeeze. Turning it back restores the original pattern.
5. **The VEL dial shows normal 1–127 values.**
6. **Every phrase dial shows what it does.** Touching or turning a dial shows its name and value in the screen header on RUN, PATT, TRNC and EUCL.
7. **TRNC loses the extra GEN button.** It gets a single ON/OFF toggle like EUCL. Turning its knobs already regenerates the phrase.

PATT page layout: `OCT · SPRD · STPS · DIR`.

## Technical details
- Grid tie: add a pure helper `tieSpan(row, endIdx)` that finds the nearest earlier hit, sets that start to a hit, sets the steps after it through endIdx to tie (2), and keeps per-step vel/chance at the start. The grid cell's tap handler delays single-tap toggles by about 250 ms. A second tap within that time cancels the toggle and runs tieSpan. It uses the same touch-on-lift path so iOS taps still work, and the edit can be undone.
- Phrase: drop the root/scale fields from the editor. The phrase engine reads Harmony (src/audio/harmony.ts) for key and scale. Old saved sets ignore their stored root/scale values.
- SPRD is applied without changing the stored pattern: played degree = round(deg × spread factor). The same function feeds both playback and the screen bars.
- VEL readout: `Math.round(v*126)+1`.
- PhrasePanel turns on `compactReadout` and reports labelled values for every knob.
- Tests: tieSpan (fills gaps, joins notes in between, no earlier note = nothing happens), SPRD scaling restores the pattern at 50%, OCT range.
