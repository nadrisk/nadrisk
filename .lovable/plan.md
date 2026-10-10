# Pad dropouts: fix confirmed — cleanup plan

The raw-touch pad fix works on your iPhone: ~300 taps with only 1–2 misses. This plan finishes the job.

## Steps

1. **Reduce the rare remaining misses**
   - Each pad keeps at most 4 ringing voices; on very fast rolls the oldest is cut to make room. Raise the cap slightly (to 6) so dense finger-drumming almost never audibly cuts a voice, while still protecting the audio thread.
   - Keep the 5 ms scheduling offset and raw-touch handling exactly as they are — they are the confirmed fix.

2. **Remove the temporary test readout**
   - Delete the `?padtest=1` TAP/PLAY/ERR diagnostic line and its counters; it was only for this investigation.

3. **Verify**
   - Typecheck, tests, build.
   - Simulated-phone browser run: fast multi-finger taps on one pad, confirm every tap sounds and no errors.

4. **Publish** so the fix is live on nadrisk.lovable.app.

## Technical details
- Files: `src/hooks/useGroovebox.ts` (voice ring cap, padStats removal), `src/components/Groovebox.tsx` (padtest readout removal).
- No changes to audio routing, effects, sequencing, or any other UI.
