# Fix the note-repeat velocity fader inside the pads

## What is wrong
The repeat still runs and still reads your finger's height. But in the hardware themes, a held pad (and each flash on a repeat hit) paints the whole pad solid white. That white sits on top of the velocity fill, so you can't see the fader and it looks like it can't be adjusted. In the default theme the fill uses the same colour as that white, which hides it completely.

## Changes
1. **While repeat is on, a held pad is no longer painted solid white.** The pad keeps its dark background and the velocity fill is the only thing that lights up.
2. **The velocity fill is a solid bar that rises from the bottom.** It's drawn in the screen colour with a hard top edge, like the fader in Ableton Note. Slide up for louder, down for softer, and the bar follows your finger right away.
3. **Each repeat hit flashes the pad's outline only**, so you can still see the rhythm without covering the fader.
4. **A small readout of the velocity number (for example "VEL 64")** sits in the pad's corner while you play.
5. **The repeat buttons are cleaner:** REPEAT ON/OFF, then MOMENT and LATCH as a two-way choice. ROLL stays as it is. MOMENT or LATCH is only lit while repeat is on, so it's always clear what's active.
6. Each pad remembers its last velocity, so a latched pad keeps the level you set.

With repeat off, pads look and behave exactly as they do now.

## Check
- Test at desktop, tablet and phone sizes: with repeat on, hold a pad and drag up and down. The bar should follow, the number should update, and the repeats should get louder or softer.
- Check that MOMENT stops when you let go and LATCH keeps going until you tap the pad again.
- Check that the colours work in all nine themes.

## Technical details
- `src/index.css`: under `.gb-pads.vel-mode`, override the `.gb-pad.hit` / `.gb-pad:active` full-fill rules (including the `!important` hardware-theme rule) with an outline-only flash. Restyle `.gb-pad-vel` as a solid `hsl(var(--foreground))` bar with `mix-blend-mode: difference` so the pad text stays readable. Add `.gb-pad-velnum`.
- `src/components/Groovebox.tsx` PadGrid: render the velocity number from `--vel`. Set the initial `--vel` from the stored pad velocity so latched pads show their level.
- The audio engine, scheduler, sets and MIDI are not touched.
