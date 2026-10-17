# LIVE / PROD audio buffer switch

## What you get
A new key on the MASTER screen's OUT page, beside LITE, works like Ableton's buffer size setting.
- **LIVE** (the default, same as now): the smallest buffer your device allows. Pads and the MIDI keyboard respond as fast as they can. Use it for finger drumming and playing live.
- **PROD**: a much larger buffer (about 40–80 ms, depending on the device). Taps feel a little delayed, but the computer gets far more time to work out each slice of sound, so busy songs play much longer before they crackle. Use it for producing and playing back full songs.
- The key shows the mode you'd switch to, like the other mode keys (it reads PROD while in LIVE, and LIVE while in PROD).
- The latency readout next to it shows the real delay the browser reports for each mode.
- Your choice is kept on this device, so the next visit opens with the same buffer. It isn't saved inside sets.
- LITE stays a separate key. LITE cuts the amount of work; PROD gives more time to do it. You can use both.

## What happens when you switch
A browser only lets you pick its buffer size when the audio starts up. Switching therefore restarts the sound engine:
- playback stops, and any held notes and tails are cut;
- the engine rebuilds in under a second with all pads, samples, effects, patterns and master settings exactly as they were;
- press play again to carry on.
If the sampler IN page is armed, it disarms, and you tap ARM again.

## Limits to know
- Each browser decides the actual buffer size. Chrome and Edge on laptops honour it well. Safari and iPhone may change it only a little, so PROD may help less there. The readout shows what you really got.
- PROD doesn't help with distortion from a very loud mix. That's the master level, not the buffer.

## How I'll check it
- Switch LIVE → PROD → LIVE several times while playing and while stopped. Confirm no stuck notes, that sounds and patterns survive, and that the readout changes.
- Measure the busy-song setup (kick, snare, hat, break, two phrase synths, 808, reverb, delay, LOFI, compression) under simulated CPU load in both modes, and report the numbers.
- Check the key at phone width (393 px) and on desktop. Run all automatic tests.
- You'll need to try it by ear on your laptop, because real crackling can't be heard here.

## Technical details
- `useGroovebox.ts`: the audio context is created with `latencyHint` `"interactive"` (LIVE) or `"playback"` plus a numeric hint (~0.06 s) (PROD), read from localStorage `nadrisk.buffer`. New state `buffer` and `setBuffer`. Switching stops the transport, cancels booked notes, disarms live input, disposes the engine through the existing unmount cleanup, closes the old Tone context, creates and sets a new one, re-registers the worklet bundle, and calls `ensure()`. Slots, FX and performance then resync from state because the synced-FX cache is cleared. Sample buffers are re-decoded from the store or cache when they're tied to the old context.
- `latency` = `baseLatency + outputLatency` from the new context.
- `HwScreens.tsx` MasterScreen: a Tap key that shows the destination label, next to LITE in the OUT header row.
- Record in AGENTS.md: the buffer mode is chosen at context creation, and switching rebuilds the engine from state. Add a roadmap entry.
