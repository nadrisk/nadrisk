# Fix the TENS knob display and check its sound

## What's wrong
- **The line:** the TENS bar under the DJ filter box stops at about three quarters of the screen at 100%. It is drawn with a fixed length of 98 pixels, but the box above it is 122 pixels wide.
- **The sound:** the tension effect itself (rising filter, washy delay, noise, panning) hasn't changed recently. What did change is the new peak guard added after the master limiter. Tension's wash and feedback push the level up, so the guard now clamps those peaks harder than before. That is the likely reason it sounds different, but it's not confirmed yet.

## Changes
1. Make the TENS bar fill the full width of the box: 0% is empty, 100% reaches the right edge.
2. Test the sound: render tension at 0 / 50 / 100% with and without the peak guard, and measure how much the guard pulls the level down.
   - If the guard is what squashes the sound, ease the tension wash/feedback level back into the limiter's range (the output already dips slightly as tension rises; deepen that a little) so the guard rarely engages. The sweep keeps its usual character and the master stays protected.
   - If the guard isn't the cause, report what the test found before changing any sound.
3. Add a small test: at full tension the bar spans the whole box.

## Technical details
- `src/components/PerformanceRack.tsx`: `p.rect(3, 37, Math.round(v.tension * 122), 2)`.
- `src/audio/performance.ts`: possibly scale `output.gain` / `wash.gain` with tension so its peaks stay under the ceiling. Peak guard order stays as it is (AGENTS rule).
