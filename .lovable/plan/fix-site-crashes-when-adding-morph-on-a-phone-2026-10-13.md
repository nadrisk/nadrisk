# Fix: site crashes when adding MORPH on a phone

## What I know
- No error reached the preview's error logs, so the cause isn't confirmed yet. A full page crash on iPhone often means Safari killed the tab, which usually comes from the audio side rather than a normal page error.
- Likely suspects in the morph filter:
  1. The sweep can push the filter frequency far above what the phone can play (cutoff x 8 at full depth). On iPhone Safari that can make the filter blow up.
  2. The sweep source is rebuilt and old ones are only cleaned up later, so leftover sound sources could pile up.
  3. The screen drawing for MORPH doesn't guard against odd values. If one appears it could loop or throw.

## Steps
1. Reproduce: open the preview in an iPhone-sized Safari-engine browser, add MORPH to a pad, play, and turn every knob (types, WAVE S&H, RTRG NOTE, DPTH max). Capture errors.
2. Fix what it shows, and harden all three suspects anyway:
   - Keep the swept filter frequency inside a safe range: set a sweep floor and limit how far DPTH can push the frequency up, so it never goes past what the phone can play.
   - Stop and disconnect an old sweep source right away when it is replaced. Never rebuild more than once per audio tick.
   - Clamp the type, wave and depth values used for drawing. Catch any drawing error so a bad value can't take the page down.
3. Add a page-level safety net: if an effect fails to build, skip that effect and show "FX ERROR" on its tile. The site never goes blank.
4. Re-test on the phone-sized preview, then ask you to try MORPH on your phone again.

## Technical details
- `src/audio/effects.ts` morph branch: compute frequency limits from `ctx.sampleRate`; scale `lfoAmt` so `cutoff * 2^(depth*3)` stays below `0.45 * sampleRate`; old `src` stop+disconnect immediately; dedupe `build` per `at`.
- `src/components/FxChain.tsx` morph display: clamp indices; wrap per-effect draw in try/catch.
- `createFx` caller in `useGroovebox.ts` sync: try/catch per effect so the rest of the rack still builds.
