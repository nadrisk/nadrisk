# Find and fix the pad taps that go silent on iPhone

## What the new recording shows
- You tap SNARE about 5 times per second. Out of roughly 18 taps, about 3 are completely silent: no quiet hit, just nothing. The other hits all play at full level.
- The live site already has the last fix, so blocking phone gestures alone did not solve it.
- In my desktop and simulated-phone tests every tap plays, so this only happens on the iPhone itself. The recording can't show whether the phone missed the tap or the sound failed to start, so the first step is to measure that on your phone.

## Step 1: a temporary on-screen tap counter
- Add a small readout above the pads that only appears with a special link (add `?padtest=1` to the address). It shows, for the last pad hit:
  - **TAP**: touches the pad received.
  - **PLAY**: sounds actually started.
  - **LATE**: how late the sound was asked to start, in thousandths of a second.
  - **AUDIO**: whether the phone's sound engine is running.
- You open the link on your iPhone, tap one pad 40 times quickly, and send a screenshot or recording.
  - If **TAP** is less than 40, the phone isn't delivering the touch.
  - If **TAP** is 40 but sound drops out, the sound engine is the problem.

## Step 2: fix the confirmed side
- **Touches are lost:** on touch screens the pads will listen to the phone's raw touch signal directly, the way native drum apps do, instead of the general pointer signal. Each finger on a pad then counts as its own hit, even several fingers at once. The mouse and keyboard keep working as they do now.
- **Sound fails to start:** start each pad sound a tiny fixed moment ahead (about 5 thousandths of a second) instead of "right now". On iPhone, a sound scheduled for "now" can land in the past and get skipped. Also check the drum pitch and filter movements, which iPhone can reject when they land in the past.
- Whichever side it is, the result has to be 40 sounds from 40 taps on your phone.

## Step 3: clean up
- Remove the test readout once you confirm the pads hold up.

## Technical details
- Counter: `?padtest=1` flag read once. `hit()` increments TAP. `trigger()` increments PLAY when a voice is built and records `t - ctx.currentTime` plus `ctx.state`. Rendered as a small DOM line updated by ref, with no React re-renders.
- Touch input: a non-passive `touchstart`/`touchend` listener on `.gb-pads` iterates `changedTouches`, maps each to a pad via `closest('.gb-pad')` on its target, and calls `onHit`/`onRelease` per touch identifier. Pointer handlers are skipped for `pointerType === "touch"` to avoid double hits.
- Audio: pad-initiated `trigger()` uses `t0 = ctx.currentTime + 0.005` (sequencer timing is unchanged). Guard `pitchEnvelope`'s `setValueCurveAtTime` and the filter envelope so they never start before `currentTime`.
