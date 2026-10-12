# Move the PERFORM reset key into the live strip

The one-tap DROP reset currently lives on the HLD page, so mid-performance you must switch pages to reach it. Move it into the live strip — the row of A–D pattern keys that stays visible on every PERFORM page — without disturbing the clean layout.

## Changes

### 1. New DROP key in the pattern row (`src/components/PerformanceRack.tsx`)
- The bank row becomes five keys: `A B C D | DROP`.
- DROP sits at the right end, same height and style as the bank keys, so the row still reads as one neat strip.
- It uses the same raw-touch handling as the other live-strip keys (`data-perfreset`, fires on lift if the finger moved less than 8px), so it stays reliable on iPhone during fast playing.
- On tap it runs the existing one-tap drop: TIME returns to its home, tension, hold mode, offset, loop, DJ filter and echo send all snap back to neutral. Master and mixer settings stay untouched.
- The key flashes briefly when tapped so you get visual feedback even when nothing was active.
- It is aria-labelled ("Reset performance") so MIDI learn can bind it, like every other labelled control.

### 2. Remove the old RST key from the HLD page
- The RST key at the end of the hold-key row goes away; the REV / STUT / STOP hold keys remain.
- The freed slot stays empty (the row simply has three keys), keeping the page tidy.

### 3. Styles (`src/index.css`)
- `.gb-perf-banks` grid changes from 4 to 5 columns; the DROP key gets a slightly narrower share so the four pattern keys keep their size.
- Desktop full-width strip rules updated to match.

## Untouched
- Reset behaviour itself, the SET time-home key, the unmute-all RST key in the mute row, saved sets, MIDI mappings, audio.

## Verification
- Typecheck and build.
- Simulated phone and desktop: DROP is reachable from every PERFORM page, taps register reliably, the bank row stays evenly spaced, and the HLD page has no leftover empty-looking hole.
