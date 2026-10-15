# Mono release, effect visual upgrades, Da Funk fuzz, tidier sequencer

Built in this order: sound first, then screens. Each item gets a listening test, plus a check on a phone (393px) and on desktop.

## 1. One release rule for every mono synth (~1–2 credits)
- 808, ACID, REESE and any other one-note-at-a-time synth sound will behave like LASER: a new note cuts the old note's ringing tail with a short fade, so long releases never pile up.
- Glides and slides between held notes keep working.
- First I'll check which synths already do this and which don't, then make them all use the same shared rule.

## 2. Acid drive: Da Funk sound (~3–4 credits)
- The Big Muff sound goes. The Da Funk bassline is widely described as a 303-style bass sent through a heavily driven distortion with a filter sweeping across it. I'll research that and confirm the details before building.
- Planned sound: a gritty, mid-forward drive (no scooped middle) that keeps the 303's squelch and resonance up front. It squashes hard so the bass sounds compressed and "chewy", with a tone control and a drive amount that grows without getting louder.
- Older sets and sequencer moves on the drive amount still load.
- Ear test with the ACID 303 going through it, compared against the old sound.

## 3. Better effect screens: acid pedal, LOFI, reverse delay (~3–4 credits)
- Bring all three up to the detail and liveliness of the reverb, OTT and tape screens: they react to the sound, keep crisp single pixels, and stay simple.
- **acid drive:** the wave going in and the clipped wave coming out move with the real signal; the LED and knob dots follow the drive.
- **LOFI:** the cassette stays still. No more jumping up and down. Wobble shows up as reels turning unevenly and a tape line that wavers, and OXID adds dropout specks.
- **Reverse delay:** the reverse arrows spawn on real hits and fade out repeat by repeat, following TIME and FEEDBACK.

## 4. Neater, easier sequencer row controls (~2–3 credits)
- Remove the small ·/X/S key squeezed next to each row name. It clashes with the length key on phones and is hard to tap.
- New approach: a single **RND** key in the sequencer header opens a mode. While it's on, tapping a row name cycles that row through normal, excluded and solo, shown by the row name being dimmed (X), inverted (S) or normal. Tapping RND again leaves the mode, so row names go back to their usual tap action.
- No new keys on the rows, so the length key and row names keep their original sizes.
- Checked at 393px with the grid scrolled sideways.

## Technical details
- Mono release: a shared `monoCut(slotIndex, at)` path in the engine (ring[i] + mono[i] stop with ~8–12 ms fade) used by every mono engine trigger. Retest LASER behaves the same as now.
- Da Funk drive: replace the dual-stage Muff curve with a single asymmetric drive into a post-clip compressor and a mid-presence peak. Keep the `drive` key (SUST mapping) and the cached curve approach. Update the AGENTS.md acid.drive~ rule.
- Visuals read the existing silent analyser taps; animated parts go through frameGate with capped PixelScreen redraws.
- Sequencer: keep randomizer exclude/solo state as it is now; only the UI changes. Add a session-only `rowMode` flag in the sequencer screen.
- Update roadmap.md.
