# Groovebox QA audit: first findings and the full audit plan

This is audit only. Nothing gets changed or fixed until you approve.

## What I actually tested so far
- **Automated tests:** 2 test files, 4 tests, all pass. They only cover the phrase loop order and one earlier helper, so almost nothing else has automated coverage.
- **Code check:** clean, with no type errors.
- **Browser play-through:** desktop size, about 12 seconds. Pressed PLAY, tapped KICK, SNARE, 808 and LEAD while it was playing, pressed STOP, cycled the theme 3 times. The app didn't crash and showed no errors from the groovebox itself. Memory stayed around 45 MB.
- **Not tested yet:** how anything sounds (my test browser has no speakers), real MIDI devices, real touchscreens, and long playback sessions.

## Confirmed issues
| # | Severity | Area | What happens | Likely cause | Fix |
|---|---|---|---|---|---|
| C1 | Low | App shell | On every page load, a "Function components cannot be given refs" warning appears twice in the console | One of the shared wrappers at the top of the app passes a ref to a plain component | Find the component and wrap it so it accepts refs. Low risk |
| C2 | Low | App shell | Two page-navigation warnings about a future library version | Two future settings not switched on | Switch them on. Low risk |
| C3 | Medium | Tests | Main flows have no automated tests: playback, sequencer timing, set save/load, STEP mode, chords | Features were added without tests | Add focused tests (see Phase 2) |

## Suspected issues (read in the code, not reproduced yet)
| # | Severity | Area | Suspicion | Why | How I'll check |
|---|---|---|---|---|---|
| S1 | High | Held phrases, note repeat, chord arps | They stutter or drift when the tab is in the background or the device is busy | The look-ahead runs on a 20 ms page timer and only books 80 ms ahead. Browsers slow page timers down in background tabs | Background the tab during a long run and measure note timing |
| S2 | Medium | Granular | Grains could stop for good after the audio is suspended or interrupted | The new 12-grain limit relies on each grain's "ended" signal arriving | Suspend and resume audio while grains play, then check the count |
| S3 | Medium | Chord SCL fit + modulation | With pitch modulation on, chords may snap to an unexpected in-key chord | Off-scale pitches are rounded up to the next scale note | Unit test plus listening |
| S4 | Medium | Chord screen on mono synth pads | Turning chords on may do nothing on synth, 808 or siren pads | Chords are only applied to poly and sampler pads | Check each pad type |
| S5 | Medium | MIDI pads | Playing pads from MIDI now changes which slot is shown | Changed on purpose earlier, but you haven't confirmed you want it | Your decision |
| S6 | Low | Sets | Sets saved before STEP mode, loops and chord fit should load with these off | Loading fills in missing values, but it hasn't been tested | Save/load round-trip test |
| S7 | Low | Error handling | 8 places silently ignore errors | "Catch and ignore" blocks | Review each one: harmless clean-up vs a hidden failure |

## Product-vision notes (not defects)
- The phrase sequencer now has four pages (SEQ, LOOP, KEY, TIM). Worth checking whether the controls are easy to find.
- The step grid, the phrase STEP mode and note repeat all advance the same phrase position. This is intended, but it needs explaining in the interface or a manual.

## Phase 2: the full audit (after you approve)
1. **Feature checklist run** in the browser at desktop, tablet and phone sizes, for every instrument (drum ×4, synth, poly, sampler, 808, siren), every effect, master pages, performance rack, mixer, sets, tape, visualizers and all nine themes. Each item gets marked pass, fail or untested, with a screenshot.
2. **Stress tests:** 5 minutes of playback while measuring memory and the number of running audio pieces, fast pad tapping, switching slots and instruments during playback, and switching themes while playing.
3. **Timing test:** log when each scheduled note is booked compared with the beat grid, in normal and background tab states (S1).
4. **New automated tests** for the sequencer step order, set save/load round-trip (S6), chord building (S3) and the grain limit (S2).
5. **Final report:** prioritized table (severity, steps to reproduce, expected vs actual, cause with code location, fix, regression risk), the full checklist, and a list of what you need to test by hand: listening quality, real MIDI devices, real iPad touch and latency.

Fixes come after the report, only for the items you pick.
