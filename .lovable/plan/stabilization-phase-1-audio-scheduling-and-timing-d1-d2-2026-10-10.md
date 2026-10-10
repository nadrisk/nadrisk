# Stabilization Phase 1: audio scheduling and timing (D1, D2)

Phase 1 only. When it's done I'll stop and report before starting Phase 2.

## Why notes arrive late (from the code and the audit measurements)
- **Main sequencer (D1):** the step grid is booked through the audio clock with a 30 ms safety margin, set when the audio starts (useGroovebox.ts:13). Any page task longer than about 30 ms (drawing, React updates, a busy device) lands after a note's start time, so the note plays late. The audit measured worst cases of 85 ms with 120 ms load and 252 ms with 300 ms load. ECO mode already uses 100 ms.
- **Held phrases, note repeat and chord arps (D2):** these use a separate page timer (every 20 ms) that books notes only 80 ms ahead. Page timers are the first thing browsers delay under load or in background tabs. There's also a hidden cost: notes already booked ahead can't be cancelled when you let go. Only the last voice per pad is tracked (`mono[i]`), so a longer look-ahead alone would cause notes to play after release. This is why I won't just raise the number.

## What changes
1. **Grid margin raised to 100 ms by default.** It's safe for these reasons:
   - Pad taps don't use this margin. They play at "now", so they stay immediate.
   - The playhead, pad flashes and bank switches are already drawn in step with the audio clock, so they stay aligned with what you hear.
   - Sequencer modulation is applied at each step's audio time, so its timing is unchanged.
   - ECO stays at its current 100 ms. I'll leave ECO's setting alone rather than make the two modes identical, unless testing shows it should go higher.
2. **Held-pad scheduler:**
   - It books 150 ms ahead instead of 80 ms.
   - It's driven by the audio engine's own steady clock instead of a page timer, so background tabs throttle it far less.
   - Each pad tracks **every** voice it has booked ahead, not just the last one.
3. **Clean release:** letting go of a pad (or stopping a latch or note repeat) does two things:
   - It cancels every note booked to start in the future.
   - It releases the one that's sounding now.

   So the phrase, repeat or arp stops on release with no extra notes, no stuck voices and no doubled triggers. Transport stop and set load do the same for all pads.
4. **Nothing else changes:** sounds, controls, layout, set format and MIDI stay as they are.

## How I'll check it (same scripts as the audit)
- **Note timing:** normal playback for 10 s. Then 120 ms and 300 ms main-thread load. Target: no late notes at 120 ms load. At 300 ms load, only the notes longer than the 100 ms margin may be late; I'll report the measured numbers.
- **Held phrase:** with and without load. Target: no late notes without load.
- **Release:** after letting go, count the voices that start. Target: none. I'll run this with fast tapping, note repeat MOMENT and LATCH, chord arp and held phrases.
- **Transport:** start and stop 10 times, then count voices left sounding.
- **Regression:** all automated tests, plus the step-order, STEP-mode and set save/load browser checks from the audit.
- **Not checkable here:** how it feels on a real iPad and in real background tabs. Please try those by hand.

## Risk
- The playhead may show steps a few milliseconds later than now. It stays in step with the sound.
- If cancelling notes booked ahead fails on some browser, notes could be cut short instead of overrunning. I'll test it in Chromium only.

## Technical details
- `useGroovebox.ts`: context `lookAhead` defaults to 0.1, and the ECO toggle stops overriding it downward.
- In `trigger()`, the voice handle for every scheduled `run` gets returned. The pump collects `{ at, voice }` per pad in a `booked` map.
- `stopHold`, `release`, `setRepeat`, transport stop and `applySet` call `cancelBooked(i, now)`, which:
  - calls `voice.stop(at)` for future entries, so the sources never become audible;
  - calls `stop(now)` for any voice that's still sounding;
  - prunes entries that have ended.
- The pump horizon becomes 0.15 s. It ticks from Tone's worker-based clock (`Tone.getContext().on("tick")`) instead of `setInterval(20)`, and runs only while holds exist.
- Record the new scheduling rule in AGENTS.md. Add a stabilization log section to roadmap.md covering changed files, results and open risks.
