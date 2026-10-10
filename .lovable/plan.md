# Groovebox QA audit: Phase 2 report and fix plan

Audit only. I haven't changed any code, and none of the fixes below will be made until you approve them.

**Test setup:** headless Chromium on a Linux sandbox, with no speakers, no MIDI devices and no real touchscreen. Every result marked TESTED came from the running app. Results marked CODE come from reading the code only. Anything that needs ears or hardware is marked UNTESTED.

## 1. Results summary
| Area | Result |
|---|---|
| Timing, normal load (10 s playback) | TESTED, pass. 454 notes, none late |
| Timing under CPU load | TESTED, fail. See D1 |
| Held phrase timing | TESTED, partial fail. See D2 |
| Background-tab timing | UNTESTED. Headless Chromium doesn't slow background tabs the way real browsers do. Needs a real browser with the tab hidden |
| Audio suspend/resume (app) | UNTESTED at runtime. CODE: nothing watches for an interrupted audio context. See S1 |
| Grain engine | TESTED, pass. S2 from Phase 1 not reproduced |
| Sustained playback, 3 min | TESTED, pass. Memory 13 to 17 MB and flat, page elements constant at 535, no leak |
| STEP mode | TESTED, pass. 10 taps walked the phrase in order and wrapped back to the start. Rests swallow hits, see Q1 |
| RUN mode | TESTED, pass. A 1 s hold started 18 voices |
| Chord SCL fit | TESTED with maths only. Two defects, see D3 and D4 |
| Phrase loop order | TESTED, pass. Includes loop length longer than the phrase, and 0 steps |
| Set save/load | TESTED, pass. TUNE +2 saved, changed, reloaded and came back as +2 |
| Older set (new fields removed) | TESTED, pass. Loaded with TUNE 0, no errors, pads played |
| All 10 utility panels at desktop, tablet and phone | TESTED, pass. Each opens, no sideways scrolling, no errors |
| Switching instruments during playback | TESTED, pass. KICK, SNARE, 808, LEAD and CLAP tapped at all 3 sizes |
| Console | TESTED. Only the known ref warning (C1) and the router notices (C2) |
| How each instrument and effect sounds | UNTESTED. Needs listening |
| MIDI learn and MIDI pads | UNTESTED. Needs a MIDI device |
| Touch feel, iPad latency, velocity slide | UNTESTED. Needs a real device |
| Effects, drum machines, 9 themes, each control's visual | UNTESTED in this pass. Panels open fine, but individual controls weren't exercised |

## 2. Confirmed defects (prioritized)

**D1 — High — sequencer timing under load.**
- *Steps:* play, then load the main thread with 120 ms tasks.
- *Expected:* notes stay on the grid.
- *Actual:* 57 of 362 notes were late, the worst by 85 ms. With 300 ms tasks, 88 of 223 were late, the worst by 252 ms.
- *Cause:* the audio look-ahead is 30 ms (useGroovebox.ts:13). ECO mode switches it to 100 ms.
- *Fix:* raise the default look-ahead to about 80–100 ms, or adjust it automatically when lateness is detected. Keep the pads feeling immediate, since they use direct triggers, not the look-ahead.
- *Risk:* the playhead display shows steps a little later. Sequencer modulation timing needs a recheck.

**D2 — High — held phrases, note repeat and chord arps.**
- *Actual:* 3 late notes during a plain 3 s hold, worst 9 ms. With load, 33 late, worst 91 ms.
- *Cause:* a 20 ms page timer that books only 80 ms ahead (useGroovebox.ts pump/horizon).
- *Fix:* book further ahead, about 150 ms, and set the timer interval from the audio clock.
- *Risk:* letting go of a pad could cut off up to one booked-ahead note late. This needs stop logic for notes already booked.

**D3 — Medium — chords in SCL fit with pitch modulation or off-scale pitches.**
- *Actual:* an off-scale pitch builds the chord from the next scale note, then plays it from the off-scale root. In minor, +1 gives an out-of-key [0,3,6,10]. −2 reuses the root chord a tone lower. Pitches more than 3 octaves up use the wrong degree.
- *Cause:* the degree search in trigger().
- *Fix:* snap the root to the nearest scale degree, allow negative degrees, and remove the 3-octave limit.
- *Risk:* changes the sound only in these edge cases.

**D4 — Medium — SCL fit with the chromatic scale.**
- *Actual:* chords become clusters like [0,2,4,6].
- *Fix:* in chromatic, SCL falls back to the chord's own shape (same as FIX).
- *Risk:* none.

**D5 — Medium — pitch modulation on phrase pads.**
- *CODE, confirmed by reading:* in RUN mode the sequencer's pitch modulation lane is ignored (phraseStep doesn't receive it). STEP mode and plain pads do apply it.
- *Fix:* pass it through.
- *Risk:* phrases with an active pitch lane will start following that lane.

**D6 — Medium — sample storage failures are silent.**
- When device storage is full or a folder file fails to load, nothing tells you (useGroovebox.ts:402, 405). Your samples then won't come back when a set is recalled.
- *Fix:* show a notice in the MEM or sampler screen.
- *Risk:* low.

**C1 — Low:** the ref warning on page load, from the shared top-level wrappers (App.tsx). **C2 — Low:** the router future-flag notices.

## 3. Code-based suspicions (not reproduced)
- **S1 — High on iPad/iPhone:** if a phone call, another app or Siri interrupts the audio, nothing restarts it. The app has no handler for this, so playback may stay silent until reload. *Needs:* a real iOS device.
- **S3:** loading a set clears the held-pad list but leaves the background timer running until the next idle check. That's harmless, but untidy.
- **Remaining silent error handlers:** 8 others, all harmless clean-up or private-mode storage.

## 4. Design questions (your call, not bugs)
- **Q1:** in STEP mode, a rest swallows a hit, so the tap is silent. Alternative: skip rests so every hit sounds.
- **Q2:** SCL fit uses only the chord's note count. Picking MAJOR in a minor key still gives in-key minor chords. Should SCL keep the chosen type where it fits?
- **Q3:** the chord screen appears only on poly and sampler pads. This is consistent, but synth, 808 and siren pads have no chord option. Do you want one?
- **Q4:** MIDI pads switch the visible slot (still open from earlier).
- **Q5:** the phrase sequencer now has 4 pages, and the STEP/RUN mode sits on LOOP. Consider showing the mode on SEQ too.

## 5. What you need to test by hand
1. Listen to every drum machine, synth, poly, 808, siren, sampler and grain sound, and every effect.
2. Real background-tab playback (switch tabs for 30 s).
3. On iPad: touch velocity slides, note repeat and audio interruptions (lock the screen, take a call).
4. MIDI learn, MIDI pads, CC feel.
5. Visual check of all 9 themes on every instrument.

## 6. Proposed fix order (after approval)
1. D1 and D2, timing. Re-run this audit's timing script and aim for 0 late notes with 120 ms load.
2. S1, recovering after an audio interruption. Verify with a simulated suspend, then you verify on iOS.
3. D3, D4 and D5, musical fixes, with unit tests on chord building.
4. D6, storage notices.
5. C1 and C2, console clean-up.
6. Your answers to Q1–Q5.

After each step, I re-run the matching audit check before moving on.
