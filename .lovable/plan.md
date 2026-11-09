# Synced decks + mixer-side mutes and performance controls

## Goal
When one tab/device hosts the mixer and two others join as Deck A and B, both decks play locked to the same beat, and everything you touch on the mixer (mutes, pattern banks, XY/FX, tape) acts on the decks, not on the silent mixer groovebox.

## What changes for you
1. **Beat sync like CDJs**
   - The mixer is the master clock: one shared tempo and a shared "bar 1" moment.
   - Pressing PLAY/BAR on a deck starts it exactly on the next shared downbeat, on step 1.
   - While playing, each deck quietly checks its position against the master and nudges back if it drifts (no audible jumps — small corrections between steps).
   - Changing BPM on the mixer moves both decks together without losing phase.
   - A small SYNC light per channel shows LOCKED / DRIFT / OFF.
2. **Mutes at the mixer**
   - The 8 mute keys between the strips get an **A / B** switch (keeps the Mixtour 8-button layout + 1–8/9–16 paging, so mappings still work).
   - Keys show the real pad names from that deck and light from that deck's actual mute state.
   - Pattern bank keys follow the same A / B switch.
3. **Performance controls at the mixer**
   - XY pad and FX rack get a target switch: **A · BOTH · B**.
   - The effects run on the deck itself (so they're heard), the mixer just sends the moves.
   - Tape recorder on the mixer records the two decks summed after the mixer (crossfader/EQ included) when decks are on the same device; on separate devices the tape records on each deck and the mixer shows a note explaining that.
4. **Solo mode untouched** — with no link, everything works exactly as today.

## Safety ("so everything works")
- Every message carries absolute state and repeats each second (existing pattern), so a dropped message or a late-joining deck self-corrects.
- Effects and mutes snap back to neutral if the mixer disconnects (>4 s silence), so a deck is never left muted or filtered.
- Held FX buttons are never restored held.
- Existing MIDI mappings and saved sets keep working.
- Tests for: next-downbeat maths, drift correction limits, remote mute apply/release, disconnect resets, A/B/BOTH routing.
- Then a real 3-tab browser check: start A, start B on the next bar and confirm both report the same step; mute from the mixer and confirm the deck mutes; XY from the mixer audible on the deck.
- Not verifiable by me: two physical phones over the network — you'll need to try that.

## Technical details
- `src/link/useLink.ts`: mixer broadcasts `clock {bpm, epoch}` (epoch = shared bar-1 wall time, offset-corrected with a ping/pong round-trip estimate per deck). Decks convert to their Tone transport time and start with `Transport.start(at, "0:0:0")` instead of `setTimeout` + togglePlay; drift check per bar adjusts by ≤5 ms via transport position.
- New events: `ctl {deck, mutes, bank, xy, fx}` (mixer→deck, absolute) and extended `deck` status with `names, mutes, bank, step`.
- Decks apply remote controls through existing groovebox mute/bank/performance setters (no synthetic UI events); remote state tracked separately and cleared on disconnect.
- `src/components/PerfLink.tsx` / PERF overlay: A/B switch for mute/bank grid, A·BOTH·B target for XY/FX; local groovebox controls disabled in mixer role.
- Pure helpers in `src/link/deck.ts` with tests beside existing `deck.test.ts`; AGENTS.md rule updated for the clock model.
