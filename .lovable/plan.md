# Math fold + modulated wavetables, and a sorted library

## 1. New fold tables (4 keyframes each, sweep from gentle to extreme)
- TRI FOLD — hard triangle reflection (Serge/Buchla linear folding).
- ASYM FOLD — offset sine fold, adds even harmonics for a growlier edge.
- LOCKHART — smooth tanh-style wavefolder, warmer than SINE FOLD.
- CHEBY FOLD — Chebyshev-shaped folds that step through clean overtone jumps.

## 2. New modulated / "mathy" tables
- CURVE PWM — pulse width plus phase-warp curvature (reedy, vocal PWM).
- DIRICHLET — band-limited impulse train, pure sine into laser buzz.
- LOGISTIC — period-doubling chaos (r 2.8 to 3.9), clean into gritty but pitch-locked.
- CHIRP — exponential phase acceleration inside the cycle, tearing/flanged.
- HERMITE — Gaussian wavelet packets, round mallet into glassy strike.

All built the same way as the existing 26 (equal loudness, aligned phase), so sweeps stay smooth. Total becomes 35 plus BASIC.

## 3. Library order by wave type (simple to complex)
Each name gets a short type tag shown in the list (e.g. "PLS THIN PULSE").

```text
BASIC   BASIC WAVES
PULSE   THIN PULSE, CURVE PWM, RUBBER SQUARE
SAW     FAT SAW, MORPH SAW, WARP SAW, KNEE SLOPE
ADDITIV WARM BARS, SOFT TINE, HOLLOW REED, TWANG, ODD GLASS, BRIGHT AIR, FROST EDGE
FORMANT GLASS PEAKS, VOWEL GLIDE, AIR CHOIR
FM      METAL PUNCH, CRYSTAL BELL, GROWL
FOLD    SINE FOLD, TRI FOLD, ASYM FOLD, LOCKHART, CHEBY FOLD
MATH    ZETA TILT, CHEBYSHEV, FIBONACCI, PRIMES, FRACTAL, WALSH, DIRICHLET, HERMITE
CHAOS   CHIRP, LOGISTIC
USER    your imported tables
```
Saved sets and patches keep working: tables are found by their internal id, not by position.

## Technical details
- src/audio/wtFactory.ts: add generators (triFold, asymFold, lockhart, chebFold, curvePwm, dirichlet, logistic, chirp, hermite) via existing `shape()`/`spec()`; add a `group` field to each Def and reorder DEFS/FACTORY_REFS by group; ids unchanged.
- src/components/WavetableLibrary.tsx: show group tag prefix; update header comment count.
- Extend existing wtFactory tests: every new table has 4 finite, non-silent, equal-RMS frames; FACTORY_REFS order matches group order; all old ids still resolve.
