# Phone-friendly mixer

Goal: on phones the PERF mixer shows both decks side by side, with shared controls above and the crossfader under your thumbs. Nothing scrolls sideways, nothing overlaps, every button is at least ~36px tall.

## Layout on phones (under 640px wide)

```text
+----------------------------------+
| LINKED  ROOM ABCD        LEAVE   |  status row
| MIDI  [LEARN] [MIXTOUR]          |  compact MIDI row
+----------------------------------+
| BPM 124  [-][+]   A|| B||  BLEND |  master bar
+----------------------------------+
| TARGET [A] [BOTH] [B]            |
| [1][2][3][4][5][6][7][8]  1-8/9-16 |  mute/pattern rack, one row
+----------------+-----------------+
| CH1  DECK A    | CH2  DECK B     |
| LOCK           | LOCK            |
| HI  (o) x      | HI  (o) x       |
| MID (o) x      | MID (o) x       |
| LOW (o) x      | LOW (o) x       |
| FILTER (o) R   | FILTER (o) R    |
|   | level |    |   | level |     |
| [>BAR] [STOP]  | [>BAR] [STOP]   |
+----------------+-----------------+
| A ======[ crossfader ]====== B   |  full width
+----------------------------------+
```

## What changes
- Middle column (BPM, meters, pads) moves out from between the decks and becomes the master bar plus pad rack above them, so Deck B no longer drops under Deck A.
- Decks become two equal columns; EQ rows put knob, label and kill button on one line so they don't wrap unevenly.
- Pads become a single row of 8 with the A/BOTH/B and page switch beside them.
- Crossfader sits full width at the bottom, right under the decks.
- Header stays pinned with safe-area spacing for home-screen use.
- Tablets and desktop keep today's three-column layout untouched.

## Checks
- Screenshot at 393px and 360px wide in a three-tab link (mixer + two decks): no sideways scroll, no overlap, both decks visible together.
- Tap tests on the phone layout: mute A affects deck A only, crossfader and faders move, double-tap resets still work, MIDI learn still maps.

## Technical details
- Mostly CSS in `src/index.css`: replace the conflicting `max-width: 520px` rules for `.lk-strips`/`.lk-center` (lines ~1203, 1252, 1308) with one consolidated `@media (max-width: 640px)` block using grid areas (`master`, `pads`, `a`, `b`, `xf`).
- Small markup tweak in `src/components/PerfLink.tsx` only if the center column must be split into master bar and pad rack elements for grid placement; no logic or link-protocol changes.
