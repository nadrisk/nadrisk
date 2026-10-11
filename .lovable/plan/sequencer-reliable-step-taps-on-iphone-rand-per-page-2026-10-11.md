# Sequencer: reliable step taps on iPhone + RAND per page

## What I found
- In your recording, most taps on the grid do nothing. A few land, and some land as a TIE (striped) instead of a hit.
- On a simulated phone in my test browser, every tap writes a hit correctly. So the problem is specific to the iPhone.
- **Likely cause (not confirmed on a real iPhone):** steps only change on a "click". The grid is also allowed to scroll under your finger. On iPhone, if the finger moves even a hair, or the grid is still gliding from a scroll, Safari treats the touch as a scroll and never sends the click. The tap is lost. When two taps on the same step both get through, it goes hit → tie, which explains the striped cells you didn't ask for.

## Changes
1. **Steps react on touch, not on click.** A step toggles the moment your finger lifts, as long as it didn't travel more than a few pixels. So small finger wobble no longer cancels the tap. A real swipe still scrolls the grid and writes nothing.
2. **No double toggles.** One touch can only change a step once.
3. **Pads, the VEL/CHNC/ROLL/MOD dragging and the row buttons are unchanged.**

## RAND on each page
RAND now acts on the page you're looking at, and only that page:
- **NOTE:** writes a new hit pattern, as it does today.
- **VEL:** gives random velocities (about 35–100%) to existing hits. No new steps are added.
- **CHNC:** gives random chance values (about 40–100%) to existing hits, with most staying high.
- **ROLL:** puts random rolls (x2, x3, x4 …) on a few existing hits; the rest stay at x1.
- **MOD:** gives random amounts to existing hits on rows that have a mod target.

It always affects the current bank (A or B).

## Checks
- Typecheck, tests and build.
- Simulated-phone test: taps with a slight finger drift still write a hit, a swipe scrolls without writing, and one tap never becomes a tie.
- Each page's RAND changes only its own values.
- Your iPhone test: tap 20 steps and check each one lands.

## Technical details
- `Groovebox.tsx` StepGrid: in NOTE view (and unlit cells in other views), replace `onClick` with pointerdown (record id, x, y) + pointerup (toggle if moved < 8 px and same id); keep keyboard Enter/Space via onClick guarded by `event.detail === 0`.
- `useGroovebox.ts`: `randomizePattern(view)` branches: note = current behavior; vel/chance/ratchet use `editBank` over cells where pattern === 1; mod uses `editLane` for rows with lane.on. `SeqScreen` passes the current view.
