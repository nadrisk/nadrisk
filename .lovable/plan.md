# Effects revision: correct sound first, then live visuals

Built in four stages. Each ends with a build check and browser check, then pauses for your ear test before the next stage.

## Stage 1 — Sound fixes
- **Tremolo:** remove MIX, add SHAPE (smooth sine → triangle → square-ish, continuous). RATE = speed, DEPTH = intensity. Old sets keep working (MIX dropped).
- **Dyn EQ:** today the sound is already flat when nothing triggers, but the screen draws the full GAIN bell, so it looks like a static notch. Fix: screen shows a flat 0 dB line and the live curve. Also add DIR (UP/DOWN), ATK and REL knobs, remove MIX. Controls: KEY, FREQ, Q, GAIN (amount), THRS, DIR, ATK, REL (two pages).
- **Spectral gate → "diet" spectral:** rebuild the spectral processor so it splits each frequency band into transient (fast-changing) and sustained (steady) parts by comparing each band to its own slow average. Controls:
  - THRS: which band levels survive
  - REL: per-band release; very short settings give crunchy, MP3-like swirl
  - TRNS/SUST balance: tilt toward attacks only or body only
  - CRSH: band quantising and frame holding for degraded, glitchy texture
  No filters or plain gates used as shortcuts. Effect cost stays the same.
- **Gate:** sound unchanged (already has THR/ATK/HOLD/REL/RANGE); it now reports its live level and gain reduction so the screen can show them.

## Stage 2 — Spectrum analyzer
- The SCOPE tile next to Sampler/Poly becomes a real spectrum analyzer of that pad. It reads the pad's own output, uses log spacing (about 24 bars, 30 Hz–16 kHz) with BASS/MID/HIGH marks and falling peak dots, and refreshes about 30 times a second only while visible.
- The EQ screen's SCP page stays a waveform scope.

## Stage 3 — Live effect screens (dynamics and spectral)
- **Dyn EQ:** 0 dB line, band width bracket, live curve moving up (solid) or down (dotted) with the real applied gain, settling back to flat.
- **Spectral:** per-band bars: kept = solid, removed = dotted, transient part marked separately; THRS line.
- **Gate:** scrolling level trace, a THR line you can drag up and down, closed sections drawn dotted. Driven by the real detector.
- **Drum bus:** incoming transient trace plus separate meters for TIGHT (transient change), SMASH (gain reduction) and CLIP/saturation (drive amount), so it doesn't show all of it as compression. The picture gets heavier as you push it.

## Stage 4 — Parameter-driven effect screens
All of these move at the effect's real rate and depth, timed to the audio clock:
- **Tremolo:** the actual gain shape (SHAPE/RATE/DEPTH), scrolling.
- **Vibrato:** a wave whose spacing squeezes and stretches, to show pitch movement (not volume).
- **Chorus:** three thin warbling lines (dry plus copies) weaving around each other.
- **Flanger:** a dry line plus a delayed line sliding against it; FDBK adds comb ripples.
- **Phaser:** frequency response with 3 moving notches (its real stage count) swept by RATE/DEPTH around MAN.
- **Reverb:** a cloud of dots. SIZE = spread, decay = how long dots stay, DAMP = fewer high (top) dots, MIX = density. Dots are fixed-seed, so the picture stays steady.
- **Metal:** the word METAL in pixel letters, sliced and offset by DRIVE, ringing copies by FDBK, letter spacing by NOTE, and a flash on each live trigger.

## Testing
Each effect tested in a browser at min, neutral and max settings for errors, silence, neutral pass-through and bypass. Screens checked on phone and desktop. CPU check that the analyzer and screens only run while visible. Ear tests stay with you.

## Limitations
- Spectral is inspired by Diet Audio's character, not a copy. It runs at 512-point resolution to stay playable on iPhone.
- Live screens update about 20–30 times a second, not sample-accurate.

## Technical details
- Tremolo: shape morph in the existing LFO→gain path (waveshaper on the LFO, curve cached per shape step).
- nad-dyneq: add dir/attack/release params; post the smoothed `amt*gain` through the port at ~30 Hz for the display.
- nad-specgate rewritten: per-bin fast/slow envelopes, transient = max(0, fast − slow); gain mask from THRS, balance and per-bin release; CRSH = magnitude quantisation plus random frame hold. Posts 24 log-band kept/removed values. Old `amount` maps to THRS.
- Gate and drum bus post level/GR/stage values through their worklet ports. getLevels is extended to return an optional `bands`/`state` payload.
- Analyzer: AnalyserNode (fftSize 1024) on the existing silent per-slot tap, used by getSlotWave; adds getSlotSpectrum.
- Visuals live in drawFxVisual (FxChain.tsx); the live poll extends to the new types and only runs on the EDT page.
