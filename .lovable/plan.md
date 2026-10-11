# SEQ screen: working PLAY/STOP label + new PAUSE key

## What's wrong now
- The PLAY key on the SEQ screen never redraws when the transport starts or stops. The pixel screen only repaints when the pattern bank, queued bank or page changes, so it keeps showing "PLAY" even while running. (The key itself works; only the drawing is stale.)
- STOP followed by PLAY already rewinds to step 1 in the code. Once the label updates correctly this will be visible; it will be re-checked during testing.
- There is no pause.

## What changes
1. **PLAY/STOP label fixed** — the key reads PLAY when stopped and STOP (lit) while running, on the SEQ screen, matching the MASTER screen and the top bar.
2. **STOP always rewinds** — STOP ends the pattern and the next PLAY starts from step 1 (current behaviour, kept).
3. **New PAUSE key** on the SEQ screen's second row:
   - While running: PAUSE freezes the pattern on the current step; the playhead stays where it stopped and the key lights up.
   - While paused: pressing PAUSE again continues from that exact step.
   - While paused: PLAY starts again from step 1, STOP clears the pause and rewinds.
   - Notes already queued are cancelled on pause, so nothing rings on or bursts on resume.
4. Second row is re-spaced to fit five keys: `CPY>B  RAND  CLR  PLAY  PAUSE` (same height, slightly narrower keys).

The MASTER screen and top bar keep their single PLAY/STOP key, and they all stay in sync (paused shows as PLAY there).

## Technical details
- `src/components/HwScreens.tsx` `SeqScreen`: add `playing`, `paused` to the Panel `deps`; add `paused`/`onPause` props; re-lay row 2 keys (widths about 25 px each across the 128 px screen); PAUSE key `on: paused`, aria-label "Pause" / "Resume" (MIDI-learnable).
- `src/hooks/useGroovebox.ts`: add `paused` state and `togglePause`:
  - pause: `t.pause()`, cancel booked notes per pad, clear `skip`, keep `step`, `setPlaying(false)`, `setPaused(true)`.
  - resume: `t.start("+0.05")` without resetting position or phrase cursors, `setPlaying(true)`, `setPaused(false)`.
  - `togglePlay`: from paused, PLAY does the normal rewind-and-start; STOP path also clears `paused` and rewinds (`t.stop()` already resets position).
  - Interruption recovery only resumes when it paused the transport itself (`interrupted` flag), so a user pause is never auto-resumed.
- `src/components/Groovebox.tsx`: pass `paused` and `onPause={g.togglePause}` to `SeqScreen`.
- Verify with Playwright on a phone-sized viewport: label flips PLAY/STOP, pause holds the playhead step, resume continues from it, stop then play restarts at step 1, no console errors.
