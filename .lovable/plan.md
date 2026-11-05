# Groovebox notes: round of fixes

## 1. XY pad
- **ACID (303):** rebuild the map. X = Tight ↔ Open (decay plus env mod, with a wider range so the two ends sound clearly different). Y = Dark ↔ Bright (cutoff plus resonance rising together, so the squelch opens up as you move up). Corner labels: "DEC ENV" / "CUT RES".
- **808:** link drive and harmonics to Y, so moving up adds grit and overtones and moving down returns to a clean sub. X keeps decay and pitch envelope.
- **Live XY on held notes and chords:** moving the dot changes a note that is already ringing (SYN, all three BAS modes, poly chords, sampler filter/tone), the same way the phrase fix works. Today only SYN mono and REESE get live updates; the rest pick up the change on the next hit. Each voice gets a live-update handler, and every XY move (hand, recorded path, LFO) pushes to those handlers right away instead of waiting for the next grid tick.

## 2. 808 default
- The default 808 becomes a clean sub: harmonics 0, drive 0, a short pitch drop. Existing saved sets keep their sound.

## 3. Chord mode
- Add a **KEY / FREE** toggle on the chord page. KEY follows the master scale (as it does now). FREE keeps the chosen chord shape, so the same quality is played on every pad note. The setting is saved per pad.

## 4. Arp controls
- FIX, SCL UP, DOWN and UPDN appear only when ARP is selected. On other chord pages that space stays empty, so nothing else moves around.

## 5. SYN: clean polyphonic synth
- **Stereo spread:** each voice and each detuned oscillator gets its own pan position (spread set by a WIDTH amount, centred on mono for one voice). No more summed-to-mono combing.
- **Detune phasing:** start each oscillator at a random phase and keep the detune gentle by default, so chords shimmer instead of comb.
- **Clipping:** set each voice's gain based on how many voices are playing (equal-power), with headroom kept before the master, so 8 voices at full sustain stay clean.
- **Voices that matter:** 1 = mono with legato/glide, 2–8 = true polyphony with voice stealing (oldest note first). Playing more notes than the voice count now cuts the extras, so 2 and 8 sound clearly different on chords. Unison stacking stays a separate DETUNE control.

## 6. 909 house kit
- Add **909 KICK** (sine with a short click, pitch sweep, a touch of drive, punchy decay) and **909 SNARE** (two tuned body tones plus filtered noise with a snappy tail) to the drum presets.

## 7. HACK: make it predictable
- **Gain:** remove the automatic gain matching inside the effect. Keep a single safety limiter at the end of the FX chain, so the level does not swing.
- **Deterministic steps:** each lane (SHRT, CLK, STRV, SKIP) plays exactly the 16 values shown on screen, locked to the transport step. No hidden randomness at runtime. Randomness only happens when you press GEN, and the result is drawn on the screen.
- **SKIP:** a lit step means "repeat or skip this 1/16 slice". Its height sets the strength, so the same pattern sounds the same on every loop.
- **Link to the display:** a playhead on the HACK screen shows the active step, and the lane values can be edited by tapping steps. What you see is what plays.
- With no input or after STOP it stays silent, as it does now.

## 8. Quick start guide
- Rewrite HELP for the current lineup (DRM, PRC, SYN, BAS 808/ACID/REESE, SMP), GEN, phrase/chord/arp, XY REC/LFO, FX (DLAY, HACK, reverb), master chain, sets/patches and MIDI.
- Lay it out as short "do this, then this" steps, e.g. a first beat in 60 seconds, followed by a one-line tip for each screen.

## Technical notes
- Files: `src/audio/xyMaps.ts` (ACID/808 maps, labels), `voices.ts` and `acid.ts`/`reese.ts` (update handlers, SYN pan/phase/gain/voice cap), `useGroovebox.ts` (push to live voices on XY change, chord FREE flag in slot), `SlotScreens.tsx` (show arp controls only on ARP), `drumPresets.ts` (909), `hack.ts`/`hackWorklet.ts` (remove auto-gain, step-locked lanes from the stored pattern, playhead), `InfoOverlays.tsx` (guide).
- Tests: ACID XY ends differ by a set amount; 808 Y=0 means drive and harmonics are 0; the default 808 is clean; HACK output is identical across two loops with the same pattern; SYN never plays more than its voice count; chord FREE ignores the scale.
- Verification: typecheck, tests, and Playwright screenshots of the chord and HACK screens. Listening is up to you.
