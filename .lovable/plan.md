# Poly: reproduce the missing and weak chord hits, then fix them

## What the recording shows
- I watched your recording and measured the sound track in it. It's the GLASS pad with CHORD on, and you shorten DEC and SUS while hitting the pad.
- The hits do come out, but they vary a lot. Some are snappy, while others are much weaker or cut short almost straight away.
- The phone's microphone recorded the sound quietly and with background noise, so I can't hear the "other mishaps" clearly enough to name them. If you can, list them in a sentence or two (for example: clicks, wrong notes, notes hanging on, volume jumps).

## Step 1: reproduce it in the test browser (no guessing this time)
- Load the GLASS pad as in your recording: CHORD on (BLOC and STRU both), DEC and SUS short, delay and reverb on.
- Do 30 taps with real press and lift at three speeds (slow, medium, fast), with both very short and normal finger holds.
- Record the poly pad's own output, before the effects and the master. For each hit, measure the peak level and how long it takes to reach full level.
- Run it twice, with and without my two earlier quick changes (the faster fade of old chords and the quieter chords), to see whether they cause it or help.

## Step 2: fix the cause the measurements show
Likely suspects, to confirm or rule out:
- Lifting the finger may release the newest chord using the old chord's timing, cutting it short.
- A new hit may fade the old chord in a way that also hits the new chord's start.
- In STRU mode, the later notes of a chord may be cut when the pad is released or retriggered before they start.
- The envelope's sustain/decay curve may not settle the same way on each hit.

The goal: every hit sounds identical for the same settings. ATK, DEC, SUS and REL are followed exactly, nothing is cut short, and nothing gets lost when hits overlap.

## Step 3: re-measure
- Repeat the same 30-tap test and confirm every hit has the same peak and attack, within a small tolerance.
- Check that the filter envelope added earlier still works.
- Typecheck, tests and build.

## Not changed
Other instruments, effects, sequencing and layout.

## Credits
Your credits are very low. If they run out mid-way, I'll stop after Step 1 and report what I found, so the fix can follow in the next session.

## Technical details
- Playwright test: restore the IDM default kit, select slot 11 (GLASS), and drive pad pointerdown/pointerup on the pad element.
- Tap a silent `AnalyserNode` on `e.outs[10]` (pre-FX) via `window` debug access in dev only, sampling peak per 10 ms window.
- Inspect `release()` in `useGroovebox.ts` (it uses `e.mono[i]` at lift time), `rl.forEach(r => r.release(t, ...))` on retrigger, the `booked` cancel path, and `finish()`/`fadeOut()` in `voices.ts` (cancelAndHoldAtTime on a param that is still in its attack ramp).
