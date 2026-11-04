# XY Motion Recorder + LFO — tidy layout plan

## Goal
Record hand-drawn XY moves as a looping, beat-synced motion, and add an LFO that moves the dot by itself with selectable shapes. All on the existing XY screen, with no overlapping elements and clear feedback for every knob and button.

## Screen structure (128x64 pixel screen)
The XY screen gets three header tabs: **XY · REC · LFO**. The pad area stays identical on every tab so the dot never jumps; only the bottom control strip changes.

```text
y0-9    header: XY | REC | LFO tabs  (+ live readout when a knob moves)
y11-44  pad box 124x34, crosshair dots, axis words, dot + trail
y46-63  bottom strip: two rows of 8px keys on a fixed grid
```

Bottom strip grid (same column edges on all tabs, 1px gaps, nothing shares a pixel):

```text
XY tab   row1: X label........ | HOLD | SNAP | SET
         row2: Y label........ | CENTER (61px)
REC tab  row1: ARM | PLAY | CLR | LEN 1/2/4 BAR
         row2: status "REC 12/32" or "PLAY" bar with moving step tick
LFO tab  row1: ON | SHAPE name | SYNC div
         row2: three knobs RATE | DPTH | PHAS (hit-zones under keys)
```

Axis labels (X/Y text) move into the readout on REC/LFO tabs so long names never collide with keys.

## Pad visuals
- Live dot: solid 5x5 box (unchanged).
- Recorded path: dotted line drawn once per loop, with a hollow 3x3 marker at the playback position.
- LFO path: faint preview of the shape (orbit, figure-8, etc.) at current depth, so you see the motion before enabling it.
- While recording: pad border blinks via redraw on step (no animation effects), "REC" flag top-right inside the pad's own corner, clipped to stay within the box.
- SET origin shown as a small cross so you know where CENTER returns.

## Knob / control feedback
- Any knob touch replaces the header title with a width-fitted readout, e.g. `RATE 1/8`, `DPTH 64%`, `PHAS 90°`, `LEN 2 BAR`, `SHP FIG8` — same mechanism the drum headers use, reverting ~1s after release.
- Pressed keys invert (filled) like HOLD/SNAP today; disabled keys show `---`.
- The REC row2 bar shows loop progress so you always know where in the loop you are.

## Behaviour
- **REC**: ARM → recording starts on next step 1 when you touch the pad; captures one point per 1/16 (with interpolation between). Stops at loop length and auto-plays. Touching the pad while playing overrides temporarily, then playback resumes on lift.
- **LFO shapes**: ORBIT, FIG8, SINE-X, SINE-Y, SQUARE, S&H (stepped random). RATE synced (1/16 … 4 bars), DPTH 0–100% around the SET origin, PHAS offset.
- Precedence: hand touch > recording playback > LFO. Recording and LFO can be stacked (LFO adds on top).
- STOP freezes the motion and returns to the SET origin; nothing moves when transport is stopped.
- Saved per pad in sets and patches; old sets load with REC/LFO off. SET (commit) bakes the current position only, never the motion.

## Technical details
- Extend `XY` type in `src/audio/xyMaps.ts` with optional `rec { on, play, len, pts:[x,y][] }` and `lfo { on, shape, rate, depth, phase }`; pure function `xyAt(xy, stepPos)` returns the effective position (unit tested).
- Motion applied at trigger time via existing `applyXY` using `xyAt` with the scheduler's step position, so phrase/sequencer notes use the moving position; held voices get updates via the existing live-update broadcast on a step tick from Tone's clock (no React per-frame state).
- `XyScreen.tsx`: add `pages={["XY","REC","LFO"]}`, a shared layout constant table for the strip columns, and an overlap test that asserts no two hit-zones on any tab intersect and all lie within 128x64.
- Recording writes the point array once on loop end (not per move) to avoid re-render churn.
- Tests: `xyAt` per shape, record quantisation, legacy set hydration, hit-zone non-overlap.

## Not included
- Recording other knobs' movement (only XY).
- Free-running (unsynced) LFO.
