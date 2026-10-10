# Pad dropouts: fix confirmed — cleanup plan

The raw-touch pad fix works on your iPhone: ~300 taps with only 1–2 misses. This plan finishes the job.

## Steps

1. **Reduce the rare remaining misses**
   - Each pad keeps at most 4 ringing voices; on very fast rolls the oldest is cut to make room. Raise the cap slightly (to 6) so dense finger-drumming almost never audibly cuts a voice, while still protecting the audio thread.
   - Keep the 5 ms scheduling offset and raw-touch handling exactly as they are — they are the confirmed fix.

2. **Check fast playing with effects on pads**
   - Verify rapid taps on pads that have effect chains loaded (e.g. delay, reverb, bitcrush), since effects add per-hit work. If an effect pad drops voices under fast rolls, cap or pre-build that effect's per-hit work the same way sample buffers were pre-baked.

3. **Remove the temporary test readout**
   - Delete the `?padtest=1` TAP/PLAY/ERR diagnostic line and its counters; it was only for this investigation.

4. **Verify**
   - Typecheck, tests, build.
   - Simulated-phone browser run: fast multi-finger taps on a clean pad and on pads with effects, confirm every tap sounds and no errors.

5. **Publish** so the fix is live on nadrisk.lovable.app, then you test finger-drumming with effects on your iPhone.

## Technical details
- Files: `src/hooks/useGroovebox.ts` (voice ring cap, padStats removal), `src/components/Groovebox.tsx` (padtest readout removal), possibly `src/audio/effects.ts` if an effect shows per-hit build cost.
- No changes to audio routing, effect sound, sequencing, or any other UI.
