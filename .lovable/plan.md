# Fix: performance mute keys (and A–D keys) dropping taps on iPhone

## What the new recording shows
Frame by frame, keys 1, 2, 7, 8 and 11–14 toggle correctly, but keys 3 and 5 flash white for a moment and then go dark again without muting. That pattern means:
- The finger touch is seen (the key lights while pressed), but iPhone never turns the touch into a "tap", so the mute never changes.
- iPhone drops a tap when two taps land close together in time (it waits to see if it's a double-tap) or when the finger shifts a little — exactly what happens when tapping mute keys quickly.
- The white flash during the touch makes it look like the key turned on, then "turned itself off", which reads as broken.

The pads already avoid this by reading the finger touch directly; the mute and pattern keys don't yet.

## Changes
1. **Mute keys react to the finger directly.** Each key toggles the moment the finger lifts, as long as the finger didn't slide more than a few pixels (same rule the sequencer steps use). iPhone's tap delay and double-tap detection are switched off for this strip, so fast taps across several keys all count. Mouse and keyboard still work.
2. **A B C D keys get the same treatment**, so switching patterns quickly also never drops a tap.
3. **No misleading flash.** In this strip the key only shows its real state (lit = muted, same as the mixer). While a finger is down it gets a thin inner outline instead of turning white, so you can see the touch without it looking like the mute changed.
4. **Stable names for MIDI learn.** Each key keeps one fixed name ("Mute pad 3") instead of switching between "Mute" and "Unmute", so a learned MIDI button stays mapped after the first press.

Nothing else changes: same layout, same mutes as the mixer, patterns still switch on the next bar while playing.

## Verification
- Simulated iPhone touch in the test browser: 32 fast taps spread across all 16 keys (including two-finger overlaps and taps under 150 ms apart) — every tap must toggle exactly once and the mixer must match.
- Same quick test on A–D while playing.
- Typecheck and build clean. Final check on your iPhone.

## Technical details
- `src/components/PerformanceRack.tsx`: replace `onClick` on mute/bank buttons with a small shared `useTapKey` handler: `touchstart` (non-passive, `preventDefault`) records start point per `touch.identifier`; `touchend` fires the action if movement < 8 px; `touchcancel` discards. Pointer events (`pointerType !== "touch"`) handle mouse/pen on pointerup; `onKeyDown` Enter/Space for keyboard. Listeners attached once via ref on the `.gb-perf-live` container (event delegation by `data-mute` / `data-bank`), reading latest callbacks from a ref — mirrors the pad grid pattern in `Groovebox.tsx`.
- Synthetic MIDI events (`useMidi` fires pointerdown/pointerup with `pointerType: "mouse"`) keep working through the pointer path.
- aria-label fixed to `Mute pad N[ name]` / `Performance pattern X`; state stays in `aria-pressed`.
- `src/index.css`: for `.gb-perf-live button`, add `touch-action: none; -webkit-tap-highlight-color: transparent;` and override the global `button:active` invert (only `[aria-pressed="true"]` inverts); add a `.touching` inset outline.
